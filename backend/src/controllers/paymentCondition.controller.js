const paymentConditionRepository = require('../repositories/paymentConditionRepository');

class PaymentConditionController {
  async list(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const onlyActive = req.query.active === 'true' || req.query.ativo === 'true';
      const list = await paymentConditionRepository.findAll({ onlyActive }, tenantSlug);
      return res.json(list);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const item = await paymentConditionRepository.findById(req.params.id, tenantSlug);
      if (!item) {
        return res.status(404).json({ error: 'Condição de pagamento não encontrada.' });
      }
      return res.json(item);
    } catch (err) {
      next(err);
    }
  }

  async save(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const { descricao, qtdParcelas } = req.body;
      if (!descricao || typeof descricao !== 'string' || descricao.trim() === '') {
        return res.status(400).json({ error: 'Descrição da condição de pagamento é obrigatória.' });
      }

      if (qtdParcelas !== undefined && (isNaN(parseInt(qtdParcelas, 10)) || parseInt(qtdParcelas, 10) < 1)) {
        return res.status(400).json({ error: 'Quantidade de parcelas deve ser maior ou igual a 1.' });
      }

      const saved = await paymentConditionRepository.upsert(req.body, tenantSlug);
      return res.status(201).json(saved);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      await paymentConditionRepository.delete(req.params.id, tenantSlug);
      return res.json({ success: true, message: 'Condição de pagamento removida com sucesso.' });
    } catch (err) {
      if (err.message && err.message.includes('padrão')) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  }
}

module.exports = new PaymentConditionController();
