const supplierService = require('../services/supplier.service');

class SupplierController {
  async list(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const suppliers = await supplierService.listSuppliers(tenantSlug);
      return res.json(suppliers);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const supplier = await supplierService.getSupplier(req.params.id, tenantSlug);
      return res.json(supplier);
    } catch (err) {
      next(err);
    }
  }

  async save(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const result = await supplierService.saveSupplier(req.body, tenantSlug);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const result = await supplierService.deleteSupplier(req.params.id, tenantSlug);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SupplierController();
