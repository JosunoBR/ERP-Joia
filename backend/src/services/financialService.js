const financialRepo = require('../repositories/financialRepository');
const orderRepo = require('../repositories/orderRepository');
const path = require('path');
const fs = require('fs');

class FinancialService {
  /**
   * Calcula o status dinâmico com base na data de vencimento e data atual
   */
  _computeStatus(entry, todayIso) {
    if (entry.status === 'Pago' || entry.dataPagamento) {
      return 'Pago';
    }
    if (entry.status === 'Cancelado') {
      return 'Cancelado';
    }
    const due = (entry.dataVencimento || '').substring(0, 10);
    if (!due) return 'A Vencer';

    if (due === todayIso) {
      return 'Vence Hoje';
    } else if (due < todayIso) {
      return 'Em Atraso';
    } else {
      return 'A Vencer';
    }
  }

  async listEntries(filters = {}, tenantSlug) {
    const entries = await financialRepo.findAll(filters);
    const todayIso = new Date().toISOString().substring(0, 10);

    return entries.map(entry => ({
      ...entry,
      status: this._computeStatus(entry, todayIso)
    }));
  }

  async getSummary(filters = {}, tenantSlug) {
    const entries = await this.listEntries(filters, tenantSlug);
    const todayIso = new Date().toISOString().substring(0, 10);

    let totalGeral = 0;
    let totalPago = 0;
    let totalAberto = 0;
    let totalVenceHoje = 0;
    let countVenceHoje = 0;
    let totalEmAtraso = 0;
    let countEmAtraso = 0;

    const byCategory = {};
    const byStore = {};
    const byDay = {};

    entries.forEach(entry => {
      const val = Number(entry.valor) || 0;
      totalGeral += val;

      const isPaid = entry.status === 'Pago';
      if (isPaid) {
        totalPago += val;
      } else {
        totalAberto += val;
        if (entry.status === 'Vence Hoje') {
          totalVenceHoje += val;
          countVenceHoje++;
        } else if (entry.status === 'Em Atraso') {
          totalEmAtraso += val;
          countEmAtraso++;
        }
      }

      // Agrupamento por Categoria
      const cat = entry.categoria || 'OUTROS';
      if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0, pago: 0 };
      byCategory[cat].total += val;
      byCategory[cat].count += 1;
      if (isPaid) byCategory[cat].pago += val;

      // Agrupamento por Loja
      const loja = entry.lojaNome || entry.empresa || 'Matriz / Geral';
      if (!byStore[loja]) byStore[loja] = { total: 0, count: 0, pago: 0 };
      byStore[loja].total += val;
      byStore[loja].count += 1;
      if (isPaid) byStore[loja].pago += val;

      // Agrupamento por Dia (Visão Diária do Fluxo de Caixa da Planilha)
      const dueStr = (entry.dataVencimento || '').substring(0, 10);
      const diaNum = dueStr ? parseInt(dueStr.split('-')[2], 10) : 1;
      if (!byDay[diaNum]) {
        byDay[diaNum] = {
          dia: diaNum,
          dataIso: dueStr,
          total: 0,
          pago: 0,
          aPagar: 0,
          count: 0
        };
      }
      byDay[diaNum].total += val;
      byDay[diaNum].count += 1;
      if (isPaid) {
        byDay[diaNum].pago += val;
      } else {
        byDay[diaNum].aPagar += val;
      }
    });

    // Ordenar dias numericamente (1 a 31)
    const dailyList = Object.values(byDay).sort((a, b) => a.dia - b.dia);

