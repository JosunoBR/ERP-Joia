const productRepository = require('../repositories/productRepository');
const supplierRepository = require('../repositories/supplierRepository');

class ProductService {
  async listProducts(tenantSlug) {
    return await productRepository.findAll(tenantSlug);
  }

  async getProduct(id, tenantSlug) {
    const product = await productRepository.findById(id, tenantSlug);
    if (!product) {
      const err = new Error('Produto não encontrado.');
      err.statusCode = 404;
      throw err;
    }
    return product;
  }

  async saveProduct(productData, tenantSlug) {
    const rawCod = (productData?.codigoInterno || productData?.codigo || '').trim();
    if (!productData || !rawCod || !productData.descricao?.trim()) {
      const err = new Error('Código e descrição do produto são obrigatórios.');
      err.statusCode = 400;
      throw err;
    }

    const cleanCod = rawCod.toUpperCase();
    let supplierId = (productData.supplierId || productData.fornecedorPadraoId || '').trim();
    let nomeFornecedor = (productData.nomeFornecedor || productData.fornecedorPadraoNome || '').trim();

    // REGRA DE NEGÓCIO CRÍTICA: Nenhum produto pode ficar sem fornecedor
    if (!supplierId || !nomeFornecedor) {
      if (supplierId) {
        const sup = await supplierRepository.findById(supplierId, tenantSlug);
        if (sup) {
          nomeFornecedor = sup.razaoSocial || sup.nomeFantasia || '';
        }
      }
      if (!supplierId) {
        const sups = await supplierRepository.findAll(tenantSlug);
        if (sups.length > 0) {
          supplierId = sups[0].id;
          nomeFornecedor = sups[0].razaoSocial || sups[0].nomeFantasia || '';
        }
      }
    }

    const payload = {
      ...productData,
      id: productData.id || ('prod_' + Date.now()),
      codigo: cleanCod,
      codigoInterno: cleanCod,
      descricao: productData.descricao.trim(),
      fotoUrl: productData.fotoUrl !== undefined ? productData.fotoUrl : '',
      supplierId,
      nomeFornecedor
    };

    const saved = await productRepository.upsert(payload, tenantSlug);
    return {
      success: true,
      message: `Produto "${saved.descricao}" salvo com sucesso!`,
      product: saved
    };
  }

  async deleteProduct(id, tenantSlug) {
    await this.getProduct(id, tenantSlug);
    await productRepository.delete(id, tenantSlug);
    return { success: true, message: 'Produto removido com sucesso.' };
  }

  async saveBatchProducts(productsList, tenantSlug) {
    if (!Array.isArray(productsList) || productsList.length === 0) {
      return { success: true, count: 0, products: [] };
    }

    const allSups = await supplierRepository.findAll(tenantSlug);
    const defaultSup = allSups.length > 0 ? allSups[0] : null;

    const savedList = [];
    for (const prod of productsList) {
      if (!prod || !prod.descricao || prod.descricao.trim().length === 0) continue;
      const cod = (prod.codigoInterno || prod.codigo || '').trim().toUpperCase();
      if (!cod) continue;

      let supplierId = (prod.supplierId || prod.fornecedorPadraoId || '').trim();
      let nomeFornecedor = (prod.nomeFornecedor || prod.fornecedorPadraoNome || '').trim();

      // Garantir fornecedor vinculado
      if (!supplierId && defaultSup) {
        supplierId = defaultSup.id;
        nomeFornecedor = defaultSup.razaoSocial || defaultSup.nomeFantasia || '';
      } else if (supplierId && !nomeFornecedor) {
        const matched = allSups.find(s => s.id === supplierId);
        if (matched) {
          nomeFornecedor = matched.razaoSocial || matched.nomeFantasia || '';
        }
      }

      const payload = {
        ...prod,
        id: prod.id || ('prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
        codigo: cod,
        codigoInterno: cod,
        descricao: prod.descricao.trim(),
        supplierId,
        nomeFornecedor
      };

      try {
        const saved = await productRepository.upsert(payload, tenantSlug);
        if (saved) savedList.push(saved);
      } catch (err) {
        console.error('Erro ao salvar produto em lote:', err.message);
      }
    }
    return { success: true, count: savedList.length, products: savedList };
  }

  async syncCatalog(tenantSlug) {
    const { getDatabase, saveDatabaseToDisk } = require('../config/database');
    const { runFullDatabaseSeed } = require('../config/seedData');
    const db = await getDatabase();
    runFullDatabaseSeed(db);
    saveDatabaseToDisk();
    return await productRepository.findAll(tenantSlug);
  }
}

module.exports = new ProductService();
