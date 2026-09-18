const supplierRepository = require('../repositories/supplierRepository');
const productRepository = require('../repositories/productRepository');

class SupplierService {
  async listSuppliers(tenantSlug) {
    return await supplierRepository.findAll(tenantSlug);
  }

  async getSupplier(id, tenantSlug) {
    const supplier = await supplierRepository.findById(id, tenantSlug);
    if (!supplier) {
      const err = new Error('Fornecedor não encontrado.');
      err.statusCode = 404;
      throw err;
    }
    return supplier;
  }

  async saveSupplier(supplierData, tenantSlug) {
    if (!supplierData || !supplierData.razaoSocial || supplierData.razaoSocial.trim() === '') {
      const err = new Error('A Razão Social do fornecedor é obrigatória.');
      err.statusCode = 400;
      throw err;
    }

    const payload = {
      ...supplierData,
      id: supplierData.id || ('sup_' + Date.now()),
      razaoSocial: supplierData.razaoSocial.trim()
    };

    const saved = await supplierRepository.upsert(payload, tenantSlug);
    return {
      success: true,
      message: `Fornecedor "${saved.razaoSocial}" salvo com sucesso!`,
      supplier: saved
    };
  }

  async deleteSupplier(id, tenantSlug) {
    const existing = await supplierRepository.findById(id, tenantSlug);
    if (!existing) {
      const err = new Error('Fornecedor não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    // 1. Excluir produtos do catálogo vinculados a este fornecedor
    // (Produtos cadastrados para outros fornecedores e histórico de compras anteriores são preservados)
    await productRepository.deleteBySupplierId(id, existing.razaoSocial, tenantSlug);

    // 2. Excluir o cadastro do fornecedor
    await supplierRepository.delete(id, tenantSlug);

    return { 
      success: true, 
      message: `Fornecedor "${existing.razaoSocial}" e seus produtos vinculados foram excluídos com sucesso.` 
    };
  }
}

module.exports = new SupplierService();
