const auditService = require('../services/audit.service');

class AuditController {
  async list(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const logs = await auditService.listLogs(req.query.orderId, tenantSlug);
      return res.json(logs);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const logData = {
        ...req.body,
        conferenteId: req.user?.id || req.body.conferenteId,
        conferenteNome: req.user?.nome || req.body.conferenteNome
      };
      const result = await auditService.logSeparation(logData, tenantSlug);
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuditController();
