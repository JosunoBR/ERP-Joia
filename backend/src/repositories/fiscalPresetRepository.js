const { queryAll, queryOne, execute } = require('../config/database');

class FiscalPresetRepository {
  async findAll(tenantSlug) {
    const rows = await queryAll("SELECT * FROM fiscal_presets ORDER BY isDefault DESC, name ASC", tenantSlug);
    return rows.map(r => this._hydrate(r));
  }

  async findById(id, tenantSlug) {
    const row = await queryOne("SELECT * FROM fiscal_presets WHERE id = ?", [id], tenantSlug);
    return row ? this._hydrate(row) : null;
  }

  async upsert(preset, tenantSlug) {
    const now = new Date().toISOString();
    const presetId = preset.id || ('preset_fisc_' + Date.now());
    const existing = await this.findById(presetId, tenantSlug);

    const ipi = Number(preset.ipiAliquota) || 0;
    const st = Number(preset.aliquotaSt) || 0;
    const frete = Number(preset.freteAliquota) || 0;
    const icmsEntrada = preset.creditoEntradaICMS !== undefined ? Number(preset.creditoEntradaICMS) : 0.12;
    const custosFixos = preset.custosFixos !== undefined ? Number(preset.custosFixos) : 0.26;
    const icmsSaida = preset.icmsAliquota !== undefined ? Number(preset.icmsAliquota) : 0.195;
    const pisCofins = preset.pisCofinsAliquota !== undefined ? Number(preset.pisCofinsAliquota) : 0.06;

    if (existing) {
      await execute(`
        UPDATE fiscal_presets SET
          name = ?, description = ?, ipiAliquota = ?, aliquotaSt = ?,
          freteAliquota = ?, creditoEntradaICMS = ?, custosFixos = ?,
          icmsAliquota = ?, pisCofinsAliquota = ?, isDefault = ?, updatedAt = ?
        WHERE id = ?
      `, [
        preset.name,
        preset.description || '',
        ipi,
        st,
        frete,
        icmsEntrada,
        custosFixos,
        icmsSaida,
        pisCofins,
        preset.isDefault ? 1 : 0,
        now,
        presetId
      ], tenantSlug);
    } else {
      await execute(`
        INSERT INTO fiscal_presets (
          id, name, description, ipiAliquota, aliquotaSt, freteAliquota,
          creditoEntradaICMS, custosFixos, icmsAliquota, pisCofinsAliquota,
          isDefault, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        presetId,
        preset.name,
        preset.description || '',
        ipi,
        st,
        frete,
        icmsEntrada,
        custosFixos,
        icmsSaida,
        pisCofins,
        preset.isDefault ? 1 : 0,
        preset.createdAt || now,
        now
      ], tenantSlug);
    }

    return await this.findById(presetId, tenantSlug);
  }

  async delete(id, tenantSlug) {
    const existing = await this.findById(id, tenantSlug);
    if (existing && existing.isDefault) {
      throw new Error('O modelo fiscal padrão da rede não pode ser excluído.');
    }
    await execute("DELETE FROM fiscal_presets WHERE id = ?", [id], tenantSlug);
    return true;
  }

  _hydrate(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      ipiAliquota: Number(row.ipiAliquota) || 0,
      aliquotaSt: Number(row.aliquotaSt) || 0,
      freteAliquota: Number(row.freteAliquota) || 0,
      creditoEntradaICMS: row.creditoEntradaICMS !== undefined ? Number(row.creditoEntradaICMS) : 0.12,
      custosFixos: row.custosFixos !== undefined ? Number(row.custosFixos) : 0.26,
      icmsAliquota: row.icmsAliquota !== undefined ? Number(row.icmsAliquota) : 0.195,
      pisCofinsAliquota: row.pisCofinsAliquota !== undefined ? Number(row.pisCofinsAliquota) : 0.06,
      isDefault: Boolean(row.isDefault),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}

module.exports = new FiscalPresetRepository();
