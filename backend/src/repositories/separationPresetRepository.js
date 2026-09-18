const { queryAll, queryOne, execute } = require('../config/database');

class SeparationPresetRepository {
  async findAll(tenantSlug) {
    const rows = await queryAll("SELECT * FROM separation_presets ORDER BY isDefault DESC, name ASC", tenantSlug);
    return rows.map(r => this._hydrate(r));
  }

  async findById(id, tenantSlug) {
    const row = await queryOne("SELECT * FROM separation_presets WHERE id = ?", [id], tenantSlug);
    return row ? this._hydrate(row) : null;
  }

  async upsert(preset, tenantSlug) {
    const now = new Date().toISOString();
    const presetId = preset.id || ('preset_' + Date.now());
    const existing = await this.findById(presetId, tenantSlug);
    const storeWeightsJson = typeof preset.storeWeights === 'string'
      ? preset.storeWeights
      : JSON.stringify(preset.storeWeights || {});

    if (existing) {
      await execute(`
        UPDATE separation_presets SET
          name = ?, description = ?, storeWeightsJson = ?,
          reserveStockPercent = ?, isDefault = ?, updatedAt = ?
        WHERE id = ?
      `, [
        preset.name,
        preset.description || '',
        storeWeightsJson,
        Number(preset.reserveStockPercent) || 0,
        preset.isDefault ? 1 : 0,
        now,
        presetId
      ], tenantSlug);
    } else {
      await execute(`
        INSERT INTO separation_presets (
          id, name, description, storeWeightsJson, reserveStockPercent, isDefault, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        presetId,
        preset.name,
        preset.description || '',
        storeWeightsJson,
        Number(preset.reserveStockPercent) || 0,
        preset.isDefault ? 1 : 0,
        preset.createdAt || now,
        now
      ], tenantSlug);
    }

    return await this.findById(presetId, tenantSlug);
  }

  async delete(id, tenantSlug) {
    // Não permitir deletar o padrão oficial da rede
    const existing = await this.findById(id, tenantSlug);
    if (existing && existing.isDefault) {
      throw new Error('O modelo padrão do sistema não pode ser excluído.');
    }
    await execute("DELETE FROM separation_presets WHERE id = ?", [id], tenantSlug);
    return true;
  }

  _hydrate(row) {
    if (!row) return null;
    let storeWeights = {};
    if (row.storeWeightsJson) {
      try {
        storeWeights = JSON.parse(row.storeWeightsJson);
      } catch {}
    }
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      storeWeights,
      storeWeightsJson: row.storeWeightsJson,
      reserveStockPercent: Number(row.reserveStockPercent) || 0,
      isDefault: Boolean(row.isDefault),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}

module.exports = new SeparationPresetRepository();
