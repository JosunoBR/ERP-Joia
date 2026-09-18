import { PurchaseOrder, FiscalConfig, FiscalPreset, StoreConfig, Supplier, Product, CentralStockItem, OrderItem, SeparationPreset } from '../shared/types';
import { DEFAULT_FISCAL_CONFIG, DEFAULT_FISCAL_PRESETS, DEFAULT_STORES } from '../shared/constants';
import { calculateItemFiscal } from '../shared/fiscalEngine';
import { calculateAutomaticSeparation } from '../shared/separationEngine';
import { maskPhone } from './masks';

const STORAGE_KEYS = {
  CURRENT_ORDER: 'erp_current_order_v1',
  SAVED_ORDERS: 'erp_saved_orders_v1',
  GLOBAL_FISCAL: 'erp_global_fiscal_v1',
  GLOBAL_STORES: 'erp_global_stores_v1',
  SUPPLIERS: 'erp_suppliers_v1',
  PRODUCTS: 'erp_products_v1',
  CENTRAL_STOCK: 'erp_central_stock_v1',
  ORDER_SEQUENCE: 'erp_order_sequence_v1',
  SEPARATION_PRESETS: 'erp_separation_presets_v1',
  FISCAL_PRESETS: 'erp_fiscal_presets_v1',
  THEME: 'erp_theme_v1'
};

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    const isQuota = err?.name === 'QuotaExceededError' || 
                    err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' || 
                    err?.message?.toLowerCase().includes('quota') ||
                    err?.code === 22 || 
                    err?.code === 1014;

    if (!isQuota) {
      console.warn(`[storage] Erro ao salvar chave "${key}":`, err);
      return false;
    }

    console.warn(`[storage] Cota de 5MB do localStorage atingida ao salvar "${key}". Aplicando limpeza defensiva...`);

    try {
      if (key === STORAGE_KEYS.SAVED_ORDERS) {
        try {
          const list: PurchaseOrder[] = JSON.parse(value);
          const sanitizedList = list.slice(0, 30).map(ord => ({
            ...ord,
            items: (ord.items || []).map(it => ({
              ...it,
              fotoUrl: (it.fotoUrl && it.fotoUrl.startsWith('data:') && it.fotoUrl.length > 500) ? '' : it.fotoUrl
            }))
          }));
          localStorage.setItem(key, JSON.stringify(sanitizedList));
          return true;
        } catch {}
      }

      if (key === STORAGE_KEYS.CURRENT_ORDER) {
        try {
          const ord: PurchaseOrder = JSON.parse(value);
          const sanitized = {
            ...ord,
            items: (ord.items || []).map(it => ({
              ...it,
              fotoUrl: (it.fotoUrl && it.fotoUrl.startsWith('data:') && it.fotoUrl.length > 500) ? '' : it.fotoUrl
            }))
          };
          localStorage.setItem(key, JSON.stringify(sanitized));
          return true;
        } catch {}
      }

      localStorage.removeItem(STORAGE_KEYS.CURRENT_ORDER);
      localStorage.setItem(key, value);
      return true;
    } catch (fallbackErr) {
      console.error(`[storage] Falha crítica ao persistir "${key}" mesmo após mitigação:`, fallbackErr);
      return false;
    }
  }
}

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_SUPPLIERS: Supplier[] = [];

/**
 * Gera o próximo número sequencial do pedido no formato PED-0001, PED-0002...
 */
