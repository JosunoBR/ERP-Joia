const rootService = require('../services/root.service');

class RootController {
  async getStats(req, res, next) {
    try {
      const stats = await rootService.getDashboardStats();
      return res.json(stats);
    } catch (err) {
      next(err);
    }
  }

  async listTenants(req, res, next) {
    try {
      const tenants = await rootService.listTenants();
      return res.json(tenants);
    } catch (err) {
      next(err);
    }
  }

  async toggleTenant(req, res, next) {
    try {
      const { id } = req.params;
      const result = await rootService.toggleTenantStatus(id);
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  async deleteTenant(req, res, next) {
    try {
      const { id } = req.params;
      const result = await rootService.deleteTenant(id);
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  async listUsers(req, res, next) {
    try {
      const users = await rootService.listAllUsers();
      return res.json(users);
    } catch (err) {
      next(err);
    }
  }

  async listModules(req, res, next) {
    try {
      const modules = await rootService.listModules();
      return res.json(modules);
    } catch (err) {
      next(err);
    }
  }

  async getTenantModules(req, res, next) {
    try {
      const { id } = req.params;
      const modules = await rootService.getTenantModules(id);
      return res.json(modules);
    } catch (err) {
      next(err);
    }
  }

  async updateTenantModules(req, res, next) {
    try {
      const { id } = req.params;
      const { moduleIds } = req.body;
      const modules = await rootService.updateTenantModules(id, moduleIds);
      return res.json(modules);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }
}

module.exports = new RootController();
