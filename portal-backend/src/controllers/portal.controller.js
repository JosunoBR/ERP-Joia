const portalService = require('../services/portal.service');

class PortalController {
  async register(req, res, next) {
    try {
      const { company, owner } = req.body;
      if (!company || !owner) {
        return res.status(400).json({ error: 'Dados da empresa e do proprietário são obrigatórios.' });
      }

      const result = await portalService.registerTenant(company, owner);
      return res.status(201).json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  async login(req, res, next) {
    try {
      const { email, senha } = req.body;
      const result = await portalService.login(email, senha);
      return res.json(result);
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }
  }

  async getTenantConfig(req, res, next) {
    try {
      const { slug } = req.params;
      const result = await portalService.getTenantPublicConfig(slug);
      return res.json(result);
    } catch (err) {
      return res.status(404).json({ error: err.message });
    }
  }
}

module.exports = new PortalController();