export function getNextOrderNumber(customOrdersList?: PurchaseOrder[]): string {
  try {
    const savedOrders = customOrdersList && Array.isArray(customOrdersList)
      ? customOrdersList
      : loadSavedOrdersList();
    let maxNum = 0;
    
    savedOrders.forEach(o => {
      const match = o.header?.numeroPedido?.match(/PED-(\d+)/i) || o.header?.numeroPedido?.match(/(\d+)/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    const storedSeq = localStorage.getItem(STORAGE_KEYS.ORDER_SEQUENCE);
    const seqNum = storedSeq ? parseInt(storedSeq, 10) : 0;
    const nextNum = Math.max(maxNum, seqNum) + 1;
    
    localStorage.setItem(STORAGE_KEYS.ORDER_SEQUENCE, nextNum.toString());
    return `PED-${String(nextNum).padStart(4, '0')}`;
  } catch {
    return 'PED-0001';
  }
}

export const LEGACY_DEFAULT_OBSERVACOES = [
  'Entregar com paletização padrão PBR no Depósito Central.',
  'Entregar com paletização padrão no Depósito Central.',
  'Descarga das 08h às 16h no Depósito.',
  'Descarga das 08h às 16h no Depósito Central.',
  'Paletes padrão PBR. Agendar entrega com 24h de antecedência.',
  'Descarga em paletes padrão PBR no Depósito Central.',
  'Descarga no CD.'
];

export function getSuppliersList(): Supplier[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
    const list: Supplier[] = saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
    return list.map(s => {
      let parsedPadrao = s.pedidoPadrao;
      if (!parsedPadrao && s.pedidoPadraoJson) {
        try {
          parsedPadrao = JSON.parse(s.pedidoPadraoJson);
        } catch {}
      }
      let obs = s.observacoesDescarga || '';
      if (LEGACY_DEFAULT_OBSERVACOES.includes(obs.trim())) {
        obs = '';
      }
      return {
        ...s,
        contatoVendedor: s.contatoVendedor ? maskPhone(s.contatoVendedor) : s.contatoVendedor,
        telefoneEmpresa: s.telefoneEmpresa ? maskPhone(s.telefoneEmpresa) : s.telefoneEmpresa,
        observacoesDescarga: obs,
        pedidoPadrao: parsedPadrao
      };
    });
  } catch {
    return INITIAL_SUPPLIERS;
  }
}

export function saveSuppliersList(suppliers: Supplier[]): void {
  localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
}

export function saveSupplier(supplier: Supplier): Supplier[] {
  const list = getSuppliersList();
  const index = list.findIndex(s => s.id === supplier.id);
  let updatedList: Supplier[];
  
  const pedidoPadraoJson = supplier.pedidoPadraoJson || (supplier.pedidoPadrao ? JSON.stringify(supplier.pedidoPadrao) : undefined);
  const normalizedSupplier: Supplier = {
    ...supplier,
    pedidoPadraoJson
  };
  
  if (index >= 0) {
    updatedList = [...list];
    updatedList[index] = { ...normalizedSupplier, updatedAt: new Date().toISOString() };
  } else {
    updatedList = [
      {
        ...normalizedSupplier,
        id: normalizedSupplier.id || 'sup_' + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      ...list
    ];
  }
  saveSuppliersList(updatedList);
  return updatedList;
}

export function deleteSupplier(supplierId: string): Supplier[] {
  const currentSuppliers = getSuppliersList();
  const targetSupplier = currentSuppliers.find(s => s.id === supplierId);
  const razaoSocial = targetSupplier?.razaoSocial;

  // 1. Remove o fornecedor
  const list = currentSuppliers.filter(s => s.id !== supplierId);
  saveSuppliersList(list);

  // 2. Remove produtos vinculados a este fornecedor do catálogo
  // (produtos vinculados a outros fornecedores e histórico de pedidos são preservados)
  const currentProducts = getProductsList();
  const remainingProducts = currentProducts.filter(p => {
    const belongsToSupplier = p.supplierId === supplierId || (razaoSocial && p.nomeFornecedor === razaoSocial);
    return !belongsToSupplier;
  });
  saveProductsList(remainingProducts);

  return list;
}

export function getProductsList(): Product[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    let list: Product[] = saved !== null ? JSON.parse(saved) : INITIAL_PRODUCTS;
    // Normalizar campos de código e travar PDV Sugerido na regra de negócio da Jóia ERP (R$ 12,00 Fixo)
    return list.map(p => {
      const codigoInterno = p.codigoInterno || p.codigo || 'PRD-000';
      const codigoBarras = p.codigoBarras || p.eanBarcode || '';
      return {
        ...p,
        codigoInterno,
        codigo: codigoInterno,
        codigoFornecedor: p.codigoFornecedor || '',
        codigoBarras,
        eanBarcode: codigoBarras,
        pdvSugerido: 12.00
      };
    });
  } catch {
    return INITIAL_PRODUCTS;
  }
}

export function saveProductsList(products: Product[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  } catch (err) {
    console.warn('Aviso: Limite de armazenamento local excedido, produtos preservados no banco SQLite:', err);
  }
}

export function saveProduct(product: Product): Product[] {
  const list = getProductsList();
  const codInterno = (product.codigoInterno || product.codigo || '').trim().toLowerCase();
  const desc = (product.descricao || '').trim().toLowerCase();
  
  const index = list.findIndex(p => {
    if (p.id === product.id) return true;
    const pCod = (p.codigoInterno || p.codigo || '').trim().toLowerCase();
    const pDesc = (p.descricao || '').trim().toLowerCase();
    if (codInterno && pCod && codInterno === pCod) return true;
    if (desc && pDesc && desc === pDesc) return true;
    return false;
  });

  const existing = index >= 0 ? list[index] : null;
  const targetId = existing ? existing.id : (product.id || 'prod_' + Date.now());

  const normalized: Product = {
    ...product,
    id: targetId,
    codigoInterno: product.codigoInterno || product.codigo || existing?.codigoInterno || `PRD-${Date.now()}`,
    codigo: product.codigoInterno || product.codigo || existing?.codigo || `PRD-${Date.now()}`,
    codigoFornecedor: product.codigoFornecedor || existing?.codigoFornecedor || '',
    codigoBarras: product.codigoBarras || product.eanBarcode || existing?.codigoBarras || '',
    eanBarcode: product.codigoBarras || product.eanBarcode || existing?.eanBarcode || '',
    descricao: (product.descricao || '').trim(),
    categoria: product.categoria || existing?.categoria || 'Geral',
    fotoUrl: product.fotoUrl || existing?.fotoUrl || '',
    qtdPorPacote: Math.max(1, Number(product.qtdPorPacote || existing?.qtdPorPacote || 1)),
    precoUnitarioPadrao: product.precoUnitarioPadrao > 0 ? product.precoUnitarioPadrao : (existing?.precoUnitarioPadrao || 0),
    pdvSugerido: product.pdvSugerido || existing?.pdvSugerido || 0,
    ncm: product.ncm || existing?.ncm || '',
    supplierId: product.supplierId || existing?.supplierId || '',
    nomeFornecedor: product.nomeFornecedor || existing?.nomeFornecedor || '',
    ativo: true,
    createdAt: existing?.createdAt || product.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  let updatedList: Product[];
  if (index >= 0) {
    updatedList = [...list];
    updatedList[index] = normalized;
  } else {
    updatedList = [normalized, ...list];
  }
  saveProductsList(updatedList);
  return updatedList;
}

export function saveBatchProductsToStorage(productsToSave: Product[]): Product[] {
  let currentList = getProductsList();
  for (const prod of productsToSave) {
    if (!prod || !prod.descricao || prod.descricao.trim().length === 0) continue;
    const codInterno = (prod.codigoInterno || prod.codigo || '').trim().toLowerCase();
    const desc = (prod.descricao || '').trim().toLowerCase();

    const idx = currentList.findIndex(p => {
      if (p.id === prod.id) return true;
      const pCod = (p.codigoInterno || p.codigo || '').trim().toLowerCase();
      const pDesc = (p.descricao || '').trim().toLowerCase();
      if (codInterno && pCod && codInterno === pCod) return true;
      if (desc && pDesc && desc === pDesc) return true;
      return false;
    });

    const existing = idx >= 0 ? currentList[idx] : null;
    const targetId = existing ? existing.id : (prod.id || 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));

    const normalized: Product = {
      ...prod,
      id: targetId,
      codigoInterno: prod.codigoInterno || prod.codigo || existing?.codigoInterno || `PRD-${Date.now()}`,
      codigo: prod.codigoInterno || prod.codigo || existing?.codigo || `PRD-${Date.now()}`,
      codigoFornecedor: prod.codigoFornecedor || existing?.codigoFornecedor || '',
      codigoBarras: prod.codigoBarras || prod.eanBarcode || existing?.codigoBarras || '',
      eanBarcode: prod.codigoBarras || prod.eanBarcode || existing?.eanBarcode || '',
      descricao: (prod.descricao || '').trim(),
      categoria: prod.categoria || existing?.categoria || 'Geral',
      fotoUrl: prod.fotoUrl || existing?.fotoUrl || '',
      qtdPorPacote: Math.max(1, Number(prod.qtdPorPacote || existing?.qtdPorPacote || 1)),
      precoUnitarioPadrao: prod.precoUnitarioPadrao > 0 ? prod.precoUnitarioPadrao : (existing?.precoUnitarioPadrao || 0),
      pdvSugerido: prod.pdvSugerido || existing?.pdvSugerido || 0,
      ncm: prod.ncm || existing?.ncm || '',
      supplierId: prod.supplierId || existing?.supplierId || '',
      nomeFornecedor: prod.nomeFornecedor || existing?.nomeFornecedor || '',
      ativo: true,
      createdAt: existing?.createdAt || prod.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (idx >= 0) {
      currentList[idx] = normalized;
    } else {
      currentList = [normalized, ...currentList];
    }
  }
  saveProductsList(currentList);
  return currentList;
}

export function deleteProduct(productId: string): Product[] {
  const list = getProductsList().filter(p => p.id !== productId);
  saveProductsList(list);
  return list;
}

export function getInitialFiscalConfig(): FiscalConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.GLOBAL_FISCAL);
    return saved ? JSON.parse(saved) : DEFAULT_FISCAL_CONFIG;
  } catch {
    return DEFAULT_FISCAL_CONFIG;
  }
}

