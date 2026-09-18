import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PurchaseOrder, StoreConfig } from '../shared/types';
import { DEFAULT_STORES } from '../shared/constants';
import { LOGO_MEGA12_BASE64 } from '../assets/logoBase64';
import { QUICK_PAYMENT_PRESETS, formatPaymentConditionString } from './installments';

function formatCurrency(val: number | string): string {
  const num = Number(val) || 0;
  return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Higieniza e formata a condição de pagamento para exibição na proposta comercial,
 * removendo qualquer texto redundante de periodicidade "( x em x dias)" ou "- de x em x dias",
 * e removendo valores monetários "(R$ ...)" ou "R$ ..." para manter a proposta 100% limpa.
 */
export function formatPaymentConditionDisplay(cond?: string | number, parcelas?: number): string {
  if (!cond || !String(cond).trim()) return 'A Combinar';

  let text = String(cond).trim();

  // Tratamento de IDs de presets (ex: "preset:30_90", "30_90", "30_60_90")
  if (text.startsWith('preset:')) {
    text = text.replace(/^preset:/, '');
  }
  if (text === '30_90' || text === '30/90' || text.toLowerCase() === '30/90 dias') {
    return (parcelas === 3) ? '30/60/90 Dias' : '30/90 Dias';
  }
  if (text === '30_60_90' || text === '30/60/90' || text.toLowerCase() === '30/60/90 dias') {
    return '30/60/90 Dias';
  }

  const matchedPreset = QUICK_PAYMENT_PRESETS.find(p => p.id === text);
  if (matchedPreset) {
    return matchedPreset.conditionString;
  }

  // Se for um número puro representando intervalo em dias
  const numInterval = parseInt(text, 10);
  if (!isNaN(numInterval) && numInterval > 0 && String(numInterval) === text) {
    if (!parcelas || parcelas <= 1) {
      return `${numInterval} Dias`;
    }
    const days: number[] = [];
    for (let i = 1; i <= parcelas; i++) {
      days.push(i * numInterval);
    }
    return `${days.join('/')} Dias`;
  }

  // 1. Caso legado '3x (30/60/90 Dias - de 30 em 30 dias)', extrair '30/60/90 Dias'
  text = text.replace(/(\d+x)\s*\(\s*([^)]+?)\s*[-–—]\s*(?:de\s+)?\d+\s+em\s+\d+\s+dias?\s*\)/gi, '$2');

  // 2. Remove valores monetários anexados à forma/condição (ex: "(R$ 5.000,00)", "R$ 5.000,00")
  text = text.replace(/\s*\(\s*R\$\s*[\d.,]+\s*\)/gi, '');
  text = text.replace(/\s+R\$\s*[\d.,]+/gi, '');

  // 3. Remove menções a "(de X em X dias)", "(X em X dias)", "- de X em X dias", etc.
  text = text.replace(/\s*[-–—]?\s*\(\s*(?:de\s+)?\d+\s+em\s+\d+\s+dias?\s*\)/gi, '');
  text = text.replace(/\s*[-–—]\s*(?:de\s+)?\d+\s+em\s+\d+\s+dias?\b/gi, '');
  text = text.replace(/\s*\b(?:de\s+)?\d+\s+em\s+\d+\s+dias?\b/gi, '');

  // 4. Limpa parênteses vazios residuais como "()" ou "( )" ou "- ()"
  text = text.replace(/\s*[-–—]?\s*\(\s*\)/g, '');

  // 5. Remove qualquer resquício de R$ isolado
  text = text.replace(/R\$\s*[\d.,]+/gi, '');

  // 6. Limpa parênteses não balanceados residuais
  if (text.includes('(') && !text.includes(')')) {
    text = text.replace(/\(/g, '');
  }
  if (text.includes(')') && !text.includes('(')) {
    text = text.replace(/\)/g, '');
  }

  // 7. Normaliza espaços múltiplos e operadores de soma
  text = text.replace(/\s*[-–—]\s*(\+|$)/g, '$1').trim();
  text = text.replace(/\s*\+\s*/g, ' + ').trim();
  text = text.replace(/\s+/g, ' ').trim();

  return text || 'A Combinar';
}

export interface ResolvedPaymentInfo {
  condicaoPagamento: string;
  formaPagamento: string;
}

/**
 * Resolve e valida com precisão a condição e forma de pagamento do pedido para exibição em relatórios/PDFs.
 * Garante que se o pedido possui negociação combinada (Depósito + Boleto), as 1ª e 2ª condições
 * sejam fielmente representadas, inclusive recuperando-se de sequências anômalas ou corrompidas.
 */
