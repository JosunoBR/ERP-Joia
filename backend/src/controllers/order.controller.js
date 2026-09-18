const orderService = require('../services/order.service');

class OrderController {
  async list(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const orders = await orderService.listOrders(tenantSlug);
      return res.json(orders);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const order = await orderService.getOrder(req.params.id, tenantSlug);
      return res.json(order);
    } catch (err) {
      next(err);
    }
  }

  async save(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const result = await orderService.saveOrder(req.body, tenantSlug);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateInstallment(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const result = await orderService.updateInstallment(req.params.id, req.body, tenantSlug);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const result = await orderService.deleteOrder(req.params.id, tenantSlug);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async duplicate(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const result = await orderService.duplicateOrder(req.params.id, tenantSlug);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getNextNumber(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const nextNumber = await orderService.getNextOrderNumber(tenantSlug);
      return res.json({ nextNumber });
    } catch (err) {
      next(err);
    }
  }

  async checkNumber(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const { numeroPedido } = req.params;
      const { excludeId } = req.query;
      const result = await orderService.checkNumeroAvailable(numeroPedido, excludeId, tenantSlug);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OrderController();
