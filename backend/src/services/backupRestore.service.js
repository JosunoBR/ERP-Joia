const { getTenantDatabase, saveTenantDatabaseToDisk } = require('../config/database');

class BackupRestoreService {
  async restoreFromBackupData(rawBackup, tenantSlug) {
    if (!tenantSlug) {
      throw new Error('tenantSlug é obrigatório para restaurar dados.');
    }
    if (!rawBackup || typeof rawBackup !== 'object') {
      throw new Error('Formato de backup inválido. Esperado objeto JSON.');
    }

    const db = await getTenantDatabase(tenantSlug);
    const now = new Date().toISOString();

    let backup = rawBackup;
    if (rawBackup.backupData && typeof rawBackup.backupData === 'object') {
      backup = rawBackup.backupData;
    }

    const parseKey = (key, fallback = null) => {
      const val = backup[key];
      if (!val) return fallback;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return fallback; }
      }
      return val;
    };

    // 1. Extrair coleções do backup
    const ordersList = parseKey('saved_orders_v1') || parseKey('joia_saved_orders_v1') || parseKey('mega12_saved_orders_v1') || parseKey('orders') || [];
    const currentOrder = parseKey('current_order_v1') || parseKey('joia_current_order_v1') || parseKey('mega12_current_order_v1') || null;
    const productsList = parseKey('products_v1') || parseKey('joia_products_v1') || parseKey('mega12_products_v1') || parseKey('products') || [];
    const suppliersList = parseKey('suppliers_v1') || parseKey('joia_suppliers_v1') || parseKey('mega12_suppliers_v1') || parseKey('suppliers') || [];
    const paymentConds = parseKey('payment_conditions') || parseKey('joia_payment_conditions') || parseKey('mega12_payment_conditions') || [];

    // 2. Restaurar Fornecedores
    const supplierMap = new Map();

    if (Array.isArray(suppliersList)) {
      suppliersList.forEach(s => {
        const name = s.razaoSocial || s.nomeFantasia;
        if (name) {
          supplierMap.set(name.toUpperCase().trim(), {
            id: s.id || `sup_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            razaoSocial: name.trim(),
            nomeFantasia: s.nomeFantasia || name.trim(),
            cnpj: s.cnpj || '',
            vendedorPadrao: s.vendedorPadrao || '',
            contatoVendedor: s.contatoVendedor || '',
            condicaoPagamentoPadrao: s.condicaoPagamentoPadrao || '30/60/90 Dias'
          });
        }
      });
    }

    const allOrdersToScan = [...ordersList];
    if (currentOrder && currentOrder.header?.fornecedor) {
      allOrdersToScan.push(currentOrder);
    }

    allOrdersToScan.forEach(o => {
      const name = o.header?.fornecedor?.trim();
      if (name && !supplierMap.has(name.toUpperCase())) {
        supplierMap.set(name.toUpperCase(), {
          id: o.header.supplierId || `sup_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          razaoSocial: name,
          nomeFantasia: name,
          cnpj: o.header.cnpj || '',
          vendedorPadrao: o.header.vendedor || '',
          contatoVendedor: o.header.contatoVendedor || '',
          condicaoPagamentoPadrao: o.header.condicaoPagamento || '30/60/90 Dias'
        });
      }
    });

    if (Array.isArray(productsList)) {
      productsList.forEach(p => {
        const name = p.nomeFornecedor?.trim();
        if (name && !supplierMap.has(name.toUpperCase())) {
          supplierMap.set(name.toUpperCase(), {
            id: p.supplierId || `sup_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            razaoSocial: name,
            nomeFantasia: name,
            cnpj: '',
            vendedorPadrao: '',
            contatoVendedor: '',
            condicaoPagamentoPadrao: '30/60/90 Dias'
          });
        }
      });
    }

    let restoredSuppliersCount = 0;
    for (const sup of supplierMap.values()) {
      const check = db.exec(`SELECT id FROM suppliers WHERE razaoSocial = ? OR id = ?`, [sup.razaoSocial, sup.id]);
      if (!check[0] || check[0].values.length === 0) {
        db.run(`
          INSERT INTO suppliers (
            id, razaoSocial, nomeFantasia, cnpj, vendedorPadrao, contatoVendedor, 
            condicaoPagamentoPadrao, aliquotaStPadrao, aliquotaIpiPadrao, descontoOffPadrao, 
            createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)
        `, [sup.id, sup.razaoSocial, sup.nomeFantasia, sup.cnpj, sup.vendedorPadrao, sup.contatoVendedor, sup.condicaoPagamentoPadrao, now, now]);
        restoredSuppliersCount++;
      }
    }

    // 3. Restaurar Produtos
    let restoredProductsCount = 0;
    if (Array.isArray(productsList)) {
      for (const prod of productsList) {
        const check = db.exec(`SELECT id FROM products WHERE id = ? OR codigo = ?`, [prod.id || prod.codigo, prod.codigo]);
        const supId = prod.supplierId || (prod.nomeFornecedor ? supplierMap.get(prod.nomeFornecedor.toUpperCase().trim())?.id : '');
        if (!check[0] || check[0].values.length === 0) {
          const prodId = prod.id || `prd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          db.run(`
            INSERT INTO products (
              id, codigo, descricao, categoria, subcategoria, fornecedorPadraoId, fornecedorPadraoNome,
              precoUnitarioPadrao, pdvSugerido, qtdPorPacote, fotoUrl, ncm, eanBarcode, ativo, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
          `, [
            prodId,
            prod.codigo || `COD-${Date.now()}`,
            prod.descricao || 'Produto Sem Descrição',
            prod.categoria || 'Geral',
            prod.subcategoria || '',
            supId || '',
            prod.nomeFornecedor || '',
            Number(prod.precoUnitarioPadrao || prod.precoUnitario || 0),
            Number(prod.pdvSugerido || 0),
            Number(prod.qtdPorPacote || prod.qtdNoPacote || 1),
            prod.fotoUrl || '',
            prod.ncm || '',
            prod.eanBarcode || prod.codigoBarras || '',
            now,
            now
          ]);
          restoredProductsCount++;
        }
      }
    }

    // 4. Restaurar Condições de Pagamento
    let restoredPayCondCount = 0;
    if (Array.isArray(paymentConds)) {
      for (const cond of paymentConds) {
        const check = db.exec(`SELECT id FROM payment_conditions WHERE id = ? OR descricao = ?`, [cond.id, cond.descricao]);
        if (!check[0] || check[0].values.length === 0) {
          db.run(`
            INSERT INTO payment_conditions (
              id, descricao, qtdParcelas, parcelasDiasJson, especie, banco, ativo, padrao, observacao, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            cond.id || `cond_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            cond.descricao || 'Condição',
            Number(cond.qtdParcelas || 1),
            typeof cond.parcelasDiasJson === 'string' ? cond.parcelasDiasJson : JSON.stringify(cond.parcelasDias || [30]),
            cond.especie || 'Boleto',
            cond.banco || '',
            cond.ativo !== undefined ? (cond.ativo ? 1 : 0) : 1,
            cond.padrao ? 1 : 0,
            cond.observacao || '',
            now,
            now
          ]);
          restoredPayCondCount++;
        }
      }
    }

    // 5. Restaurar Pedidos
    let restoredOrdersCount = 0;
    const orderRepository = require('../repositories/orderRepository');
    for (const ord of allOrdersToScan) {
      if (!ord || !ord.header || !ord.header.numeroPedido) continue;
      try {
        await orderRepository.save(ord, tenantSlug);
        restoredOrdersCount++;
      } catch (err) {
        console.warn(`[Restore] Erro ao restaurar pedido ${ord.header?.numeroPedido}:`, err.message);
      }
    }

    saveTenantDatabaseToDisk(tenantSlug, db);

    return {
      success: true,
      message: `Backup restaurado com sucesso para o tenant ${tenantSlug}!`,
      restoredSuppliersCount,
      restoredProductsCount,
      restoredPayCondCount,
      restoredOrdersCount
    };
  }

  async exportBackupData(tenantSlug) {
    if (!tenantSlug) {
      throw new Error('tenantSlug é obrigatório para exportar dados.');
    }

    const orderRepository = require('../repositories/orderRepository');
    const productRepository = require('../repositories/productRepository');
    const supplierRepository = require('../repositories/supplierRepository');
    const fiscalRepository = require('../repositories/fiscalRepository');
    const stockRepository = require('../repositories/stockRepository');
    const paymentConditionRepository = require('../repositories/paymentConditionRepository');
    const separationPresetRepository = require('../repositories/separationPresetRepository');
    const fiscalPresetRepository = require('../repositories/fiscalPresetRepository');

    const [
      orders,
      products,
      suppliers,
      fiscalConfig,
      stores,
      stockItems,
      paymentConditions,
      separationPresets,
      fiscalPresets
    ] = await Promise.all([
      orderRepository.findAll(tenantSlug).catch(() => []),
      productRepository.findAll(tenantSlug).catch(() => []),
      supplierRepository.findAll(tenantSlug).catch(() => []),
      fiscalRepository.getFiscalConfig(tenantSlug).catch(() => null),
      fiscalRepository.getStores(tenantSlug).catch(() => []),
      stockRepository.findAll(tenantSlug).catch(() => []),
      paymentConditionRepository.findAll(tenantSlug).catch(() => []),
      separationPresetRepository.findAll(tenantSlug).catch(() => []),
      fiscalPresetRepository.findAll(tenantSlug).catch(() => [])
    ]);

    return {
      tenantSlug,
      saved_orders_v1: JSON.stringify(orders),
      products_v1: JSON.stringify(products),
      suppliers_v1: JSON.stringify(suppliers),
      fiscal_config_v1: fiscalConfig ? JSON.stringify(fiscalConfig) : '',
      stores_v1: JSON.stringify(stores),
      stock_items_v1: JSON.stringify(stockItems),
      payment_conditions: JSON.stringify(paymentConditions),
      separation_presets: JSON.stringify(separationPresets),
      fiscal_presets: JSON.stringify(fiscalPresets),
      // Aliases para retrocompatibilidade com backups legados
      mega12_saved_orders_v1: JSON.stringify(orders),
      mega12_products_v1: JSON.stringify(products),
      mega12_suppliers_v1: JSON.stringify(suppliers),
      exportedAt: new Date().toISOString(),
      source: `SQLite ${tenantSlug}.db`
    };
  }
}

module.exports = new BackupRestoreService();
