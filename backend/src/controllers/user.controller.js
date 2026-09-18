const userService = require('../services/user.service');

class UserController {
  async list(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const users = await userService.listUsers(tenantSlug);
      return res.json(users);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const user = await userService.getUser(req.params.id, tenantSlug);
      return res.json(user);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const user = await userService.createUser(req.body, tenantSlug);
      return res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const user = await userService.updateUser(req.params.id, req.body, tenantSlug);
      return res.json(user);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const tenantSlug = req.tenantSlug;
      const result = await userService.deleteUser(req.params.id, tenantSlug);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UserController();
