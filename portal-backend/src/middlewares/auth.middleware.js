const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'joiaerp_secure_jwt_secret_2026_production_key';

function portalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token de autenticação inválido ou expirado.' });
  }
}

function requireRoot(req, res, next) {
  if (!req.user || req.user.role !== 'root') {
    return res.status(403).json({ error: 'Acesso restrito ao administrador root.' });
  }
  next();
}

module.exports = {
  portalAuthMiddleware,
  requireRoot
};
