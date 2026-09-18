const { queryAll, queryOne, execute } = require('../config/database');

function formatPhone(value) {
  if (!value) return '';
  let digits = String(value).replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  digits = digits.slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function normalizeSupplier(sup) {
  if (!sup) return sup;
  return {
    ...sup,
    contatoVendedor: sup.contatoVendedor ? formatPhone(sup.contatoVendedor) : (sup.contatoVendedor || ''),
    telefoneEmpresa: sup.telefoneEmpresa ? formatPhone(sup.telefoneEmpresa) : (sup.telefoneEmpresa || '')
  };
}

class SupplierRepository {
  async findAll(tenantSlug) {
    const rows = await queryAll("SELECT * FROM suppliers ORDER BY razaoSocial ASC", tenantSlug);
    return rows.map(normalizeSupplier);
  }

  async findById(id, tenantSlug) {
    const row = await queryOne("SELECT * FROM suppliers WHERE id = ?", [id], tenantSlug);
    return normalizeSupplier(row);
  }

  async findByCnpj(cnpj, tenantSlug) {
    if (!cnpj) return null;
    const row = await queryOne("SELECT * FROM suppliers WHERE cnpj = ?", [cnpj], tenantSlug);
    return normalizeSupplier(row);
  }

  async upsert(supplier, tenantSlug) {
    const existing = await this.findById(supplier.id, tenantSlug);
    const now = new Date().toISOString();

    const pedidoPadraoJson = typeof supplier.pedidoPadraoJson === 'string' 
      ? supplier.pedidoPadraoJson 
      : (supplier.pedidoPadrao ? JSON.stringify(supplier.pedidoPadrao) : (existing?.pedidoPadraoJson || null));

    if (existing) {
      const sql = `
        UPDATE suppliers SET
          razaoSocial = ?, nomeFantasia = ?, cnpj = ?, vendedorPadrao = ?,
          contatoVendedor = ?, condicaoPagamentoPadrao = ?, aliquotaStPadrao = ?,
          aliquotaIpiPadrao = ?, descontoOffPadrao = ?, percentualNotaPadrao = ?,
          telefoneEmpresa = ?, endereco = ?, email = ?, observacoesDescarga = ?,
          pedidoPadraoJson = ?, updatedAt = ?
        WHERE id = ?
      `;
      await execute(sql, [
        supplier.razaoSocial,
        supplier.nomeFantasia || '',
        supplier.cnpj || '',
        supplier.vendedorPadrao || '',
        formatPhone(supplier.contatoVendedor),
        supplier.condicaoPagamentoPadrao || '30/60/90 Dias',
        Number(supplier.aliquotaStPadrao) || 0,
        Number(supplier.aliquotaIpiPadrao) || 0,
        Number(supplier.descontoOffPadrao) || 0,
        Number(supplier.percentualNotaPadrao) || 100,
        formatPhone(supplier.telefoneEmpresa),
        supplier.endereco || '',
        supplier.email || '',
        supplier.observacoesDescarga || '',
        pedidoPadraoJson,
        now,
        supplier.id
      ], tenantSlug);
    } else {
      const sql = `
        INSERT INTO suppliers (
          id, razaoSocial, nomeFantasia, cnpj, vendedorPadrao, contatoVendedor,
          condicaoPagamentoPadrao, aliquotaStPadrao, aliquotaIpiPadrao,
          descontoOffPadrao, percentualNotaPadrao, telefoneEmpresa, endereco,
          email, observacoesDescarga, pedidoPadraoJson, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await execute(sql, [
        supplier.id,
        supplier.razaoSocial,
        supplier.nomeFantasia || '',
        supplier.cnpj || '',
        supplier.vendedorPadrao || '',
        formatPhone(supplier.contatoVendedor),
        supplier.condicaoPagamentoPadrao || '30/60/90 Dias',
        Number(supplier.aliquotaStPadrao) || 0,
        Number(supplier.aliquotaIpiPadrao) || 0,
        Number(supplier.descontoOffPadrao) || 0,
        Number(supplier.percentualNotaPadrao) || 100,
        formatPhone(supplier.telefoneEmpresa),
        supplier.endereco || '',
        supplier.email || '',
        supplier.observacoesDescarga || '',
        pedidoPadraoJson,
        supplier.createdAt || now,
        now
      ], tenantSlug);
    }

    return await this.findById(supplier.id, tenantSlug);
  }

  async delete(id, tenantSlug) {
    await execute("DELETE FROM suppliers WHERE id = ?", [id], tenantSlug);
    return true;
  }
}

module.exports = new SupplierRepository();
