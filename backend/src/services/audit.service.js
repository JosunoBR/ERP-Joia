const auditRepository = require('../repositories/auditRepository');

class AuditService {
  async listLogs(orderId, tenantSlug) {
    if (orderId) {
      return await auditRepository.findByOrderId(orderId, tenantSlug);
    }
    return await auditRepository.findAll(tenantSlug);
  }

  async logSeparation(logData, tenantSlug) {
    if (!logData || !logData.orderId || !logData.numeroPedido) {
      const err = new Error('ID e número do pedido são obrigatórios para auditoria.');
      err.statusCode = 400;
      throw err;
    }

    await auditRepository.create(logData, tenantSlug);
    return {
      success: true,
      message: 'Log de auditoria registrado com sucesso.'
    };
  }
}

module.exports = new AuditService();
