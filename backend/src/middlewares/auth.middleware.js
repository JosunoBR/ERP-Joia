const jwt = require('jsonwebtoken');
const config = require('../config/environment');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Acesso não autorizado. Token de autenticação não fornecido.' 
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    // Se o token for inválido ou expirado
    return res.status(401).json({ 
      error: 'Token de autenticação inválido ou expirado. Por favor faça login novamente.' 
    });
  }
}

// Middleware opcional (se houver token decodifica, mas não bloqueia a requisição)
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, config.JWT_SECRET);
    } catch {
      // Ignora erro no opcional
    }
  }
  next();
}

module.exports = {
  authMiddleware,
  optionalAuth
};
