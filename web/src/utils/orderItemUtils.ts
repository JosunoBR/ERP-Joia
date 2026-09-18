import { OrderItem, FiscalConfig, StoreConfig } from '../shared/types';
import { calculateItemFiscal } from '../shared/fiscalEngine';
import { calculateAutomaticSeparation } from '../shared/separationEngine';

/**
 * Verifica se um item de pedido está totalmente em branco (sem descrição, código, quantidade ou preço)
 */
export function isOrderItemBlank(item: OrderItem): boolean {
  if (!item) return true;
  const hasDesc = Boolean(item.descricao && item.descricao.trim() !== '');
  const hasCod = Boolean(item.codigo && item.codigo.trim() !== '');
  const hasCodInt = Boolean(item.codigoInterno && item.codigoInterno.trim() !== '');
  const hasCodForn = Boolean(item.codigoFornecedor && item.codigoFornecedor.trim() !== '');
  const hasBarras = Boolean(item.codigoBarras && item.codigoBarras.trim() !== '');
  const hasFoto = Boolean(item.fotoUrl && item.fotoUrl.trim() !== '');
  const hasQtd = Boolean(item.qtdTotalUnidades && item.qtdTotalUnidades > 0);
  const hasPacotes = Boolean(item.qtdPacotes && item.qtdPacotes > 0);
  const hasPreco = Boolean(item.precoUnitario && item.precoUnitario > 0);
  return !hasDesc && !hasCod && !hasCodInt && !hasCodForn && !hasBarras && !hasFoto && !hasQtd && !hasPacotes && !hasPreco;
}

/**
 * Cria um novo item de pedido limpo e em branco
 */
export function createBlankOrderItem(fiscalConfig?: FiscalConfig, storeConfigs?: StoreConfig[]): OrderItem {
  const item: OrderItem = {
    id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    codigo: '',
    codigoInterno: '',
    codigoFornecedor: '',
    descricao: '',
    qtdTotalUnidades: 0,
    precoUnitario: 0,
    valorTotalBruto: 0,
    percentualDesconto: 0,
    valorDescontoItem: 0,
    valorTotalLiquido: 0,
    pdvAlvo: 12.0
  };

  if (fiscalConfig) {
    const fiscalRes = calculateItemFiscal(item.precoUnitario, item.pdvAlvo, fiscalConfig);
    item.despesasPdvUnit = fiscalRes.despesasPdvUnit;
    item.creditoIcmsUnit = fiscalRes.creditoIcmsUnit;
    item.custoRealEfetivo = fiscalRes.custoRealEfetivo;
    item.margemRealUnit = fiscalRes.margemRealUnit;
    item.margemPercentual = fiscalRes.margemPercentual;
  }

  if (storeConfigs) {
    const sepRes = calculateAutomaticSeparation(item.qtdTotalUnidades, storeConfigs);
    item.separacaoLojas = sepRes.allocations;
    item.qtdReservaEstoque = sepRes.reserveStock;
  }

  return item;
}

/**
 * Garante que a lista de itens termine sempre com exatamente 1 linha em branco no final
 */
export function ensureTrailingBlankItem(
  items: OrderItem[], 
  fiscalConfig?: FiscalConfig, 
  storeConfigs?: StoreConfig[]
): OrderItem[] {
  if (!items || items.length === 0) {
    return [createBlankOrderItem(fiscalConfig, storeConfigs)];
  }

  const lastItem = items[items.length - 1];
  if (!isOrderItemBlank(lastItem)) {
    return [...items, createBlankOrderItem(fiscalConfig, storeConfigs)];
  }

  // Remove itens em branco intermediários duplicados se houver
  let cleaned = [...items];
  while (cleaned.length > 1 && isOrderItemBlank(cleaned[cleaned.length - 1]) && isOrderItemBlank(cleaned[cleaned.length - 2])) {
    cleaned.pop();
  }

  return cleaned;
}

/**
 * Gera automaticamente o próximo código sequencial de produto interno (ex: PRD-051)
 */
export function generateNextProductCode(
  products: { codigoInterno?: string; codigo?: string }[] = [], 
  items: OrderItem[] = []
): string {
  const allCodes = [
    ...products.map(p => p.codigoInterno || p.codigo || ''),
    ...items.map(i => i.codigoInterno || i.codigo || '')
  ];

  let maxNum = 0;
  allCodes.forEach(code => {
    const match = code.match(/(?:PRD|PRE|PROD)-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  const nextNum = maxNum > 0 ? maxNum + 1 : (products.length + 1);
  return `PRD-${String(nextNum).padStart(3, '0')}`;
}
