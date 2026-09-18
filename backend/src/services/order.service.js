const orderRepository = require('../repositories/orderRepository');
const fiscalRepository = require('../repositories/fiscalRepository');

class OrderService {
  async listOrders(tenantSlug) {
    return await orderRepository.findAll(tenantSlug);
  }

  async getOrder(id, tenantSlug) {
    const order = await orderRepository.findById(id, tenantSlug);
    if (!order) {
      const err = new Error('Pedido não encontrado.');
      err.statusCode = 404;
      throw err;
    }
    return order;
  }

  /**
   * Valida a integridade financeira das parcelas do pedido antes da persistência
   */
  _validateInstallmentsIntegrity(orderData) {
    const installments = orderData.installments;
    if (!Array.isArray(installments) || installments.length === 0) {
      return;
    }

    let sumInstallments = 0;
    installments.forEach((inst, index) => {
      const valor = Number(inst.valor);
      if (isNaN(valor) || valor < 0) {
        const err = new Error(`Parcela ${inst.numeroParcela || index + 1} contém valor inválido: ${inst.valor}`);
        err.statusCode = 400;
        throw err;
      }
      if (!inst.dataVencimento) {
        const err = new Error(`Parcela ${inst.numeroParcela || index + 1} está sem data de vencimento.`);
        err.statusCode = 400;
        throw err;
      }
      sumInstallments += valor;
    });

    // Se houver total de mercadorias / itens e o pedido não for um rascunho
    if (!orderData.header?.isDraft && Array.isArray(orderData.items) && orderData.items.length > 0) {
      let brutoSum = 0;
      let ipiSum = 0;
      let descSum = 0;
      orderData.items.forEach(item => {
        if (item.ruptura) return;
        const pecas = Number(item.qtdTotalUnidades || 0);
        const preco = Number(item.precoUnitario || 0);
        const bruto = Number(item.valorTotalBruto !== undefined ? item.valorTotalBruto : (pecas * preco));
        brutoSum += bruto;
        ipiSum += Number(item.valorIpi || 0);
        descSum += Number(item.valorDescontoItem || 0);
      });

      const headerDesc = Number(orderData.header.descontoComercialTotal || 0);
      const totalDesconto = descSum > 0 ? descSum : headerDesc;
      // Regra Oficial Central: Total (Bruto) + IPI - Desconto Comercial = Total Geral
      const expectedTotal = Number(Math.max(0, brutoSum + ipiSum - totalDesconto).toFixed(2));

      if (sumInstallments > 1 && expectedTotal > 1) {
        const diff = Math.abs(sumInstallments - expectedTotal);
        if (diff > 5.0 && !orderData.header.percentualDescontoOff && !orderData.header.descontoComercialTotal) {
          console.warn(`[Auditoria Financeira] Divergência no pedido ${orderData.header.numeroPedido}: Soma parcelas (R$ ${sumInstallments.toFixed(2)}) vs Total Calculado (R$ ${expectedTotal.toFixed(2)})`);
        }
      }
    }
  }

  async saveOrder(orderData, tenantSlug) {
    if (!orderData || !orderData.header || !orderData.header.numeroPedido) {
      const err = new Error('Dados do pedido inválidos: número do pedido é obrigatório.');
      err.statusCode = 400;
      throw err;
    }

    // Validação de integridade financeira antes de salvar
    this._validateInstallmentsIntegrity(orderData);

    const saved = await orderRepository.save(orderData, tenantSlug);

    // Sincronização automática em tempo real com o Financeiro / Contas a Pagar
    try {
      const financialService = require('./financialService');
      await financialService.syncSingleOrder(saved, tenantSlug);
    } catch (finErr) {
      console.error('Erro ao sincronizar pedido com o financeiro:', finErr);
    }

    return {
      success: true,
      message: `Pedido ${orderData.header.numeroPedido} salvo com sucesso no SQLite!`,
      order: saved
    };
  }