export function saveFiscalConfig(config: FiscalConfig): void {
  localStorage.setItem(STORAGE_KEYS.GLOBAL_FISCAL, JSON.stringify(config));
}

export function getInitialStoresConfig(): StoreConfig[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.GLOBAL_STORES);
    return saved ? JSON.parse(saved) : DEFAULT_STORES;
  } catch {
    return DEFAULT_STORES;
  }
}

export function saveStoresConfig(stores: StoreConfig[]): void {
  localStorage.setItem(STORAGE_KEYS.GLOBAL_STORES, JSON.stringify(stores));
}

export const DEFAULT_SEPARATION_PRESETS: SeparationPreset[] = [
  {
    id: 'preset_default_clusters',
    name: 'Padrão Rede (Clusters A, B e C)',
    description: 'Distribuição oficial da Jóia ERP (10% CD • Cluster A 51.3% • Cluster B 33.3% • Cluster C 15.4%)',
    storeWeights: DEFAULT_STORES.reduce((acc, s) => { acc[s.id] = s.defaultWeight; return acc; }, {} as Record<string, number>),
    reserveStockPercent: 10,
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

export function getInitialSeparationPresets(): SeparationPreset[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SEPARATION_PRESETS);
    return saved ? JSON.parse(saved) : DEFAULT_SEPARATION_PRESETS;
  } catch {
    return DEFAULT_SEPARATION_PRESETS;
  }
}