export function resolveOrderPaymentCondition(order: PurchaseOrder): ResolvedPaymentInfo {
  const header = order.header || ({} as any);

  // 1. Identifica se é pagamento combinado
  const isCombined =
    header.prazoDias === 'deposito_e_boleto' ||
    header.prazoDias === 'entrada_com_parcelamento' ||
    header.formaPagamento === 'Boleto / Depósito' ||
    header.formaPagamento === 'Boleto / Cheque' ||
    (header.depositoParcelasCount !== undefined && header.saldoParcelasCount !== undefined && (header.depositoParcelasCount > 0 || header.saldoParcelasCount > 0)) ||
    (Array.isArray(order.installments) &&
      order.installments.some(i => !i.isBoletoFrete && (i.metodoPagamento === 'Depósito' || i.isEntrada)) &&
      order.installments.some(i => !i.isBoletoFrete && (i.metodoPagamento === 'Boleto' || !i.isEntrada)));

  if (isCombined) {
    const dForma = header.depositoFormaPagamento || 'Depósito';
    const sForma = header.saldoFormaPagamento || 'Boleto';
    const formaPagamento = `${sForma} / ${dForma}`;

    const rawCond = header.condicaoPagamento || '';
    // Se a string já estiver consistente (possui "+" e não possui repetição anômala de intervalos como 10/20/.../140)
    if (rawCond && rawCond.includes('+') && !rawCond.includes('10/20/30/40/50/60/70/80/90/100')) {
      return {
        condicaoPagamento: formatPaymentConditionDisplay(rawCond),
        formaPagamento
      };
    }

    // Se estiver corrompida, vazia ou sem o "+", reconstrói fielmente a partir dos parâmetros do pedido
    const dParc = header.depositoParcelasCount || 1;
    const dPrazo = header.depositoPrazoDias || 'vista';
    const sParc = header.saldoParcelasCount || (header.parcelasCount ? Math.max(1, header.parcelasCount - dParc) : 2);
    const sPrazo = header.saldoPrazoDias || '30';

    const cleanCond = formatPaymentConditionString(
      dParc + sParc,
      'deposito_e_boleto',
      header.valorEntradaAVista,
      sParc,
      sPrazo,
      dParc,
      dPrazo,
      dForma,
      sForma
    );

    return {
      condicaoPagamento: formatPaymentConditionDisplay(cleanCond),
      formaPagamento
    };
  }

  // Pagamento não combinado (padrão)
  return {
    condicaoPagamento: formatPaymentConditionDisplay(header.condicaoPagamento || header.prazoDias, header.parcelasCount),
    formaPagamento: cleanPaymentFormDisplay(header.formaPagamento) || 'Boleto Bancário'
  };
}

/**
 * Higieniza a forma de pagamento para a proposta comercial, removendo valores e periodicidades.
 */
export function cleanPaymentFormDisplay(forma?: string): string {
  if (!forma || !String(forma).trim()) return 'Boleto Bancário';

  let text = String(forma).trim();

  // 1. Caso legado '3x (...)'
  text = text.replace(/(\d+x)\s*\(\s*([^)]+?)\s*[-–—]\s*(?:de\s+)?\d+\s+em\s+\d+\s+dias?\s*\)/gi, '$2');

  // 2. Remove valores monetários anexados à forma (ex: "(R$ 5.000,00)", "R$ 5.000,00")
  text = text.replace(/\s*\(\s*R\$\s*[\d.,]+\s*\)/gi, '');
  text = text.replace(/\s+R\$\s*[\d.,]+/gi, '');

  // 3. Remove menções a "(de X em X dias)", "(X em X dias)", "- de X em X dias", etc.
  text = text.replace(/\s*[-–—]?\s*\(\s*(?:de\s+)?\d+\s+em\s+\d+\s+dias?\s*\)/gi, '');
  text = text.replace(/\s*[-–—]\s*(?:de\s+)?\d+\s+em\s+\d+\s+dias?\b/gi, '');
  text = text.replace(/\s*\b(?:de\s+)?\d+\s+em\s+\d+\s+dias?\b/gi, '');

  // 4. Limpa parênteses vazios residuais como "()" ou "( )" ou "- ()"
  text = text.replace(/\s*[-–—]?\s*\(\s*\)/g, '');

  // 5. Remove qualquer resquício de R$ isolado
  text = text.replace(/R\$\s*[\d.,]+/gi, '');

  // 6. Limpa parênteses não balanceados residuais
  if (text.includes('(') && !text.includes(')')) {
    text = text.replace(/\(/g, '');
  }
  if (text.includes(')') && !text.includes('(')) {
    text = text.replace(/\)/g, '');
  }

  // 7. Normaliza espaços múltiplos e operadores de soma
  text = text.replace(/\s*[-–—]\s*(\+|$)/g, '$1').trim();
  text = text.replace(/\s*\+\s*/g, ' + ').trim();
  text = text.replace(/\s+/g, ' ').trim();

  return text || 'Boleto Bancário';
}

function getAvariaUnits(quantidade: number, unidadeMedida?: string, qtdPorPacote: number = 1): number {
  const qtd = Number(quantidade) || 0;
  const um = (unidadeMedida || 'UN').toUpperCase();
  if (um === 'PACOTES' || um === 'CX' || um === 'CAIXA' || um === 'PCT') {
    return qtd * (Number(qtdPorPacote) || 1);
  }
  return qtd;
}