  async updateInstallment(orderId, updatedInstallment, tenantSlug) {
    if (!updatedInstallment) {
      const err = new Error('Dados da parcela são obrigatórios.');
      err.statusCode = 400;
      throw err;
    }

    const valor = Number(updatedInstallment.valor);
    if (isNaN(valor) || valor < 0) {
      const err = new Error(`Valor da parcela inválido: ${updatedInstallment.valor}`);
      err.statusCode = 400;
      throw err;
    }

    const order = await orderRepository.findById(orderId, tenantSlug);
    if (!order) {
      const err = new Error('Pedido não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    let installments = order.installments || [];
    const idx = installments.findIndex(i => i.numeroParcela === updatedInstallment.numeroParcela);

    if (idx >= 0) {
      installments[idx] = updatedInstallment;
    } else {
      installments.push(updatedInstallment);
    }

    const updated = await orderRepository.updateInstallments(orderId, installments, tenantSlug);

    // Sincronização automática em tempo real com o Financeiro
    try {
      const financialService = require('./financialService');
      await financialService.syncSingleOrder(updated, tenantSlug);
    } catch (finErr) {
      console.error('Erro ao sincronizar parcela com o financeiro:', finErr);
    }

    return {
      success: true,
      message: `Parcela ${updatedInstallment.numeroParcela}ª atualizada com sucesso!`,
      order: updated
    };
  }

  async deleteOrder(id, tenantSlug) {
    const existing = await orderRepository.findById(id, tenantSlug);
    if (!existing) {
      const err = new Error('Pedido não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    const financialRepo = require('../repositories/financialRepository');

    // 🛡️ Regra de Bloqueio Contábil: impede exclusão se houver parcelas/títulos já baixados como 'Pago'
    try {
      const entries = await financialRepo.findByOrderId(id, tenantSlug);
      const paidEntries = (entries || []).filter(e => e.status === 'Pago');
      if (paidEntries.length > 0) {
        const err = new Error(
          `Não é possível excluir o pedido ${existing.header.numeroPedido}. Existem ${paidEntries.length} parcela(s)/título(s) com status 'Pago' no financeiro. Para manter a rastreabilidade contábil, altere o status do pedido para 'Cancelado'.`
        );
        err.statusCode = 409;
        throw err;
      }
    } catch (checkErr) {
      if (checkErr.statusCode === 409) throw checkErr;
      console.warn('Aviso ao verificar status financeiro do pedido:', checkErr.message);
    }

    await orderRepository.delete(id, tenantSlug);

    // Remove lançamentos financeiros vinculados ao pedido (não pagos)
    try {
      await financialRepo.deleteByOrderId(id, tenantSlug);
    } catch (finErr) {
      console.error('Erro ao remover lançamentos financeiros do pedido:', finErr);
    }

    return { success: true, message: `Pedido ${existing.header.numeroPedido} excluído com sucesso.` };
  }

  async duplicateOrder(id, tenantSlug) {
    const duplicated = await orderRepository.duplicate(id, tenantSlug);
    return {
      success: true,
      message: `Pedido duplicado com sucesso: ${duplicated.header.numeroPedido}`,
      order: duplicated
    };
  }

  async getNextOrderNumber(tenantSlug) {
    return await orderRepository.getNextNumeroPedido(tenantSlug);
  }

  async checkNumeroAvailable(numeroPedido, excludeId = null, tenantSlug) {
    if (!numeroPedido) return { available: false, message: 'Número é obrigatório.' };
    const num = String(numeroPedido).trim();
    const existing = await orderRepository.findByNumero(num, tenantSlug);
    if (existing && existing.header.id !== excludeId) {
      return {
        available: false,
        conflictId: existing.header.id,
        conflictFornecedor: existing.header.fornecedor,
        message: `O número "${num}" já está em uso pelo pedido do fornecedor "${existing.header.fornecedor}".`
      };
    }
    return { available: true, message: `O número "${num}" está disponível.` };
  }
}

module.exports = new OrderService();