export function saveSeparationPresetsList(presets: SeparationPreset[]): void {
  localStorage.setItem(STORAGE_KEYS.SEPARATION_PRESETS, JSON.stringify(presets));
}

export function getInitialFiscalPresets(): FiscalPreset[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.FISCAL_PRESETS);
    if (saved) {
      const parsed = JSON.parse(saved);
      const cleaned = parsed.filter((p: FiscalPreset) => !p.id.includes('sim') && !p.name.toLowerCase().includes('simulação'));
      return cleaned.length > 0 ? cleaned : DEFAULT_FISCAL_PRESETS;
    }
    return DEFAULT_FISCAL_PRESETS;
  } catch {
    return DEFAULT_FISCAL_PRESETS;
  }
}

export function saveFiscalPresetsList(presets: FiscalPreset[]): void {
  localStorage.setItem(STORAGE_KEYS.FISCAL_PRESETS, JSON.stringify(presets));
}

export function createNewOrder(
  fiscalConfig: FiscalConfig, 
  storeConfigs: StoreConfig[], 
  supplierOrNumber?: Supplier | string,
  customOrderNumber?: string
): PurchaseOrder {
  const today = new Date().toISOString().split('T')[0];
  const deliveryDate = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

  const targetSupplier = (typeof supplierOrNumber === 'object' && supplierOrNumber) ? supplierOrNumber : null;
  const orderNum = typeof supplierOrNumber === 'string' ? supplierOrNumber : (customOrderNumber || getNextOrderNumber());

  return {
    header: {
      id: 'order_' + Date.now(),
      numeroPedido: orderNum,
      fornecedor: targetSupplier ? targetSupplier.razaoSocial : '',
      supplierId: targetSupplier ? targetSupplier.id : '',
      aliquotaSt: targetSupplier?.aliquotaStPadrao || 0,
      vendedor: targetSupplier?.vendedorPadrao || '',
      contatoVendedor: targetSupplier?.contatoVendedor || '',
      condicaoPagamento: targetSupplier?.condicaoPagamentoPadrao || '30/60/90 Dias',
      dataPedido: today,
      dataEntregaPrevista: deliveryDate,
      percentualDescontoOff: 0,
      percentualNota: targetSupplier?.percentualNotaPadrao ?? 100,
      observacoesDescarga: targetSupplier?.observacoesDescarga || '',
      valorFreteGlobal: 0,
      valorOutrasDespesasGlobal: 0,
      status: 'Em Cotação',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    items: [
      {
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        codigo: '',
        codigoInterno: '',
        codigoFornecedor: '',
        descricao: '',
        qtdTotalUnidades: 0,
        precoUnitario: 0,
        valorTotalBruto: 0,
        pdvAlvo: 12.0
      }
    ],
    fiscalConfig,
    storeConfigs
  };
}

export function loadCurrentOrder(): PurchaseOrder | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_ORDER);
    if (!saved) return null;
    const ord: PurchaseOrder = JSON.parse(saved);
    if (ord.header?.status === 'Finalizado') return null;
    if (ord.items) {
      ord.items = ord.items.map(it => ({
        ...it,
        descricao: it.descricao ? it.descricao.replace(/\s*\([Cc][óo]pia\)\s*$/g, '').trim() : '',
        codigo: it.codigo ? it.codigo.replace(/-C[OÓ]PIA$/i, '').trim() : it.codigo,
        pdvAlvo: it.pdvAlvo || 0
      }));
    }
    if (ord.header?.observacoesDescarga && LEGACY_DEFAULT_OBSERVACOES.includes(ord.header.observacoesDescarga.trim())) {
      ord.header.observacoesDescarga = '';
    }
    if (ord.header) {
      const today = new Date().toISOString().split('T')[0];
      if (!ord.header.dataPedido || ord.header.dataPedido.trim() === '') {
        ord.header.dataPedido = ord.header.dataEmissao || today;
      }
      if (!ord.header.dataEmissao || ord.header.dataEmissao.trim() === '') {
        ord.header.dataEmissao = ord.header.dataPedido || today;
      }
    }
    return ord;
  } catch {
    return null;
  }
}

