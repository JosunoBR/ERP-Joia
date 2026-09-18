const { queryAll, queryOne, execute } = require('../config/database');

class FinancialRepository {
  /**
   * Busca registros com filtros múltiplos: mês, ano, loja, categoria, status, tipo, busca de texto.
   */
  async findAll({ month, year, storeId, lojaNome, categoria, status, tipo, search, empresa } = {}, tenantSlug) {
    let sql = 'SELECT * FROM financial_entries WHERE 1=1';
    const params = [];

    // Filtro por Ano/Mês no campo dataVencimento (formato YYYY-MM-DD)
    if (year && year !== 'all' && month && month !== 'all') {
      const formattedMonth = String(month).padStart(2, '0');
      sql += ' AND dataVencimento LIKE ?';
      params.push(`${year}-${formattedMonth}-%`);
    } else if (year && year !== 'all') {
      sql += ' AND dataVencimento LIKE ?';
      params.push(`${year}-%`);
    } else if (month && month !== 'all') {
      const formattedMonth = String(month).padStart(2, '0');
      sql += ' AND dataVencimento LIKE ?';
      params.push(`%-${formattedMonth}-%`);
    }

    if (storeId) {
      sql += ' AND storeId = ?';
      params.push(storeId);
    }

    if (lojaNome) {
      sql += ' AND (lojaNome = ? OR storeId = ?)';
      params.push(lojaNome, lojaNome);
    }

    if (categoria && categoria !== 'all') {
      sql += ' AND categoria = ?';
      params.push(categoria.toUpperCase());
    }

    if (status && status !== 'all') {
      if (status === 'pendente' || status === 'aberto' || status === 'nao_pago') {
        sql += " AND status != 'Pago'";
      } else {
        sql += ' AND status = ?';
        params.push(status);
      }
    }

    if (tipo && tipo !== 'all') {
      sql += ' AND tipo = ?';
      params.push(tipo);
    }

    if (empresa && empresa !== 'all') {
      sql += ' AND empresa = ?';
      params.push(empresa);
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      sql += ' AND (LOWER(descricao) LIKE ? OR LOWER(fornecedor) LIKE ? OR LOWER(documentoRef) LIKE ? OR LOWER(observacao) LIKE ?)';
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY dataVencimento ASC, createdAt ASC';

    const rows = await queryAll(sql, params, tenantSlug);
    return rows.map(r => this._hydrate(r));
  }

  async findById(id, tenantSlug) {
    const row = await queryOne('SELECT * FROM financial_entries WHERE id = ?', [id], tenantSlug);
    return row ? this._hydrate(row) : null;
  }

  async findByOrderId(orderId, tenantSlug) {
    const rows = await queryAll('SELECT * FROM financial_entries WHERE orderId = ? ORDER BY dataVencimento ASC', [orderId], tenantSlug);
    return rows.map(r => this._hydrate(r));
  }

  async create(entry, tenantSlug) {
    const now = new Date().toISOString();
    const id = entry.id || ('fin_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));

    await execute(`
      INSERT INTO financial_entries (
        id, tipo, orderId, installmentId, descricao, categoria, fornecedor,
        storeId, lojaNome, empresa, formaPagamento, bancoConta, documentoRef,
        parcelaNumero, parcelaTotal, parcelaDesc, dataVencimento, valor,
        status, dataPagamento, valorPago, observacao, recorrente, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      entry.tipo || 'despesa',
      entry.orderId || null,
      entry.installmentId || null,
      entry.descricao || 'Despesa',
      (entry.categoria || 'OPERACIONAL').toUpperCase(),
      entry.fornecedor || '',
      entry.storeId || '',
      entry.lojaNome || '',
      entry.empresa || 'ALS',
      (entry.formaPagamento || 'BOLETO').toUpperCase(),
      entry.bancoConta || '',
      entry.documentoRef || '',
      parseInt(entry.parcelaNumero, 10) || 1,
      parseInt(entry.parcelaTotal, 10) || 1,
      entry.parcelaDesc || 'Única',
      entry.dataVencimento || new Date().toISOString().substring(0, 10),
      parseFloat(entry.valor) || 0,
      entry.status || 'A Vencer',
      entry.dataPagamento || null,
      entry.valorPago !== undefined ? parseFloat(entry.valorPago) : (entry.status === 'Pago' ? parseFloat(entry.valor) : 0),
      entry.observacao || '',
      entry.recorrente ? 1 : 0,
      entry.createdAt || now,
      now
    ], tenantSlug);

    return await this.findById(id, tenantSlug);
  }

  async createBatch(entries, tenantSlug) {
    const results = [];
    for (const entry of entries) {
      const created = await this.create(entry, tenantSlug);
      results.push(created);
    }
    return results;
  }

  async update(id, entry, tenantSlug) {
    const existing = await this.findById(id, tenantSlug);
    if (!existing) return null;

    const now = new Date().toISOString();

    await execute(`
      UPDATE financial_entries SET
        tipo = ?,
        orderId = ?,
        installmentId = ?,
        descricao = ?,
        categoria = ?,
        fornecedor = ?,
        storeId = ?,
        lojaNome = ?,
        empresa = ?,
        formaPagamento = ?,
        bancoConta = ?,
        documentoRef = ?,
        parcelaNumero = ?,
        parcelaTotal = ?,
        parcelaDesc = ?,
        dataVencimento = ?,
        valor = ?,
        status = ?,
        dataPagamento = ?,
        valorPago = ?,
        observacao = ?,
        recorrente = ?,
        updatedAt = ?
      WHERE id = ?
    `, [
      entry.tipo !== undefined ? entry.tipo : existing.tipo,
      entry.orderId !== undefined ? entry.orderId : existing.orderId,
      entry.installmentId !== undefined ? entry.installmentId : existing.installmentId,
      entry.descricao !== undefined ? entry.descricao : existing.descricao,
      entry.categoria !== undefined ? entry.categoria.toUpperCase() : existing.categoria,
      entry.fornecedor !== undefined ? entry.fornecedor : existing.fornecedor,
      entry.storeId !== undefined ? entry.storeId : existing.storeId,
      entry.lojaNome !== undefined ? entry.lojaNome : existing.lojaNome,
      entry.empresa !== undefined ? entry.empresa : existing.empresa,
      entry.formaPagamento !== undefined ? entry.formaPagamento.toUpperCase() : existing.formaPagamento,
      entry.bancoConta !== undefined ? entry.bancoConta : existing.bancoConta,
      entry.documentoRef !== undefined ? entry.documentoRef : existing.documentoRef,
      entry.parcelaNumero !== undefined ? parseInt(entry.parcelaNumero, 10) : existing.parcelaNumero,
      entry.parcelaTotal !== undefined ? parseInt(entry.parcelaTotal, 10) : existing.parcelaTotal,
      entry.parcelaDesc !== undefined ? entry.parcelaDesc : existing.parcelaDesc,
      entry.dataVencimento !== undefined ? entry.dataVencimento : existing.dataVencimento,
      entry.valor !== undefined ? parseFloat(entry.valor) : existing.valor,
      entry.status !== undefined ? entry.status : existing.status,
      entry.dataPagamento !== undefined ? entry.dataPagamento : existing.dataPagamento,
      entry.valorPago !== undefined ? parseFloat(entry.valorPago) : existing.valorPago,
      entry.observacao !== undefined ? entry.observacao : existing.observacao,
      entry.recorrente !== undefined ? (entry.recorrente ? 1 : 0) : (existing.recorrente ? 1 : 0),
      now,
      id
    ], tenantSlug);

    return await this.findById(id, tenantSlug);
  }

  async markAsPaid(id, { dataPagamento, valorPago, observacao } = {}, tenantSlug) {
    const existing = await this.findById(id, tenantSlug);
    if (!existing) return null;

    const now = new Date().toISOString();
    const payDate = dataPagamento || now.substring(0, 10);
    const paidAmount = valorPago !== undefined ? parseFloat(valorPago) : existing.valor;

    await execute(`
      UPDATE financial_entries SET
        status = 'Pago',
        dataPagamento = ?,
        valorPago = ?,
        observacao = CASE WHEN ? != '' THEN ? ELSE observacao END,
        updatedAt = ?
      WHERE id = ?
    `, [payDate, paidAmount, observacao || '', observacao || '', now, id], tenantSlug);

    return await this.findById(id, tenantSlug);
  }

  async delete(id, tenantSlug) {
    await execute('DELETE FROM financial_entries WHERE id = ?', [id], tenantSlug);
    return true;
  }

  async findByOrderId(orderId, tenantSlug) {
    const rows = await queryAll('SELECT * FROM financial_entries WHERE orderId = ?', [orderId], tenantSlug);
    return rows.map(r => this._hydrate(r));
  }

  async deleteByOrderId(orderId, tenantSlug) {
    await execute('DELETE FROM financial_entries WHERE orderId = ?', [orderId], tenantSlug);
    return true;
  }

  _hydrate(row) {
    if (!row) return null;
    return {
      id: row.id,
      tipo: row.tipo || 'despesa',
      orderId: row.orderId || null,
      installmentId: row.installmentId || null,
      descricao: row.descricao || '',
      categoria: row.categoria || 'OPERACIONAL',
      fornecedor: row.fornecedor || '',
      storeId: row.storeId || '',
      lojaNome: row.lojaNome || '',
      empresa: row.empresa || 'ALS',
      formaPagamento: row.formaPagamento || 'BOLETO',
      bancoConta: row.bancoConta || '',
      documentoRef: row.documentoRef || '',
      parcelaNumero: Number(row.parcelaNumero) || 1,
      parcelaTotal: Number(row.parcelaTotal) || 1,
      parcelaDesc: row.parcelaDesc || 'Única',
      dataVencimento: row.dataVencimento,
      valor: Number(row.valor) || 0,
      status: row.status || 'A Vencer',
      dataPagamento: row.dataPagamento || null,
      valorPago: Number(row.valorPago) || 0,
      observacao: row.observacao || '',
      recorrente: Boolean(row.recorrente),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}

module.exports = new FinancialRepository();
