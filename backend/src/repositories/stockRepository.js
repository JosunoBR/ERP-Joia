const { queryAll, queryOne, execute } = require('../config/database');

class StockRepository {
  async findAll(tenantSlug) {
    return await queryAll("SELECT * FROM central_stock ORDER BY descricao ASC", tenantSlug);
  }

  async findById(id, tenantSlug) {
    return await queryOne("SELECT * FROM central_stock WHERE id = ?", [id], tenantSlug);
  }

  async findByProductId(productId, tenantSlug) {
    return await queryOne("SELECT * FROM central_stock WHERE productId = ?", [productId], tenantSlug);
  }

  async save(item, tenantSlug) {
    const existing = await queryOne("SELECT id FROM central_stock WHERE id = ?", [item.id], tenantSlug);
    const now = new Date().toISOString();

    if (existing) {
      const sql = `
        UPDATE central_stock SET
          productId = ?, codigoInterno = ?, codigoFornecedor = ?, codigoBarras = ?,
          codigo = ?, descricao = ?, categoria = ?, fotoUrl = ?, saldoUnidades = ?,
          precoUnitario = ?, pdvSugerido = ?, localizacaoGalpao = ?, fornecedorOrigem = ?,
          dataUltimaEntrada = ?, updatedAt = ?
        WHERE id = ?
      `;
      await execute(sql, [
        item.productId || null,
        item.codigoInterno || item.codigo || '',
        item.codigoFornecedor || '',
        item.codigoBarras || item.eanBarcode || '',
        item.codigo || item.codigoInterno || '',
        item.descricao || '',
        item.categoria || 'Geral',
        item.fotoUrl || '',
        Number(item.saldoUnidades) || 0,
        Number(item.precoUnitario) || 0,
        Number(item.pdvSugerido) || 0,
        item.localizacaoGalpao || '',
        item.fornecedorOrigem || '',
        item.dataUltimaEntrada || now,
        now,
        item.id
      ], tenantSlug);
    } else {
      const sql = `
        INSERT INTO central_stock (
          id, productId, codigoInterno, codigoFornecedor, codigoBarras, codigo,
          descricao, categoria, fotoUrl, saldoUnidades, precoUnitario, pdvSugerido,
          localizacaoGalpao, fornecedorOrigem, dataUltimaEntrada, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await execute(sql, [
        item.id,
        item.productId || null,
        item.codigoInterno || item.codigo || '',
        item.codigoFornecedor || '',
        item.codigoBarras || item.eanBarcode || '',
        item.codigo || item.codigoInterno || '',
        item.descricao || '',
        item.categoria || 'Geral',
        item.fotoUrl || '',
        Number(item.saldoUnidades) || 0,
        Number(item.precoUnitario) || 0,
        Number(item.pdvSugerido) || 0,
        item.localizacaoGalpao || '',
        item.fornecedorOrigem || '',
        item.dataUltimaEntrada || now,
        item.createdAt || now,
        now
      ], tenantSlug);
    }

    return await this.findById(item.id, tenantSlug);
  }

  async updateBalance(id, deltaUnidades, newLocation, tenantSlug) {
    const item = await this.findById(id, tenantSlug);
    if (!item) throw new Error('Item de estoque não encontrado.');

    const newSaldo = Math.max(0, (Number(item.saldoUnidades) || 0) + Number(deltaUnidades));
    const now = new Date().toISOString();

    if (newLocation) {
      await execute(
        "UPDATE central_stock SET saldoUnidades = ?, localizacaoGalpao = ?, updatedAt = ? WHERE id = ?",
        [newSaldo, newLocation, now, id]
      , tenantSlug);
    } else {
      await execute(
        "UPDATE central_stock SET saldoUnidades = ?, updatedAt = ? WHERE id = ?",
        [newSaldo, now, id]
      , tenantSlug);
    }

    return await this.findById(id, tenantSlug);
  }

  async delete(id, tenantSlug) {
    await execute("DELETE FROM central_stock WHERE id = ?", [id], tenantSlug);
    return true;
  }

  async clearAll(tenantSlug) {
    await execute("DELETE FROM central_stock", tenantSlug);
    return true;
  }
}

module.exports = new StockRepository();