export function saveCurrentOrder(order: PurchaseOrder): void {
  // Não salva pedidos finalizados como rascunho ativo
  if (order.header?.status === 'Finalizado') {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_ORDER);
    return;
  }
  const orderWithFixedPdv = {
    ...order,
    items: (order.items || []).map(it => ({ ...it, pdvAlvo: 12.00 }))
  };
  localStorage.setItem(STORAGE_KEYS.CURRENT_ORDER, JSON.stringify(orderWithFixedPdv));
}

export function clearCurrentDraft(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_ORDER);
}

export function createRealisticMockOrder(
  fiscalConfig: FiscalConfig, 
  storeConfigs: StoreConfig[],
  customOrderNumber?: string
): PurchaseOrder {
  const mockProducts = [
    { codigo: 'PRE-001', descricao: 'Caneca Cerâmica Decorada com Frases 350ml', pct: 12, cx: 80, preco: 4.20, pdv: 12.00 },
    { codigo: 'PRE-002', descricao: 'Difusor e Aromatizador de Ambientes Lavanda 250ml', pct: 6, cx: 120, preco: 4.80, pdv: 12.00 },
    { codigo: 'PRE-003', descricao: 'Porta-Retrato Vidro e Dourado 15x20cm', pct: 24, cx: 50, preco: 3.80, pdv: 12.00 },
    { codigo: 'PRE-004', descricao: 'Vela Aromática Copo de Vidro Baunilha 180g', pct: 12, cx: 90, preco: 4.50, pdv: 12.00 },
    { codigo: 'PRE-005', descricao: 'Luminária de Mesa LED Articulada USB', pct: 8, cx: 65, preco: 5.20, pdv: 12.00 },
    { codigo: 'PRE-006', descricao: 'Caixa Organizadora Cartonada Decorativa P/M/G', pct: 4, cx: 150, preco: 4.80, pdv: 12.00 },
    { codigo: 'PRE-007', descricao: 'Garrafa Squeeze Inox Degradê 750ml', pct: 12, cx: 70, preco: 5.10, pdv: 12.00 },
    { codigo: 'PRE-008', descricao: 'Jogo de Xícaras de Café Cristal Coração 6un', pct: 6, cx: 85, preco: 5.50, pdv: 12.00 },
    { codigo: 'PRE-009', descricao: 'Espelho de Mesa com LED Touch e Base Porta-Jóias', pct: 6, cx: 60, preco: 5.40, pdv: 12.00 },
    { codigo: 'PRE-010', descricao: 'Mini Vaso Cachepot Cerâmica com Suculenta', pct: 24, cx: 100, preco: 3.50, pdv: 12.00 },
    { codigo: 'PRE-011', descricao: 'Almofada Decorativa Veludo com Enchimento 45x45cm', pct: 10, cx: 75, preco: 4.90, pdv: 12.00 },
    { codigo: 'PRE-012', descricao: 'Relógio de Parede Moderno Minimalista 30cm', pct: 12, cx: 45, preco: 4.50, pdv: 12.00 },
    { codigo: 'PRE-013', descricao: 'Copo Térmico com Tampa e Abridor 473ml', pct: 12, cx: 110, preco: 5.20, pdv: 12.00 },
    { codigo: 'PRE-014', descricao: 'Kit Canetas Fineliner Tons Pastel 12 Cores', pct: 24, cx: 55, preco: 3.90, pdv: 12.00 },
    { codigo: 'PRE-015', descricao: 'Caderno Wire-o Capa Dura Holográfico 100 Folhas', pct: 12, cx: 95, preco: 4.60, pdv: 12.00 },
    { codigo: 'PRE-016', descricao: 'Quadro Decorativo Moldura Caixa Alta 20x30cm', pct: 8, cx: 80, preco: 5.00, pdv: 12.00 },
    { codigo: 'PRE-017', descricao: 'Bandeja Espelhada com Alça Metal Ouro Rose', pct: 4, cx: 130, preco: 5.40, pdv: 12.00 },
    { codigo: 'PRE-018', descricao: 'Moringa de Vidro com Copo 800ml Floral', pct: 6, cx: 70, preco: 4.70, pdv: 12.00 },
    { codigo: 'PRE-019', descricao: 'Kit 3 Cestos Organizadores de Corda de Algodão', pct: 4, cx: 140, preco: 5.60, pdv: 12.00 },
    { codigo: 'PRE-020', descricao: 'Lousa Mágica Digital LCD Infantil 8.5 Pol', pct: 12, cx: 160, preco: 4.30, pdv: 12.00 }
  ];

  const allCatalogProducts = getProductsList();

  const items: OrderItem[] = mockProducts.map((p, idx) => {
    const qtdTotalUnidades = p.pct * p.cx;
    const valorTotalBruto = qtdTotalUnidades * p.preco;
    const fiscal = calculateItemFiscal(p.preco, 12.00, fiscalConfig);
    const separation = calculateAutomaticSeparation(qtdTotalUnidades, storeConfigs);
    const matchedProd = allCatalogProducts.find(cp => (cp.codigoInterno || cp.codigo) === p.codigo);

    return {
      id: `item_mock_${idx + 1}_${Date.now()}`,
      codigo: p.codigo,
      codigoInterno: p.codigo,
      codigoFornecedor: matchedProd?.codigoFornecedor || `PAR-1${idx + 1 < 10 ? '0' + (idx + 1) : idx + 1}`,
      descricao: p.descricao,
      fotoUrl: matchedProd?.fotoUrl || '',
      qtdPorPacote: p.pct,
      qtdPacotes: p.cx,
      qtdTotalUnidades,
      precoUnitario: p.preco,
      valorTotalBruto,
      pdvAlvo: 12.00,
      despesasPdvUnit: fiscal.despesasPdvUnit,
      creditoIcmsUnit: fiscal.creditoIcmsUnit,
      custoRealEfetivo: fiscal.custoRealEfetivo,
      margemRealUnit: fiscal.margemRealUnit,
      margemPercentual: fiscal.margemPercentual,
      separacaoLojas: separation.allocations,
      qtdReservaEstoque: separation.reserveStock,
      separacaoManual: false
    };
  });

  const today = new Date().toISOString().split('T')[0];
  const deliveryDate = new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0];
  const sup = INITIAL_SUPPLIERS[1] || INITIAL_SUPPLIERS[0] || {
    id: 'sup_padrao',
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    vendedorPadrao: '',
    contatoVendedor: '',
    condicaoPagamentoPadrao: '30 Dias',
    aliquotaStPadrao: 0,
    aliquotaIpiPadrao: 0,
    descontoOffPadrao: 0,
    observacoesDescarga: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const finalOrderNumber = customOrderNumber || getNextOrderNumber();

  return {
    header: {
      id: 'ord_' + finalOrderNumber.toLowerCase().replace('-', '_'),
      numeroPedido: finalOrderNumber,
      fornecedor: sup.razaoSocial,
      supplierId: sup.id,
      aliquotaSt: sup.aliquotaStPadrao || 0,
      vendedor: sup.vendedorPadrao || 'Mariana Souza',
      contatoVendedor: sup.contatoVendedor || '(41) 98877-6655',
      condicaoPagamento: sup.condicaoPagamentoPadrao || '28/56 Dias',
      dataPedido: today,
      dataEntregaPrevista: deliveryDate,
      percentualDescontoOff: 0,
      percentualNota: 100,
      observacoesDescarga: '',
      valorFreteGlobal: 0,
      valorOutrasDespesasGlobal: 0,
      status: 'Aprovado',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    items,
    fiscalConfig,
    storeConfigs
  };
}

export function saveSavedOrdersList(orders: PurchaseOrder[]): void {
  // Desduplicar estritamente por número de pedido
  const map = new Map<string, PurchaseOrder>();
  orders.forEach(o => {
    if (o?.header?.numeroPedido) {
      map.set(o.header.numeroPedido.trim().toUpperCase(), o);
    }
  });
  const uniqueList = Array.from(map.values());
  localStorage.setItem(STORAGE_KEYS.SAVED_ORDERS, JSON.stringify(uniqueList));
}

export function loadSavedOrdersList(): PurchaseOrder[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SAVED_ORDERS);
    if (!saved) return [];
    const list: PurchaseOrder[] = JSON.parse(saved);
    
    // Desduplica por numeroPedido garantindo 1 único registro por pedido
    const map = new Map<string, PurchaseOrder>();
    list.forEach(ord => {
      if (ord?.header?.numeroPedido) {
        const num = ord.header.numeroPedido.trim().toUpperCase();
        map.set(num, {
          ...ord,
          items: (ord.items || []).map(it => ({ 
            ...it, 
            pdvAlvo: it.pdvAlvo !== undefined && it.pdvAlvo !== null && !isNaN(Number(it.pdvAlvo)) ? Number(it.pdvAlvo) : 12.00 
          }))
        });
      }
    });

    return Array.from(map.values());
  } catch {
    return [];
  }
}

