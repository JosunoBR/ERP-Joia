const stockRepository = require('../repositories/stockRepository');

class StockController {
  async list(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const items = await stockRepository.findAll(tenantSlug);
      return res.json(items);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const item = await stockRepository.findById(req.params.id, tenantSlug);
      if (!item) return res.status(404).json({ error: 'Item de estoque não encontrado.' });
      return res.json(item);
    } catch (err) {
      next(err);
    }
  }

  async save(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const saved = await stockRepository.save(req.body, tenantSlug);
      return res.status(201).json(saved);
    } catch (err) {
      next(err);
    }
  }

  async updateBalance(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const { deltaUnidades, localizacaoGalpao } = req.body;
      const updated = await stockRepository.updateBalance(req.params.id, deltaUnidades, localizacaoGalpao, tenantSlug);
      return res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      await stockRepository.delete(req.params.id, tenantSlug);
      return res.json({ success: true, message: 'Item removido do estoque central.' });
    } catch (err) {
      next(err);
    }
  }

  async clearAll(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      await stockRepository.clearAll(tenantSlug);
      return res.json({ success: true, message: 'Todos os itens do estoque central foram removidos.' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new StockController();
