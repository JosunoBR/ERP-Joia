const { queryAll, queryOne, execute } = require('../config/database');

class FiscalRepository {
  async getFiscalConfig(tenantSlug) {
    let row = await queryOne("SELECT * FROM fiscal_config WHERE id = 'default'", tenantSlug);
    if (!row) {
      const now = new Date().toISOString();
      await execute(`
        INSERT INTO fiscal_config (id, icmsAliquota, ipiAliquota, pisCofinsAliquota, custosFixos, creditoEntradaICMS, updatedAt)
        VALUES ('default', 0.11, 0.00, 0.03, 0.26, 0.195, ?)
      `, [now], tenantSlug);
      row = await queryOne("SELECT * FROM fiscal_config WHERE id = 'default'", tenantSlug);
    }
    return row;
  }

  async updateFiscalConfig(cfg, tenantSlug) {
    const now = new Date().toISOString();
    await execute(`
      UPDATE fiscal_config SET
        icmsAliquota = ?, ipiAliquota = ?, pisCofinsAliquota = ?,
        custosFixos = ?, creditoEntradaICMS = ?, updatedAt = ?
      WHERE id = 'default'
    `, [
      Number(cfg.icmsAliquota) || 0.11,
      Number(cfg.ipiAliquota) || 0.00,
      Number(cfg.pisCofinsAliquota) || 0.03,
      Number(cfg.custosFixos) || 0.26,
      Number(cfg.creditoEntradaICMS) || 0.195,
      now
    ], tenantSlug);
    return await this.getFiscalConfig(tenantSlug);
  }

  async getStores(tenantSlug) {
    return await queryAll("SELECT * FROM stores ORDER BY cluster ASC, name ASC", tenantSlug);
  }

  async updateStores(stores, tenantSlug) {
    if (!Array.isArray(stores)) return await this.getStores(tenantSlug);

    const incomingIds = stores.map(s => s.id).filter(Boolean);

    // 1. Inserir ou atualizar lojas enviadas
    for (const store of stores) {
      if (!store.id) continue;
      const existing = await queryOne("SELECT id FROM stores WHERE id = ?", [store.id], tenantSlug);
      if (existing) {
        await execute(`
          UPDATE stores SET
            name = ?, cluster = ?, defaultWeight = ?, active = ?
          WHERE id = ?
        `, [
          (store.name || '').trim(),
          store.cluster || 'A',
          Math.max(0, Number(store.defaultWeight) || 0),
          store.active ? 1 : 0,
          store.id
        ], tenantSlug);
      } else {
        await execute(`
          INSERT INTO stores (id, name, cluster, defaultWeight, active)
          VALUES (?, ?, ?, ?, ?)
        `, [
          store.id,
          (store.name || '').trim(),
          store.cluster || 'A',
          Math.max(0, Number(store.defaultWeight) || 0),
          store.active ? 1 : 0
        ], tenantSlug);
      }
    }

    // 2. Remover lojas que não estão mais presentes na lista (se houver IDs válidos)
    if (incomingIds.length > 0) {
      const allCurrent = await queryAll("SELECT id FROM stores", tenantSlug);
      for (const cur of allCurrent) {
        if (!incomingIds.includes(cur.id)) {
          await execute("DELETE FROM stores WHERE id = ?", [cur.id], tenantSlug);
        }
      }
    }

    return await this.getStores(tenantSlug);
  }
}

module.exports = new FiscalRepository();