export function saveOrderToHistory(order: PurchaseOrder): void {
  const list = loadSavedOrdersList();
  const orderNum = order.header.numeroPedido.trim().toUpperCase();
  const index = list.findIndex(o => 
    o.header.id === order.header.id || 
    (o.header.numeroPedido && o.header.numeroPedido.trim().toUpperCase() === orderNum)
  );
  
  const updatedOrder = { 
    ...order, 
    items: (order.items || []).map(it => ({ 
      ...it, 
      pdvAlvo: it.pdvAlvo !== undefined && it.pdvAlvo !== null && !isNaN(Number(it.pdvAlvo)) ? Number(it.pdvAlvo) : 12.00 
    })),
    header: { ...order.header, updatedAt: new Date().toISOString() } 
  };
  
  if (index >= 0) {
    list[index] = updatedOrder;
  } else {
    list.unshift(updatedOrder);
  }
  
  saveSavedOrdersList(list);
}

// ==========================================
// 📦 MÓDULO DE GESTÃO DO DEPÓSITO CENTRAL (CD)
// ==========================================

export const INITIAL_CENTRAL_STOCK: CentralStockItem[] = [];

export function getInitialCentralStock(): CentralStockItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CENTRAL_STOCK);
    if (saved !== null) {
      const parsed: CentralStockItem[] = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map(s => ({ ...s, pdvSugerido: 12.00 }));
      }
    }
  } catch {}
  return [];
}

