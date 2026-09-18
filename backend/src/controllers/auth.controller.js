const authService = require('../services/auth.service');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, senha, tenantSlug } = req.body;
      const result = await authService.login(email, senha, tenantSlug);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async me(req, res, next) {
    try {
      return res.json({
        user: req.user
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
