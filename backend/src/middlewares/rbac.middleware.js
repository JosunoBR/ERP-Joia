/**
 * Middleware para controle de acesso baseado em papéis (Role-Based Access Control)
 * @param  {...string} allowedRoles - Ex: 'owner', 'comprador', 'conferente'
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Acesso não autorizado. Identificação do usuário ausente.' 
      });
    }

    const userRole = req.user.role;

    // Owner (proprietário do tenant) possui acesso irrestrito a todas as operações do ERP
    if (userRole === 'owner') {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: `Acesso negado. Seu perfil (${userRole}) não tem permissão para executar esta operação.` 
      });
    }

    return next();
  };
}

module.exports = {
  requireRole
};
