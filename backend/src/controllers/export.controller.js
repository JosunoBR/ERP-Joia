const exportService = require('../services/export.service');

class ExportController {
  async exportExcel(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      let bodyData = req.body || {};
      if (typeof bodyData.payload === 'string') {
        try { bodyData = JSON.parse(bodyData.payload); } catch {}
      }
      const order = bodyData.order || bodyData;
      const stores = bodyData.stores || order.storeConfigs || [];
      const activeStores = stores.filter(s => s.active);

      const { buffer, filename } = exportService.generateExcel(order, activeStores);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  async exportPdf(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      let bodyData = req.body || {};
      if (typeof bodyData.payload === 'string') {
        try { bodyData = JSON.parse(bodyData.payload); } catch {}
      }
      const order = bodyData.order || bodyData;
      const stores = bodyData.stores || order.storeConfigs || [];
      const type = req.query.type || bodyData.type || order.exportType || 'order';

      const { buffer, filename } = (type === 'separation')
        ? exportService.generateSeparationPdf(order, stores)
        : exportService.generateCommercialOrderPdf(order);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  async exportSeparationPdf(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      let bodyData = req.body || {};
      if (typeof bodyData.payload === 'string') {
        try { bodyData = JSON.parse(bodyData.payload); } catch {}
      }
      const order = bodyData.order || bodyData;
      const stores = bodyData.stores || order.storeConfigs || [];

      const { buffer, filename } = exportService.generateSeparationPdf(order, stores);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ExportController();