export function loadCentralStock(): CentralStockItem[] {
  return getInitialCentralStock();
}

export function saveCentralStock(stockList: CentralStockItem[]): void {
  localStorage.setItem(STORAGE_KEYS.CENTRAL_STOCK, JSON.stringify(stockList));
}

export function updateStockBalance(stockId: string, deltaCaixas: number, newLocation?: string): CentralStockItem[] {
  const stock = loadCentralStock();
  const index = stock.findIndex(s => s.id === stockId);
  if (index >= 0) {
    const item = stock[index];
    const pack = item.qtdPorPacote || 1;
    const currentUnidades = item.saldoUnidades || 0;
    const newSaldoUnidades = Math.max(0, currentUnidades + (deltaCaixas * pack));
    const newSaldoCaixas = Math.floor(newSaldoUnidades / pack);
    stock[index] = {
      ...item,
      saldoCaixas: newSaldoCaixas,
      saldoUnidades: newSaldoUnidades,
      localizacaoGalpao: newLocation !== undefined ? newLocation : item.localizacaoGalpao,
      updatedAt: new Date().toISOString()
    };
    saveCentralStock(stock);
  }
  return stock;
}

export function createStockTransferOrder(
  selectedItemsWithBoxes: Array<{ stockItem: CentralStockItem; caixasParaSeparar: number }>,
  storeConfigs: StoreConfig[],
  fiscalConfig: FiscalConfig
): PurchaseOrder {
  const nextNum = 'CD-' + String(Date.now()).slice(-4);
  const today = new Date().toISOString().split('T')[0];

  const items: OrderItem[] = selectedItemsWithBoxes.map((sel, idx) => {
    const { stockItem, caixasParaSeparar } = sel;
    const pack = stockItem.qtdPorPacote || 1;
    const qtdTotalUnidades = caixasParaSeparar * pack;
    const valorTotalBruto = qtdTotalUnidades * stockItem.precoUnitario;
    const fiscal = calculateItemFiscal(stockItem.precoUnitario, stockItem.pdvSugerido, fiscalConfig);
    const separation = calculateAutomaticSeparation(qtdTotalUnidades, storeConfigs);

    return {
      id: `item_transf_${Date.now()}_${idx + 1}`,
      codigo: stockItem.codigo,
      descricao: stockItem.descricao,
      fotoUrl: stockItem.fotoUrl,
      qtdPorPacote: pack,
      qtdPacotes: caixasParaSeparar,
      qtdTotalUnidades,
      precoUnitario: stockItem.precoUnitario,
      valorTotalBruto,
      pdvAlvo: stockItem.pdvSugerido,
      despesasPdvUnit: fiscal.despesasPdvUnit,
      creditoIcmsUnit: fiscal.creditoIcmsUnit,
      custoRealEfetivo: fiscal.custoRealEfetivo,
      margemRealUnit: fiscal.margemRealUnit,
      margemPercentual: fiscal.margemPercentual,
      separacaoLojas: separation.allocations,
      qtdReservaEstoque: separation.reserveStock,
      separacaoManual: false
    };
  });

  return {
    header: {
      id: 'order_transf_cd_' + Date.now(),
      numeroPedido: nextNum,
      fornecedor: 'Depósito Central (Transferência CD)',
      supplierId: 'cd_matriz',
      aliquotaSt: 0,
      vendedor: 'Expedição / CD Matriz',
      contatoVendedor: '(41) 3300-1200',
      condicaoPagamento: 'Transferência Interna Entre Filiais',
      dataPedido: today,
      dataEntregaPrevista: today,
      percentualDescontoOff: 0,
      percentualNota: 100,
      observacoesDescarga: 'Romaneio gerado a partir do estoque físico do Depósito Central para distribuição às 20 lojas.',
      valorFreteGlobal: 0,
      valorOutrasDespesasGlobal: 0,
      status: 'Em Separação',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    items,
    fiscalConfig,
    storeConfigs
  };
}
