const jwt = require('jsonwebtoken');
const config = require('../config/environment');

/**
 * Middleware Multi-Tenant — Jóia ERP
 * Extrai o tenantSlug do JWT do usuário autenticado e injeta em req.tenantSlug.
 * Todas as operações de banco de dados usam req.tenantSlug para isolar os dados.
 */
function tenantMiddleware(req, res, next) {
  // 1. Extraído do token JWT já validado anteriormente
  let tenantSlug = req.user?.tenantSlug;

  // 2. Ou do cabeçalho HTTP customizado X-Tenant-Slug
  if (!tenantSlug && req.headers['x-tenant-slug']) {
    tenantSlug = req.headers['x-tenant-slug'];
  }

  // 3. Fallback inteligente: decodifica o Bearer token se req.user ainda não foi populado
  if (!tenantSlug && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    const token = req.headers.authorization.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      if (decoded?.tenantSlug) {
        tenantSlug = decoded.tenantSlug;
        if (!req.user) req.user = decoded;
      }
    } catch {
      // Ignora erro aqui; se for inválido, o authMiddleware posterior irá barrar com 401
      const decodedUnverified = jwt.decode(token);
      if (decodedUnverified?.tenantSlug) {
        tenantSlug = decodedUnverified.tenantSlug;
      }
    }
  }

  // 4. Ou de query parameter
  if (!tenantSlug && req.query?.tenantSlug) {
    tenantSlug = req.query.tenantSlug;
  }

  if (!tenantSlug) {
    return res.status(400).json({
      error: 'Tenant não identificado. Forneça o token de acesso ou o cabeçalho X-Tenant-Slug.'
    });
  }

  // Sanitizar tenantSlug (apenas alfanumérico e hífens/underscores)
  req.tenantSlug = String(tenantSlug).toLowerCase().replace(/[^a-z0-9_-]/g, '');
  next();
}

module.exports = {
  tenantMiddleware
};
