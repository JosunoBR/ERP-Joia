const productService = require('../services/product.service');

class ProductController {
  async list(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const products = await productService.listProducts(tenantSlug);
      return res.json(products);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const product = await productService.getProduct(req.params.id, tenantSlug);
      return res.json(product);
    } catch (err) {
      next(err);
    }
  }

  async save(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const result = await productService.saveProduct(req.body, tenantSlug);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const result = await productService.deleteProduct(req.params.id, tenantSlug);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async saveBatch(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const result = await productService.saveBatchProducts(req.body, tenantSlug);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async syncCatalog(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const products = await productService.syncCatalog(tenantSlug);
      return res.json(products);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProductController();