// =========================================================================
// 1. EXPORTAÇÃO DO PEDIDO DE COMPRA COMERCIAL (PROPOSTA PARA FORNECEDOR)
// Formato: A4 Paisagem (Landscape) | Layout Oficial (Imagem 2)
// =========================================================================
export function exportCommercialOrderPDF(rawOrder: PurchaseOrder) {
  const order: PurchaseOrder = {
    ...rawOrder,
    items: (rawOrder.items || []).filter(it => Boolean(it.descricao?.trim() || it.codigo?.trim() || it.codigoInterno?.trim() || it.codigoFornecedor?.trim() || it.qtdTotalUnidades > 0 || it.precoUnitario > 0))
  };

  const numeroPedido = (order.header?.numeroPedido || 'PED-0001').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanFornecedor = (order.header?.fornecedor || 'Fornecedor').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Pedido_${numeroPedido}_${cleanFornecedor}.pdf`;

  // Geração Local Direta via jsPDF em Paisagem (Layout Oficial Jóia ERP)
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const rawNum = order.header?.numeroPedido || 'PED-0001';
    const numeroPedido = String(rawNum).replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanFornecedor = (order.header?.fornecedor || 'Fornecedor').replace(/[^a-zA-Z0-9_-]/g, '_');
    const status = order.header?.status || 'Aprovado';
    const dataEmissao = order.header?.dataEmissao || new Date().toLocaleDateString('pt-BR');
    const dataEntrega = order.header?.dataEntregaPrevista || 'A Combinar';
    const fornecedorNome = (order.header?.fornecedor || 'FORNECEDOR NÃO INFORMADO').toUpperCase();
    const vendedor = order.header?.vendedor || 'N/A';
    const contatoVendedor = order.header?.contatoVendedor || 'S/ Contato';
    const { condicaoPagamento, formaPagamento } = resolveOrderPaymentCondition(order);
    const tipoFrete = order.header?.tipoFrete || 'CIF (Por conta do Fornecedor)';
    const observacoes = order.header?.observacoes || order.header?.observacoesDescarga || '';

    // =========================================================================
    // 1. CABEÇALHO SUPERIOR (Logo Oficial + Título + Badge do Pedido)
    // =========================================================================
    if (LOGO_MEGA12_BASE64) {
      try {
        doc.addImage(LOGO_MEGA12_BASE64, 'PNG', 10, 6, 20, 20);
      } catch (err) {
        console.warn('Erro ao inserir logo no PDF comercial local:', err);
      }
    }

    // Título e Identidade da Loja
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('PEDIDO DE COMPRA COMERCIAL', 33, 12);

    doc.setTextColor(5, 150, 105); // Emerald-600
    doc.setFontSize(8);
    doc.text('EMPRESA COMPRADORA  •  AUTORIZAÇÃO OFICIAL DE FORNECIMENTO', 33, 18.5);

    // Badge do Pedido (Canto Superior Direito)
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(205, 5.5, 82, 20, 1.5, 1.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`PEDIDO Nº ${numeroPedido}`, 209, 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Emissão: ${dataEmissao}  |  Status: ${status}`, 209, 16);

    doc.setTextColor(253, 224, 71); // Yellow-300
    doc.setFont('helvetica', 'bold');
    doc.text(`Previsão de Entrega: ${dataEntrega}`, 209, 21);

    // =========================================================================
    // 2. BANNER DE ALERTA OBRIGATÓRIO (Âmbar/Amarelo Oficial ALS 10)
    // =========================================================================
    doc.setFillColor(254, 243, 199); // Amber-100
    doc.setDrawColor(245, 158, 11); // Amber-500
    doc.setLineWidth(0.3);
    doc.roundedRect(10, 27, 277, 6.5, 1, 1, 'FD');

    doc.setTextColor(146, 64, 14); // Amber-800
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('! ATENÇÃO OBRIGATÓRIA: AGENDAR ENTREGA COM ROBERTA: (42) 9 9136-5009  |  DESCARREGAMENTO POR CONTA DO FORNECEDOR', 14, 31.5);

    // =========================================================================
    // 3. CARDS DE DADOS: COMPRADOR & FORNECEDOR (Lado a Lado)
    // =========================================================================
    const cardY = 35.5;
    const cardW = 136;
    const card2X = 151;
    const maxCardTextW = cardW - 6; // 130 mm (3mm margem esquerda + 3mm margem direita)
    const baseCardH = 28.5;

    // Cálculo do Desconto Comercial
    const offValue = Number(order.header?.percentualDescontoOff || 0);
    let totalBrutoMercadorias = 0;
    let totalDescontoItens = 0;
    (order.items || []).forEach(item => {
      const pack = Number(item.qtdNoPacote) || Number(item.qtdPorPacote) || 1;
      const pacotes = Number(item.qtdPacotes) || 0;
      const pecas = Number(item.qtdTotalUnidades) || (pacotes * pack);
      const precoUnit = Number(item.precoUnitario) || 0;
      const valorBruto = Number(item.valorTotalBruto) || (pecas * precoUnit);
      const valorLiquido = Number(item.valorTotalLiquido) || valorBruto;
      totalBrutoMercadorias += valorBruto;
      if (item.valorDescontoItem !== undefined && Number(item.valorDescontoItem) > 0) {
        totalDescontoItens += Number(item.valorDescontoItem);
      } else if (valorBruto > valorLiquido) {
        totalDescontoItens += (valorBruto - valorLiquido);
      }
    });

    let totalDescontoComercial = 0;
    let descontoComercialPercent = 0;
    if (order.header?.descontoComercialTotal !== undefined && Number(order.header.descontoComercialTotal) > 0) {
      if (order.header.descontoComercialTipo === '%') {
        descontoComercialPercent = Number(order.header.descontoComercialTotal);
        totalDescontoComercial = Number(((totalBrutoMercadorias * descontoComercialPercent) / 100).toFixed(2));
      } else {
        totalDescontoComercial = Number(order.header.descontoComercialTotal);
        descontoComercialPercent = totalBrutoMercadorias > 0 
          ? (totalDescontoComercial / totalBrutoMercadorias) * 100 
          : 0;
      }
    } else if (totalDescontoItens > 0 && totalBrutoMercadorias > 0) {
      totalDescontoComercial = totalDescontoItens;
      descontoComercialPercent = (totalDescontoItens / totalBrutoMercadorias) * 100;
    } else if (offValue > 0) {
      descontoComercialPercent = offValue;
      totalDescontoComercial = Number(((totalBrutoMercadorias * offValue) / 100).toFixed(2));
    }

    const descontoComercialTexto = `${Number(descontoComercialPercent.toFixed(2)).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;

    // Medir e quebrar linhas do Card 2 com quebra automática caso qualquer campo seja longo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);

    const offPercent = order.header?.percentualNota !== undefined ? order.header.percentualNota : 100;

    const card2Fields = [
      `Fornecedor: ${fornecedorNome}`,
      `Vendedor: ${vendedor}  |  Contato: ${contatoVendedor}`,
      `OFF %: ${offPercent}%`,
      `Desconto Comercial: ${descontoComercialTexto}`,
      `Condição de Pagto: ${condicaoPagamento}`,
      `Forma de Pagto: ${formaPagamento}`,
      `Tipo de Frete: ${tipoFrete}`
    ];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const card2Lines: { text: string; isObs?: boolean }[] = [];
    card2Fields.forEach(field => {
      const split = doc.splitTextToSize(field, maxCardTextW);
      if (Array.isArray(split)) {
        split.forEach((s: string, idx: number) => {
          card2Lines.push({ text: idx > 0 ? `  ${s.trim()}` : s.trim(), isObs: false });
        });
      } else if (split) {
        card2Lines.push({ text: split, isObs: false });
      }
    });

    if (observacoes && observacoes.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const obsFullText = `Obs. do Pedido: ${observacoes.trim()}`;
      const splitObs = doc.splitTextToSize(obsFullText, maxCardTextW);
      if (Array.isArray(splitObs)) {
        splitObs.forEach((s: string, idx: number) => {
          card2Lines.push({ text: idx > 0 ? `  ${s.trim()}` : s.trim(), isObs: true });
        });
      } else if (splitObs) {
        card2Lines.push({ text: splitObs, isObs: true });
      }
    }

    // Altura calculada e posicionamento dinâmico
    let currentLineY = cardY + 7.8;
    const card2RenderList: { text: string; isObs: boolean; y: number }[] = [];
    card2Lines.forEach((item, idx) => {
      const step = item.isObs ? 3.8 : 3.05;
      if (item.isObs && idx > 0 && !card2Lines[idx - 1].isObs) {
        currentLineY += 0.8;
      }
      card2RenderList.push({ text: item.text, isObs: Boolean(item.isObs), y: currentLineY });
      currentLineY += step;
    });

    const neededCard2H = currentLineY - cardY + 1.8;
    const cardH = Math.max(baseCardH, neededCard2H);

    // Card 1: Comprador / Faturamento (Esquerda)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(10, cardY, cardW, cardH, 1.5, 1.5, 'FD');

    doc.setFillColor(241, 245, 249);
    doc.rect(10.2, cardY + 0.2, cardW - 0.4, 5, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('DADOS DA EMPRESA COMPRADORA & FATURAMENTO:', 13, cardY + 3.8);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Razão Social: EMPRESA COMPRADORA', 13, cardY + 7.8);
    doc.text('CNPJ: 37.144.240/0001-70       IE: 90847822-35', 13, cardY + 11.3);
    doc.text('End. Entrega: Av. José Galiciolli, 152 – BR153 – Centro – Irati – PR (CEP: 84500-009)', 13, cardY + 14.8);
    doc.text('E-mail para Boletos e XML: als.conecta@gmail.com', 13, cardY + 18.3);
    doc.text('Compras: (55) 9 9659-6315 (Rafael)  |  Faturamento: (55) 9 99691-0247 (Ketlyn)', 13, cardY + 21.8);
    doc.text('Financeiro: (55) 9 3618-5609 (Bruna)', 13, cardY + 25.3);

    // Card 2: Fornecedor & Comercial (Direita)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(card2X, cardY, cardW, cardH, 1.5, 1.5, 'FD');

    doc.setFillColor(241, 245, 249);
    doc.rect(card2X + 0.2, cardY + 0.2, cardW - 0.4, 5, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('DADOS DO FORNECEDOR & CONDIÇÕES COMERCIAIS:', card2X + 3, cardY + 3.8);

    card2RenderList.forEach(item => {
      if (item.isObs) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(item.text, card2X + 3, item.y);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(item.text, card2X + 3, item.y);
      }
    });


    // =========================================================================
    // 4. TABELA DE ITENS (SEM Código Interno e SEM Desconto)
    // =========================================================================
    const headCols = [
      '#',
      'Ref. Fornecedor',
      'Descrição do Produto',
      'Qtd/Cx',
      'Qtd Cx',
      'Total Peças',
      'Preço Unit.',
      'IPI',
      'Valor Total'
    ];

    let totalVolumesGeral = 0;
    let totalPecasGeral = 0;
    let subtotalGeral = 0;
    let totalIpiGeral = 0;
    let somaPrecoUnitario = 0;

    const filteredItems = (order.items || []).filter(it =>
      Boolean(it.descricao?.trim() || it.codigo?.trim() || it.codigoFornecedor?.trim() || it.qtdTotalUnidades > 0 || it.precoUnitario > 0)
    );

    const bodyRows = filteredItems.map((item, idx) => {
      const refFornec = item.codigoFornecedor || (item as any).referencia || item.codigo || '-';
      const pack = Number(item.qtdNoPacote) || Number(item.qtdPorPacote) || 1;
      const pacotes = Number(item.qtdPacotes) || 0;
      const pecas = Number(item.qtdTotalUnidades) || (pacotes * pack);
      const precoUnit = Number(item.precoUnitario) || 0;
      const valorBruto = Number(item.valorTotalBruto) || (pecas * precoUnit);
      const valorTotal = valorBruto;

      // Determinação da alíquota e do valor de IPI do item
      const ipiAliq = item.aliquotaIpi !== undefined && item.aliquotaIpi !== null
        ? Number(item.aliquotaIpi)
        : (item.fiscalOverride?.ipiAliquota !== undefined && item.fiscalOverride?.ipiAliquota !== null
            ? Number(item.fiscalOverride.ipiAliquota)
            : (order.header?.aliquotaIpi !== undefined && order.header?.aliquotaIpi !== null
                ? Number(order.header.aliquotaIpi)
                : (order.fiscalConfig?.ipiAliquota !== undefined && order.fiscalConfig?.ipiAliquota !== null
                    ? Number(order.fiscalConfig.ipiAliquota)
                    : 0)));

      const valorIpi = item.valorIpi !== undefined && item.valorIpi !== null && Number(item.valorIpi) > 0
        ? Number(item.valorIpi)
        : (item.ipiUnitario !== undefined && item.ipiUnitario !== null && Number(item.ipiUnitario) > 0
            ? Number(item.ipiUnitario) * pecas
            : (valorTotal * (ipiAliq / 100)));

      totalVolumesGeral += pacotes;
      totalPecasGeral += pecas;
      subtotalGeral += valorTotal;
      totalIpiGeral += valorIpi;
      somaPrecoUnitario += precoUnit;

      const ipiDisplay = valorIpi > 0
        ? (ipiAliq > 0 ? `${formatCurrency(valorIpi)} (${ipiAliq}%)` : formatCurrency(valorIpi))
        : (ipiAliq > 0 ? `${ipiAliq}%` : 'R$ 0,00');

      return [
        String(idx + 1),
        refFornec,
        item.descricao || 'Produto sem descrição',
        String(pack),
        pacotes.toLocaleString('pt-BR'),
        pecas.toLocaleString('pt-BR') + ' un',
        formatCurrency(precoUnit),
        ipiDisplay,
        formatCurrency(valorTotal)
      ];
    });

    const precoMedioGeral = totalPecasGeral > 0
      ? (subtotalGeral / totalPecasGeral)
      : (bodyRows.length > 0 ? (somaPrecoUnitario / bodyRows.length) : 0);

    // Linha de Totais da Tabela (com colSpan elegante para 9 colunas)
    const footerRow = [
      {
        content: `TOTAIS DO PEDIDO (${bodyRows.length} itens)`,
        colSpan: 4,
        styles: { halign: 'left', fontStyle: 'bold' }
      },
      {
        content: totalVolumesGeral.toLocaleString('pt-BR') + ' cx',
        styles: { halign: 'center', fontStyle: 'bold' }
      },
      {
        content: totalPecasGeral.toLocaleString('pt-BR') + ' un',
        styles: { halign: 'center', fontStyle: 'bold' }
      },
      {
        content: formatCurrency(precoMedioGeral),
        styles: { halign: 'right', fontStyle: 'bold' }
      },
      {
        content: formatCurrency(totalIpiGeral),
        styles: { halign: 'right', fontStyle: 'bold' }
      },
      {
        content: formatCurrency(subtotalGeral),
        styles: { halign: 'right', fontStyle: 'bold' }
      }
    ];

    autoTable(doc, {
      startY: cardY + cardH + 2.5,
      head: [headCols],
      body: [...bodyRows, footerRow],
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 1.2,
        halign: 'center',
        valign: 'middle',
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.2,
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 28, halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] },
        2: { cellWidth: 110, halign: 'left', fontStyle: 'bold' },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
        5: { cellWidth: 22, halign: 'center', fontStyle: 'bold', textColor: [5, 150, 105] },
        6: { cellWidth: 23, halign: 'right' },
        7: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: [180, 83, 9] }, // IPI
        8: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didParseCell: (data) => {
        if (data.row.index === bodyRows.length) {
          data.cell.styles.fillColor = [209, 250, 229]; // Emerald-100 (Barra verde de totais)
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [6, 78, 59]; // Emerald-900
        }
      },
      margin: { top: 12, bottom: 12, left: 10, right: 10 }
    });

    // =========================================================================
    // 5. BLOCO INFERIOR: REGRAS OPERACIONAIS & RESUMO FINANCEIRO / ASSINATURAS
    // =========================================================================
    let finalY = ((doc as any).lastAutoTable?.finalY || 160) + 4;
    const pageHeight = doc.internal.pageSize.height || 210;

    if (finalY + 34 > pageHeight - 12) {
      doc.addPage();
      finalY = 12;
    }

    const bottomCardH = 28;

    // Bloco Esquerdo: Instruções Mandatórias da Loja (ALS 10)
    const leftW = 165;
    doc.setFillColor(254, 242, 242); // Red-50
    doc.setDrawColor(239, 68, 68); // Red-500
    doc.setLineWidth(0.3);
    doc.roundedRect(10, finalY, leftW, bottomCardH, 1.5, 1.5, 'FD');

    doc.setTextColor(153, 27, 27); // Red-800
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('REGRAS MANDATÓRIAS DE RECEBIMENTO & FATURAMENTO (Jóia ERP / ALS 10):', 13, finalY + 4);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('1. Boletos NÃO devem exceder o valor de R$ 9.999,00 por título.', 13, finalY + 8);
    doc.text('2. Boletos e arquivo XML da Nota Fiscal devem ser enviados para: als.conecta@gmail.com.', 13, finalY + 11.8);
    doc.text('3. Pagamento de Parte Especial exclusivamente via depósitos bancários autorizados.', 13, finalY + 15.6);
    doc.text('4. Os pedidos seguem espelho oficial da empresa. Favor conferir e avisar imediatamente se houver desacordo.', 13, finalY + 19.4);
    doc.text('5. Descarregamento no local de entrega sob responsabilidade do fornecedor / transportadora.', 13, finalY + 23.2);

    // Bloco Direito: Resumo Financeiro & Assinaturas
    const rightX = 179;
    const rightW = 108;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(rightX, finalY, rightW, bottomCardH, 1.5, 1.5, 'FD');

    // Destaque do Valor Total
    doc.setFillColor(5, 150, 105); // Emerald-600
    doc.roundedRect(rightX + 3, finalY + 3, rightW - 6, 12, 1.5, 1.5, 'F');

    const valorFrete = Number(order.header?.valorFrete) || 0;
    const totalGeralFinal = Math.max(0, subtotalGeral + totalIpiGeral - totalDescontoComercial + valorFrete);

    let formulaText = `Total: ${formatCurrency(subtotalGeral)} + IPI: ${formatCurrency(totalIpiGeral)} - Desconto comercial: ${formatCurrency(totalDescontoComercial)}`;
    if (valorFrete > 0) {
      formulaText += ` + Frete: ${formatCurrency(valorFrete)}`;
    }
    formulaText += ' =';

    doc.setTextColor(255, 255, 255);
    let formulaFontSize = 6.8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(formulaFontSize);
    const maxFormulaW = rightW - 10;
    while (doc.getTextWidth(formulaText) > maxFormulaW && formulaFontSize > 4.5) {
      formulaFontSize -= 0.2;
      doc.setFontSize(formulaFontSize);
    }
    doc.text(formulaText, rightX + 5, finalY + 6.8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(formatCurrency(totalGeralFinal), rightX + 5, finalY + 12.8);

    // Linhas de Assinatura
    const sigY = finalY + 20.5;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.2);
    doc.line(rightX + 5, sigY, rightX + 48, sigY);
    doc.line(rightX + 56, sigY, rightX + 102, sigY);

    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPRADOR RESPONSÁVEL', rightX + 7, sigY + 3.5);
    doc.text('ACEITE DO FORNECEDOR', rightX + 61, sigY + 3.5);

    // =========================================================================
    // 6. RODAPÉ DE PÁGINA EM TODAS AS PÁGINAS
    // =========================================================================
    const totalPages = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : ((doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : 1);
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(10, 203, 287, 203);

      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text('Jóia ERP • Sistema de Gestão de Compras (EMPRESA COMPRADORA)', 10, 206.5);
      doc.text(`Pedido: ${numeroPedido}  |  Página ${i} de ${totalPages}`, 250, 206.5);
    }

    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Erro ao gerar PDF comercial do pedido local:', err);
    throw err;
  }
}

// =========================================================================
// 2. EXPORTAÇÃO DO ROMANEIO DE SEPARAÇÃO (PARA DOCA & 20 LOJAS)
// Formato: A4 Paisagem (Landscape) | GRADE DAS 20 LOJAS, AVARIAS E DOCA
// =========================================================================
export function exportRomaneioPDF(rawOrder: PurchaseOrder, fallbackStores?: StoreConfig[]) {
  const order: PurchaseOrder = {
    ...rawOrder,
    items: (rawOrder.items || []).filter(it => Boolean(it.descricao?.trim() || it.codigo?.trim() || it.codigoInterno?.trim() || it.codigoFornecedor?.trim() || it.qtdTotalUnidades > 0 || it.precoUnitario > 0))
  };

  const numeroPedido = (order.header?.numeroPedido || 'PED-0001').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanFornecedor = (order.header?.fornecedor || 'Fornecedor').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Romaneio_${numeroPedido}_${cleanFornecedor}.pdf`;

  // Geração Local Direta via jsPDF em Paisagem (20 Lojas)
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const storesList = (order.storeConfigs && order.storeConfigs.length > 0) 
      ? order.storeConfigs 
      : (fallbackStores && fallbackStores.length > 0 ? fallbackStores : DEFAULT_STORES);

    const activeStores = storesList.filter(s => s.active);

    // Mapear Avarias do Pedido
    const avariasList = (order.inspection?.possuiAvarias && order.inspection?.avarias) ? order.inspection.avarias : [];
    const avariasMap = new Map<string, number>();
    let totalAvariasGeral = 0;
    avariasList.forEach(a => {
      const item = (order.items || []).find(i => i.id === a.itemId);
      const pack = item?.qtdPorPacote || 1;
      const units = getAvariaUnits(a.quantidade, a.unidadeMedida, pack);
      const key = `${a.itemId}_${a.storeId}`;
      avariasMap.set(key, (avariasMap.get(key) || 0) + units);
      totalAvariasGeral += units;
    });

    const status = order.header?.status || 'Aprovado';
    const dataEmissao = order.header?.dataEmissao || new Date().toLocaleDateString('pt-BR');
    const dataEntrega = order.header?.dataEntregaPrevista || 'A Combinar';
    const fornecedorNome = (order.header?.fornecedor || 'FORNECEDOR NÃO INFORMADO').toUpperCase();
    const vendedor = order.header?.vendedor || 'N/A';
    const contatoVendedor = order.header?.contatoVendedor || 'S/ Contato';
    const { condicaoPagamento, formaPagamento } = resolveOrderPaymentCondition(order);
    const tipoFrete = order.header?.tipoFrete || 'CIF (Por conta do Fornecedor)';

    // =========================================================================
    // 1. CABEÇALHO SUPERIOR (Logo Oficial + Título + Badge do Pedido)
    // =========================================================================
    if (LOGO_MEGA12_BASE64) {
      try {
        doc.addImage(LOGO_MEGA12_BASE64, 'PNG', 10, 6, 20, 20);
      } catch (err) {
        console.warn('Erro ao inserir logo no PDF do romaneio local:', err);
      }
    }

    // Título e Identidade da Loja
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('ROMANEIO DE SEPARAÇÃO E EXPEDIÇÃO (20 LOJAS)', 33, 12);

    doc.setTextColor(5, 150, 105); // Emerald-600
    doc.setFontSize(8);
    doc.text('EMPRESA COMPRADORA  •  CONFERÊNCIA OFICIAL DE DOCA & EXPEDIÇÃO', 33, 18.5);

    // Badge do Pedido (Canto Superior Direito)
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(205, 5.5, 82, 20, 1.5, 1.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`PEDIDO Nº ${numeroPedido}`, 209, 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Emissão: ${dataEmissao}  |  Status: ${status}`, 209, 16);

    doc.setTextColor(253, 224, 71); // Yellow-300
    doc.setFont('helvetica', 'bold');
    doc.text(`Previsão de Entrega: ${dataEntrega}`, 209, 21);

    // =========================================================================
    // 2. BANNER DE ALERTA OBRIGATÓRIO (Âmbar/Amarelo Oficial ALS 10)
    // =========================================================================
    doc.setFillColor(254, 243, 199); // Amber-100
    doc.setDrawColor(245, 158, 11); // Amber-500
    doc.setLineWidth(0.3);
    doc.roundedRect(10, 27, 277, 6.5, 1, 1, 'FD');

    doc.setTextColor(146, 64, 14); // Amber-800
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('! ATENÇÃO OBRIGATÓRIA: AGENDAR ENTREGA COM ROBERTA: (42) 9 9136-5009  |  DESCARREGAMENTO POR CONTA DO FORNECEDOR', 14, 31.5);

    // =========================================================================
    // 3. CARD DE DADOS: FORNECEDOR & CONDIÇÕES COMERCIAIS
    // =========================================================================
    const cardY = 35.5;
    const cardW = 277;
    const baseCardH = 20;

    // Coluna 1 (Esquerda) e Coluna 2 (Direita)
    const offValue = Number(order.header?.percentualDescontoOff || 0);
    const col1X = 13;
    const col2X = 150;
    const col1MaxW = col2X - col1X - 4; // ~133 mm
    const col2MaxW = cardW + 10 - col2X - 3; // ~134 mm

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);

    const offPercentSeparacao = order.header?.percentualNota !== undefined ? order.header.percentualNota : 100;
    const col1Fields = [
      `Fornecedor: ${fornecedorNome}`,
      `Vendedor: ${vendedor}  |  Contato: ${contatoVendedor}`,
      `OFF %: ${offPercentSeparacao}%`
    ];
    const col1Lines: string[] = [];
    col1Fields.forEach(f => {
      const split = doc.splitTextToSize(f, col1MaxW);
      if (Array.isArray(split)) {
        split.forEach((s: string, idx: number) => col1Lines.push(idx > 0 ? `  ${s.trim()}` : s.trim()));
      } else if (split) {
        col1Lines.push(split);
      }
    });

    const col2Fields = [
      `Condição de Pagto: ${condicaoPagamento}`,
      `Forma de Pagto: ${formaPagamento}`,
      `Tipo de Frete: ${tipoFrete}`
    ];
    const col2Lines: string[] = [];
    col2Fields.forEach(f => {
      const split = doc.splitTextToSize(f, col2MaxW);
      if (Array.isArray(split)) {
        split.forEach((s: string, idx: number) => col2Lines.push(idx > 0 ? `  ${s.trim()}` : s.trim()));
      } else if (split) {
        col2Lines.push(split);
      }
    });

    const maxRomaneioLines = Math.max(3, col1Lines.length, col2Lines.length);
    const romaneioLineStep = maxRomaneioLines > 3 ? 3.2 : 3.8;
    const neededRomaneioH = 8.5 + (maxRomaneioLines - 1) * romaneioLineStep + 2.3;
    const cardH = Math.max(baseCardH, neededRomaneioH);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(10, cardY, cardW, cardH, 1.5, 1.5, 'FD');

    doc.setFillColor(241, 245, 249);
    doc.rect(10.2, cardY + 0.2, cardW - 0.4, 5, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('DADOS DO FORNECEDOR & CONDIÇÕES COMERCIAIS:', 13, cardY + 3.8);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');

    col1Lines.forEach((lineText, idx) => {
      doc.text(lineText, col1X, cardY + 8.5 + idx * romaneioLineStep);
    });

    col2Lines.forEach((lineText, idx) => {
      doc.text(lineText, col2X, cardY + 8.5 + idx * romaneioLineStep);
    });

    // =========================================================================
    // 4. TABELA DE SEPARAÇÃO (20 LOJAS)
    // =========================================================================
    const headCols = [
      'Cód / Descrição', 
      'Total Compra',
      'Estoque CD',
      'Total Lojas', 
      ...activeStores.map(s => s.name.replace('Ponta Grossa ', 'PG ').replace('Depósito Central', 'CD Central').replace('Prudentópolis', 'Prudentóp.'))
    ];

    const bodyRows = (order.items || []).map(item => {
      let totalItemAvarias = 0;
      let rawAllocTotal = 0;
      const storeCols = activeStores.map(s => {
        const rawAlloc = item.separacaoLojas?.[s.id] || 0;
        rawAllocTotal += rawAlloc;
        const avUnits = avariasMap.get(`${item.id}_${s.id}`) || 0;
        totalItemAvarias += avUnits;
        const effective = Math.max(0, rawAlloc - avUnits);

        if (avUnits > 0) {
          return `${effective} (-${avUnits})`;
        }
        return effective > 0 ? effective.toLocaleString('pt-BR') : '-';
      });

      const reserveCD = Math.max(0, (Number(item.qtdTotalUnidades) || 0) - rawAllocTotal);
      const totalLiquidoLojas = Math.max(0, rawAllocTotal - totalItemAvarias);
      const codIdent = item.codigoInterno || item.codigo || '';

      return [
        `${codIdent}\n${item.descricao || ''}`,
        Number(item.qtdTotalUnidades || 0).toLocaleString('pt-BR'),
        reserveCD > 0 ? reserveCD.toLocaleString('pt-BR') : '-',
        totalLiquidoLojas > 0 ? totalLiquidoLojas.toLocaleString('pt-BR') : '-',
        ...storeCols
      ];
    });

    // Totais do Rodapé
    const totaisLojas = activeStores.map(s => {
      const somaLoja = (order.items || []).reduce((acc, item) => {
        const raw = item.separacaoLojas?.[s.id] || 0;
        const avUnits = avariasMap.get(`${item.id}_${s.id}`) || 0;
        return acc + Math.max(0, raw - avUnits);
      }, 0);
      return somaLoja > 0 ? somaLoja.toLocaleString('pt-BR') : '0';
    });

    const totalGeralCompra = (order.items || []).reduce((acc, item) => acc + (Number(item.qtdTotalUnidades) || 0), 0);
    const totalGeralEstoque = (order.items || []).reduce((acc, item) => {
      const raw = activeStores.reduce((sum, s) => sum + (Number(item.separacaoLojas?.[s.id]) || 0), 0);
      return acc + Math.max(0, (Number(item.qtdTotalUnidades) || 0) - raw);
    }, 0);
    const totalGeralPecasEfetivas = totaisLojas.reduce((acc, val) => acc + (parseInt(val.replace(/\D/g, '')) || 0), 0);
    const footerRow = [
      'TOTAL GERAL EFETIVO', 
      totalGeralCompra.toLocaleString('pt-BR'),
      totalGeralEstoque.toLocaleString('pt-BR'),
      totalGeralPecasEfetivas.toLocaleString('pt-BR'), 
      ...totaisLojas
    ];

    autoTable(doc, {
      startY: cardY + cardH + 2.5,
      margin: { left: 10, right: 10, bottom: 14, top: 12 },
      head: [headCols],
      body: [...bodyRows, footerRow],
      theme: 'grid',
      styles: { 
        fontSize: 5.5, 
        cellPadding: 0.8, 
        halign: 'center', 
        valign: 'middle',
        lineColor: [226, 232, 240],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [15, 23, 42], 
        textColor: [255, 255, 255], 
        fontStyle: 'bold', 
        fontSize: 5.8,
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 42 },
        1: { fillColor: [241, 245, 249], fontStyle: 'bold', halign: 'center', cellWidth: 12 },
        2: { fillColor: [254, 243, 199], fontStyle: 'bold', halign: 'center', textColor: [146, 64, 14], cellWidth: 12 },
        3: { fillColor: [236, 253, 245], fontStyle: 'bold', halign: 'center', textColor: [6, 95, 70], cellWidth: 12 }
      },
      didParseCell: (data) => {
        if (data.row.index === bodyRows.length) {
          data.cell.styles.fillColor = [209, 250, 229];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [6, 78, 59];
        }
      }
    });

    // =========================================================================
    // 5. CONFERÊNCIA DE RECEBIMENTO & EXPEDIÇÃO DE DOCA
    // =========================================================================
    const pageHeight = doc.internal.pageSize.height || 210;
    let finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 5 : 140;

    const confBoxHeight = 22;
    if (finalY + confBoxHeight > pageHeight - 12) {
      doc.addPage();
      finalY = 14;
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(10, finalY, 277, confBoxHeight, 1.5, 1.5, 'FD');

    // Cabeçalho da conferência
    doc.setFillColor(241, 245, 249);
    doc.rect(10.2, finalY + 0.2, 276.6, 5, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('CONFERÊNCIA DE RECEBIMENTO & EXPEDIÇÃO DE DOCA:', 13, finalY + 3.8);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Conferente Responsável: ${order.inspection?.conferente || '____________________________________'}`, 13, finalY + 9.5);
    doc.text(`Apontamento de Avarias: ${order.inspection?.possuiAvarias ? `SIM (${avariasList.length} ocorrências • ${totalAvariasGeral} peças descontadas)` : '[  ] NÃO HOUVE AVARIAS    [  ] COM AVARIAS APONTADAS'}`, 130, finalY + 9.5);

    // Linhas de Assinatura
    const sigY = finalY + 16.5;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.2);
    doc.line(13, sigY, 90, sigY);
    doc.line(103, sigY, 180, sigY);
    doc.line(193, sigY, 274, sigY);

    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.text('ASSINATURA CONFERENTE / DOCA', 15, sigY + 3.5);
    doc.text('ASSINATURA MOTORISTA / TRANSPORTADORA', 105, sigY + 3.5);
    doc.text('SUPERVISÃO / RECEBIMENTO', 195, sigY + 3.5);

    // =========================================================================
    // 6. RODAPÉ DE PÁGINA EM TODAS AS PÁGINAS
    // =========================================================================
    const totalPages = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : ((doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : 1);
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(10, 203, 287, 203);

      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text('Jóia ERP • Sistema de Gestão de Compras & Distribuição (EMPRESA COMPRADORA)', 10, 206.5);
      doc.text(`Romaneio: ${numeroPedido}  |  Página ${i} de ${totalPages}`, 240, 206.5);
    }

    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Erro ao gerar PDF local do romaneio:', err);
    throw err;
  }
}