    return {
      totalGeral,
      totalPago,
      totalAberto,
      totalVenceHoje,
      countVenceHoje,
      totalEmAtraso,
      countEmAtraso,
      totalEntries: entries.length,
      byCategory,
      byStore,
      dailyList
    };
  }

  async getEntryById(id, tenantSlug) {
    const entry = await financialRepo.findById(id);
    if (!entry) return null;
    const todayIso = new Date().toISOString().substring(0, 10);
    return {
      ...entry,
      status: this._computeStatus(entry, todayIso)
    };
  }

  /**
   * Criação ERP de Lançamento (com suporte a Parcela Única ou Parcelado em N vezes com pré-calculo)
   */
  async createEntry(data, tenantSlug) {
    const {
      descricao,
      valorTotal,
      valor, // para parcela única
      parcelasCount = 1,
      intervaloDias = 30,
      primeiroVencimento,
      dataVencimento,
      datasCustomizadas = [],
      tipo = 'despesa',
      categoria = 'OPERACIONAL',
      fornecedor = '',
      storeId = '',
      lojaNome = '',
      empresa = 'ALS',
      formaPagamento = 'BOLETO',
      bancoConta = '',
      documentoRef = '',
      observacao = '',
      recorrente = false
    } = data;

    const totalQtd = Math.max(1, parseInt(parcelasCount, 10) || 1);
    const montanteTotal = parseFloat(valorTotal || valor) || 0;

    if (!descricao || !descricao.trim()) {
      throw new Error('Descrição da conta/despesa é obrigatória.');
    }
    if (montanteTotal <= 0) {
      throw new Error('O valor do lançamento deve ser maior que zero.');
    }

    const dataBase = primeiroVencimento || dataVencimento || new Date().toISOString().substring(0, 10);

    // Se for parcela única (1x)
    if (totalQtd === 1) {
      return await financialRepo.create({
        tipo,
        descricao: descricao.trim(),
        categoria,
        fornecedor,
        storeId,
        lojaNome,
        empresa,
        formaPagamento,
        bancoConta,
        documentoRef,
        parcelaNumero: 1,
        parcelaTotal: 1,
        parcelaDesc: 'Única',
        dataVencimento: dataBase,
        valor: montanteTotal,
        status: 'A Vencer',
        observacao,
        recorrente: Boolean(recorrente)
      });
    }

    // Se for parcelado em N vezes (Padrão ERP)
    const valorParcelaBase = Math.floor((montanteTotal / totalQtd) * 100) / 100;
    const diferencaCentavos = Math.round((montanteTotal - (valorParcelaBase * totalQtd)) * 100) / 100;

    const createdEntries = [];
    const baseDateObj = new Date(dataBase + 'T12:00:00Z');

    for (let i = 1; i <= totalQtd; i++) {
      // Ajusta os centavos restantes na 1ª parcela
      const valorItem = (i === 1) ? (valorParcelaBase + diferencaCentavos) : valorParcelaBase;
      
      let dueIso = '';
      if (Array.isArray(datasCustomizadas) && datasCustomizadas[i - 1]) {
        dueIso = datasCustomizadas[i - 1];
      } else {
        const d = new Date(baseDateObj);
        d.setDate(d.getDate() + ((i - 1) * parseInt(intervaloDias, 10)));
        dueIso = d.toISOString().substring(0, 10);
      }

      const entry = await financialRepo.create({
        tipo,
        descricao: `${descricao.trim()} (${i}/${totalQtd})`,
        categoria,
        fornecedor,
        storeId,
        lojaNome,
        empresa,
        formaPagamento,
        bancoConta,
        documentoRef,
        parcelaNumero: i,
        parcelaTotal: totalQtd,
        parcelaDesc: `${i}/${totalQtd}`,
        dataVencimento: dueIso,
        valor: valorItem,
        status: 'A Vencer',
        observacao,
        recorrente: Boolean(recorrente)
      });

      createdEntries.push(entry);
    }

    return createdEntries;
  }

  async updateEntry(id, data, tenantSlug) {
    const updated = await financialRepo.update(id, data);
    if (!updated) {
      throw new Error('Lançamento não encontrado.');
    }
    const todayIso = new Date().toISOString().substring(0, 10);
    return {
      ...updated,
      status: this._computeStatus(updated, todayIso)
    };
  }

  async markAsPaid(id, paymentData = {}, tenantSlug) {
    const updated = await financialRepo.markAsPaid(id, paymentData);
    if (!updated) {
      throw new Error('Lançamento não encontrado para baixa.');
    }
    return updated;
  }

  async deleteEntry(id, tenantSlug) {
    return await financialRepo.delete(id, tenantSlug);
  }

  /**
   * Sincroniza automaticamente as parcelas de um pedido específico com o Financeiro
   */
  async syncSingleOrder(order, tenantSlug) {
    if (!order) return;
    const orderId = order.id || order.header?.id;
    if (!orderId) return;

    // Buscar lançamentos existentes para preservar status se alguma parcela já foi baixada como Paga
    const existingEntries = await financialRepo.findByOrderId(orderId, tenantSlug);
    const existingMap = new Map();
    for (const ent of (existingEntries || [])) {
      if (ent.installmentId) {
        existingMap.set(ent.installmentId, ent);
      } else if (ent.parcelaNumero) {
        existingMap.set(String(ent.parcelaNumero), ent);
      }
    }

    // Remover lançamentos antigos deste pedido para recriar sincronizado
    await financialRepo.deleteByOrderId(orderId, tenantSlug);

    const installments = (order.installments && order.installments.length > 0)
      ? order.installments
      : [];

    const fornecedor = order.header?.fornecedor || 'Fornecedor';
    const numPedido = order.header?.numeroPedido || 'S/N';
    const formaPgto = order.header?.formaPagamento || 'BOLETO';
    const condicao = order.header?.condicaoPagamento || '';

    for (const inst of installments) {
      const existing = existingMap.get(inst.id) || existingMap.get(String(inst.numeroParcela));
      const isPaid = inst.status === 'Pago' || existing?.status === 'Pago';
      const dataPagamento = inst.dataPagamento || existing?.dataPagamento || null;
      const valorPago = isPaid ? (inst.valorPago || existing?.valorPago || inst.valor) : 0;

      await financialRepo.create({
        tipo: 'pedido_parcela',
        orderId: orderId,
        installmentId: inst.id || null,
        descricao: `${fornecedor} - Pedido ${numPedido} (${inst.numeroParcela || 1}/${inst.totalParcelas || installments.length})`,
        categoria: 'PRODUTOS',
        fornecedor: fornecedor,
        storeId: 'matriz',
        lojaNome: 'Depósito Central / Matriz',
        empresa: 'ALS',
        formaPagamento: (inst.metodoPagamento || formaPgto).toUpperCase(),
        bancoConta: '',
        documentoRef: inst.documentoRef || numPedido,
        parcelaNumero: inst.numeroParcela || 1,
        parcelaTotal: inst.totalParcelas || installments.length,
        parcelaDesc: `${inst.numeroParcela || 1}/${inst.totalParcelas || installments.length}`,
        dataVencimento: inst.dataVencimento || new Date().toISOString().substring(0, 10),
        valor: Number(inst.valor) || 0,
        status: isPaid ? 'Pago' : 'A Vencer',
        dataPagamento: dataPagamento,
        valorPago: valorPago,
        observacao: inst.observacao || existing?.observacao || `Condição: ${condicao}`
      }, tenantSlug);
    }
  }

  /**
   * Sincroniza parcelas dos pedidos de compra existentes no banco com o Financeiro
   */
  async syncOrdersToFinancial(tenantSlug) {
    const orders = await orderRepo.findAll();
    let createdCount = 0;

    for (const ord of orders) {
      if (!ord || !ord.id) continue;

      // Verificar se já foram sincronizadas
      const existingFin = await financialRepo.findByOrderId(ord.id);
      if (existingFin && existingFin.length > 0) {
        continue;
      }

      const fornecedor = ord.header?.fornecedor || 'Fornecedor';
      const numPedido = ord.header?.numeroPedido || 'S/N';
      const formaPgto = ord.header?.formaPagamento || 'BOLETO';
      const condicao = ord.header?.condicaoPagamento || '';
      
      const installments = (ord.installments && ord.installments.length > 0)
        ? ord.installments
        : [];

      if (installments.length > 0) {
        for (const inst of installments) {
          await financialRepo.create({
            tipo: 'pedido_parcela',
            orderId: ord.id,
            installmentId: inst.id,
            descricao: `${fornecedor} - Pedido ${numPedido} (${inst.numeroParcela}/${inst.totalParcelas})`,
            categoria: 'PRODUTOS',
            fornecedor: fornecedor,
            storeId: 'matriz',
            lojaNome: 'Depósito Central / Matriz',
            empresa: 'ALS',
            formaPagamento: (inst.metodoPagamento || formaPgto).toUpperCase(),
            bancoConta: '',
            documentoRef: inst.documentoRef || numPedido,
            parcelaNumero: inst.numeroParcela,
            parcelaTotal: inst.totalParcelas,
            parcelaDesc: `${inst.numeroParcela}/${inst.totalParcelas}`,
            dataVencimento: inst.dataVencimento,
            valor: inst.valor,
            status: inst.status === 'Pago' ? 'Pago' : 'A Vencer',
            dataPagamento: inst.dataPagamento || null,
            valorPago: inst.status === 'Pago' ? inst.valor : 0,
            observacao: inst.observacao || `Condição: ${condicao}`
          });
          createdCount++;
        }
      }
    }

    return { createdCount, message: `${createdCount} parcelas de pedidos sincronizadas para o financeiro.` };
  }

  /**
   * Importa a planilha real do cliente (PLANILHA DE PAGAMENTO AGOSTO.xlsx)
   */
  async importClientSpreadsheet(customFilePath = null, tenantSlug) {
    const xlsx = require('xlsx');
    const defaultPath = path.resolve(__dirname, '../../../PLANILHA DE PAGAMENTO AGOSTO.xlsx');
    const filePath = customFilePath || defaultPath;

    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo da planilha não encontrado em: ${filePath}`);
    }

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0] || 'AGOSTO';
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    let importedCount = 0;
    let totalValor = 0;

    // Detectar ano e mês (se o nome da aba for AGOSTO, usamos ano 2026 e mês 08)
    const monthYear = '2026-08';

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const diaRaw = row[0];
      const valorRaw = row[1];
      const descRaw = row[3];
      const formaRaw = row[4];
      const classifRaw = row[5];
      const lojaRaw = row[6];
      const nfRaw = row[7];
      const parcelaRaw = row[8];
      const obsRaw = row[9];

      if (!descRaw && (!valorRaw || typeof valorRaw !== 'number')) {
        continue;
      }

      const val = typeof valorRaw === 'number' ? valorRaw : parseFloat(String(valorRaw).replace(',', '.')) || 0;
      if (val <= 0) continue;

      const diaNum = parseInt(diaRaw, 10) || 1;
      const formattedDay = String(Math.min(31, Math.max(1, diaNum))).padStart(2, '0');
      const dataVencimento = `${monthYear}-${formattedDay}`;

      // Normalizar classificação
      let cat = String(classifRaw || '').trim().toUpperCase();
      if (cat === 'PROUTOS' || cat === 'PRODUTOIS') cat = 'PRODUTOS';
      if (!cat) cat = 'OPERACIONAL';

      // Normalizar forma de pagamento
      let forma = String(formaRaw || '').trim().toUpperCase();
      if (!forma) forma = 'BOLETO';
      if (forma === 'DEPOSITO') forma = 'DEPÓSITO';

      // Normalizar parcela
      let parcelaNum = 1;
      let parcelaTot = 1;
      const parcStr = String(parcelaRaw || '').trim();
      if (parcStr && parcStr.includes('/')) {
        const parts = parcStr.split('/');
        parcelaNum = parseInt(parts[0], 10) || 1;
        parcelaTot = parseInt(parts[1], 10) || 1;
      }

      const descricao = String(descRaw || '').trim() || `Pagamento ${cat}`;
      const loja = String(lojaRaw || '').trim() || 'ALS';

      await financialRepo.create({
        tipo: cat === 'PRODUTOS' ? 'pedido_parcela' : 'despesa',
        descricao: descricao,
        categoria: cat,
        fornecedor: cat === 'PRODUTOS' ? descricao : '',
        storeId: loja.toLowerCase(),
        lojaNome: loja,
        empresa: loja === 'CONECTA' ? 'CONECTA' : 'ALS',
        formaPagamento: forma,
        bancoConta: '',
        documentoRef: String(nfRaw || ''),
        parcelaNumero: parcelaNum,
        parcelaTotal: parcelaTot,
        parcelaDesc: parcStr || 'Única',
        dataVencimento: dataVencimento,
        valor: val,
        status: 'A Vencer',
        observacao: String(obsRaw || '')
      });

      importedCount++;
      totalValor += val;
    }

    return {
      importedCount,
      totalValor,
      message: `${importedCount} lançamentos importados com sucesso da planilha (Total: R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`
    };
  }
}

module.exports = new FinancialService();
