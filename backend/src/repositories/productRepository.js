const { queryAll, queryOne, execute } = require('../config/database');

class ProductRepository {
  async findAll(tenantSlug) {
    return await queryAll("SELECT * FROM products WHERE ativo = 1 ORDER BY descricao ASC", tenantSlug);
  }

  async findById(id, tenantSlug) {
    return await queryOne("SELECT * FROM products WHERE id = ?", [id], tenantSlug);
  }

  async findByCodigo(codigo, tenantSlug) {
    return await queryOne("SELECT * FROM products WHERE codigo = ?", [codigo], tenantSlug);
  }

  async upsert(product, tenantSlug) {
    const now = new Date().toISOString();
    const codInterno = (product.codigoInterno || product.codigo || '').trim();
    const codForn = (product.codigoFornecedor || '').trim();
    const codBarras = (product.codigoBarras || product.eanBarcode || '').trim();
    const supplierId = product.supplierId || product.fornecedorPadraoId || '';
    const nomeFornecedor = product.nomeFornecedor || product.fornecedorPadraoNome || '';

    let existing = await this.findById(product.id, tenantSlug);
    if (!existing && codInterno) {
      existing = await this.findByCodigo(codInterno, tenantSlug);
    }

    const targetId = existing ? existing.id : (product.id || ('prod_' + Date.now()));

    const incomingQtd = product.qtdPorPacote !== undefined && product.qtdPorPacote !== null && !isNaN(Number(product.qtdPorPacote))
      ? Number(product.qtdPorPacote)
      : (product.qtdNoPacote !== undefined && product.qtdNoPacote !== null && !isNaN(Number(product.qtdNoPacote))
          ? Number(product.qtdNoPacote)
          : (existing ? Number(existing.qtdPorPacote) : 1));
    const finalQtdPorPacote = incomingQtd > 0 ? incomingQtd : 1;

    if (existing) {
      const sql = `
        UPDATE products SET
          codigo = ?, codigoInterno = ?, codigoFornecedor = ?, codigoBarras = ?,
          descricao = ?, categoria = ?, subcategoria = ?,
          supplierId = ?, nomeFornecedor = ?, precoUnitarioPadrao = ?,
          pdvSugerido = ?, qtdPorPacote = ?, fotoUrl = ?, ncm = ?, eanBarcode = ?,
          ativo = ?, updatedAt = ?
        WHERE id = ?
      `;
      await execute(sql, [
        codInterno,
        codInterno,
        codForn,
        codBarras,
        product.descricao,
        product.categoria || existing.categoria || 'Utilidades',
        product.subcategoria || existing.subcategoria || '',
        supplierId || existing.supplierId || '',
        nomeFornecedor || existing.nomeFornecedor || '',
        Number(product.precoUnitarioPadrao) || Number(existing.precoUnitarioPadrao) || 0,
        Number(product.pdvSugerido) || Number(existing.pdvSugerido) || 0,
        finalQtdPorPacote,
        product.fotoUrl !== undefined ? product.fotoUrl : (existing.fotoUrl || ''),
        product.ncm || existing.ncm || '',
        codBarras || existing.codigoBarras || '',
        product.ativo !== undefined ? (product.ativo ? 1 : 0) : 1,
        now,
        targetId
      ], tenantSlug);
    } else {
      const sql = `
        INSERT INTO products (
          id, codigo, codigoInterno, codigoFornecedor, codigoBarras,
          descricao, categoria, subcategoria, supplierId,
          nomeFornecedor, precoUnitarioPadrao, pdvSugerido, qtdPorPacote,
          fotoUrl, ncm, eanBarcode, ativo, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await execute(sql, [
        targetId,
        codInterno,
        codInterno,
        codForn,
        codBarras,
        product.descricao,
        product.categoria || 'Utilidades',
        product.subcategoria || '',
        supplierId,
        nomeFornecedor,
        Number(product.precoUnitarioPadrao) || 0,
        Number(product.pdvSugerido) || 0,
        finalQtdPorPacote,
        product.fotoUrl || '',
        product.ncm || '',
        codBarras,
        product.ativo !== undefined ? (product.ativo ? 1 : 0) : 1,
        product.createdAt || now,
        now
      ], tenantSlug);
    }

    return await this.findById(targetId, tenantSlug);
  }

  async delete(id, tenantSlug) {
    await execute("DELETE FROM products WHERE id = ?", [id], tenantSlug);
    return true;
  }

  async deleteBySupplierId(supplierId, razaoSocial, tenantSlug) {
    if (razaoSocial) {
      await execute("DELETE FROM products WHERE supplierId = ? OR nomeFornecedor = ?", [supplierId, razaoSocial], tenantSlug);
    } else {
      await execute("DELETE FROM products WHERE supplierId = ?", [supplierId], tenantSlug);
    }
    return true;
  }
}

module.exports = new ProductRepository();
