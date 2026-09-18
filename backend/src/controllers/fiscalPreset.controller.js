const fiscalPresetRepository = require('../repositories/fiscalPresetRepository');

class FiscalPresetController {
  async list(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const presets = await fiscalPresetRepository.findAll(tenantSlug);
      return res.json(presets);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const preset = await fiscalPresetRepository.findById(req.params.id, tenantSlug);
      if (!preset) {
        return res.status(404).json({ error: 'Modelo fiscal não encontrado.' });
      }
      return res.json(preset);
    } catch (err) {
      next(err);
    }
  }

  async save(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const { name } = req.body;
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Nome do modelo fiscal é obrigatório.' });
      }

      const saved = await fiscalPresetRepository.upsert(req.body, tenantSlug);
      return res.status(201).json(saved);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      await fiscalPresetRepository.delete(req.params.id, tenantSlug);
      return res.json({ success: true, message: 'Modelo fiscal removido com sucesso.' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new FiscalPresetController();
