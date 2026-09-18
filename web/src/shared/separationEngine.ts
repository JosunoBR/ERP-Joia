import { StoreConfig, SeparationPreset } from './types';
import { DEFAULT_STORES, DEFAULT_RESERVE_STOCK_PERCENT } from './constants';

export interface SeparationResult {
  allocations: Record<string, number>; // Em unidades
  totalAllocated: number; // Em unidades
  reserveStock: number; // Quantidade guardada no Estoque Central / CD / Matriz (em unidades)
  targetTotal: number; // Em unidades
  isBalanced: boolean;  // Se não ultrapassou o total
  isOverAllocated: boolean; // Se ultrapassou o total comprado
  difference: number;   // Saldo guardado em estoque (unidades)
  clusterTotals: {
    A: number;
    B: number;
    C: number;
  };
}

/**
 * Rateio por Unidades (Compatibilidade e Modo Detalhado)
 */
export function calculateAutomaticSeparation(
  totalQuantity: number,
  stores: StoreConfig[] = DEFAULT_STORES,
  reserveQuantity?: number
): SeparationResult {
  const defaultReserve = Math.round(totalQuantity * DEFAULT_RESERVE_STOCK_PERCENT);
  const actualReserve = reserveQuantity !== undefined ? reserveQuantity : defaultReserve;
  const safeReserve = Math.max(0, Math.min(totalQuantity, Math.floor(actualReserve || 0)));
  const quantityToDistribute = Math.max(0, totalQuantity - safeReserve);

  if (quantityToDistribute <= 0) {
    const emptyAllocations: Record<string, number> = {};
    stores.forEach(s => { emptyAllocations[s.id] = 0; });
    return {
      allocations: emptyAllocations,
      totalAllocated: 0,
      reserveStock: totalQuantity,
      targetTotal: totalQuantity,
      isBalanced: true,
      isOverAllocated: false,
      difference: totalQuantity,
      clusterTotals: { A: 0, B: 0, C: 0 }
    };
  }

  const activeStores = stores.filter(s => s.active);
  const totalWeight = activeStores.reduce((acc, s) => acc + s.defaultWeight, 0);

  if (totalWeight <= 0 || activeStores.length === 0) {
    const fallbackAllocations: Record<string, number> = {};
    stores.forEach(s => { fallbackAllocations[s.id] = 0; });
    return {
      allocations: fallbackAllocations,
      totalAllocated: 0,
      reserveStock: totalQuantity,
      targetTotal: totalQuantity,
      isBalanced: true,
      isOverAllocated: false,
      difference: totalQuantity,
      clusterTotals: { A: 0, B: 0, C: 0 }
    };
  }

  const allocations: Record<string, number> = {};
  const remainders: { storeId: string; cluster: string; weight: number; remainder: number; originalIndex: number }[] = [];
  let sumIntegers = 0;

  stores.forEach(s => { allocations[s.id] = 0; });

  activeStores.forEach((store, index) => {
    const exactQuota = (store.defaultWeight / totalWeight) * quantityToDistribute;
    const integerPart = Math.floor(exactQuota);
    const remainder = exactQuota - integerPart;

    allocations[store.id] = integerPart;
    sumIntegers += integerPart;

    remainders.push({
      storeId: store.id,
      cluster: store.cluster,
      weight: store.defaultWeight,
      remainder,
      originalIndex: index
    });
  });

  let leftover = quantityToDistribute - sumIntegers;

  const clusterOrder: Record<string, number> = { A: 3, B: 2, C: 1 };
  remainders.sort((a, b) => {
    if (Math.abs(b.remainder - a.remainder) > 0.000001) {
      return b.remainder - a.remainder;
    }
    const clusterDiff = (clusterOrder[b.cluster] || 0) - (clusterOrder[a.cluster] || 0);
    if (clusterDiff !== 0) return clusterDiff;
    return b.weight - a.weight;
  });

  let rIdx = 0;
  while (leftover > 0 && remainders.length > 0) {
    const item = remainders[rIdx % remainders.length];
    allocations[item.storeId] += 1;
    leftover -= 1;
    rIdx++;
  }

  const clusterTotals = { A: 0, B: 0, C: 0 };
  stores.forEach(s => {
    const qtd = allocations[s.id] || 0;
    if (s.cluster === 'A') clusterTotals.A += qtd;
    if (s.cluster === 'B') clusterTotals.B += qtd;
    if (s.cluster === 'C') clusterTotals.C += qtd;
  });

  const totalAllocated = Object.values(allocations).reduce((a, b) => a + b, 0);
  const reserveStock = Math.max(0, totalQuantity - totalAllocated);

  return {
    allocations,
    totalAllocated,
    reserveStock,
    targetTotal: totalQuantity,
    isBalanced: totalAllocated <= totalQuantity,
    isOverAllocated: totalAllocated > totalQuantity,
    difference: totalQuantity - totalAllocated,
    clusterTotals
  };
}

export function validateSeparation(
  allocations: Record<string, number>,
  targetTotal: number,
  stores: StoreConfig[] = DEFAULT_STORES
): SeparationResult {
  let totalAllocated = 0;
  const clusterTotals = { A: 0, B: 0, C: 0 };

  stores.forEach(s => {
    const qtd = Number(allocations[s.id]) || 0;
    totalAllocated += qtd;
    if (s.cluster === 'A') clusterTotals.A += qtd;
    if (s.cluster === 'B') clusterTotals.B += qtd;
    if (s.cluster === 'C') clusterTotals.C += qtd;
  });

  const reserveStock = Math.max(0, targetTotal - totalAllocated);
  const isOverAllocated = totalAllocated > targetTotal;

  return {
    allocations,
    totalAllocated,
    reserveStock,
    targetTotal,
    isBalanced: !isOverAllocated,
    isOverAllocated,
    difference: targetTotal - totalAllocated,
    clusterTotals
  };
}

/**
 * Aplica um Modelo/Preset de Separação a qualquer quantidade de produto,
 * respeitando os pesos percentuais das lojas e a reserva de CD.
 */
export function applySeparationPreset(
  totalQuantity: number,
  preset: SeparationPreset,
  stores: StoreConfig[] = DEFAULT_STORES
): SeparationResult {
  const reservePercent = Number(preset.reserveStockPercent) || 0;
  const reserveQuantity = Math.round((totalQuantity * reservePercent) / 100);
  const safeReserve = Math.max(0, Math.min(totalQuantity, reserveQuantity));
  const quantityToDistribute = Math.max(0, totalQuantity - safeReserve);

  const emptyAllocations: Record<string, number> = {};
  stores.forEach(s => { emptyAllocations[s.id] = 0; });

  if (quantityToDistribute <= 0) {
    return {
      allocations: emptyAllocations,
      totalAllocated: 0,
      reserveStock: totalQuantity,
      targetTotal: totalQuantity,
      isBalanced: true,
      isOverAllocated: false,
      difference: totalQuantity,
      clusterTotals: { A: 0, B: 0, C: 0 }
    };
  }

  const activeStores = stores.filter(s => s.active);
  const weights = preset.storeWeights || {};

  let totalWeight = 0;
  activeStores.forEach(s => {
    const w = weights[s.id] !== undefined ? Number(weights[s.id]) : (Number(s.defaultWeight) || 0);
    totalWeight += Math.max(0, w);
  });

  if (totalWeight <= 0 || activeStores.length === 0) {
    return {
      allocations: emptyAllocations,
      totalAllocated: 0,
      reserveStock: totalQuantity,
      targetTotal: totalQuantity,
      isBalanced: true,
      isOverAllocated: false,
      difference: totalQuantity,
      clusterTotals: { A: 0, B: 0, C: 0 }
    };
  }

  const allocations: Record<string, number> = { ...emptyAllocations };
  const remainders: { storeId: string; cluster: string; weight: number; remainder: number; originalIndex: number }[] = [];
  let sumIntegers = 0;

  activeStores.forEach((store, index) => {
    const w = weights[store.id] !== undefined ? Number(weights[store.id]) : (Number(store.defaultWeight) || 0);
    const exactQuota = (Math.max(0, w) / totalWeight) * quantityToDistribute;
    const integerPart = Math.floor(exactQuota);
    const remainder = exactQuota - integerPart;

    allocations[store.id] = integerPart;
    sumIntegers += integerPart;

    remainders.push({
      storeId: store.id,
      cluster: store.cluster,
      weight: w,
      remainder,
      originalIndex: index
    });
  });

  let leftover = quantityToDistribute - sumIntegers;

  const clusterOrder: Record<string, number> = { A: 3, B: 2, C: 1 };
  remainders.sort((a, b) => {
    if (Math.abs(b.remainder - a.remainder) > 0.000001) {
      return b.remainder - a.remainder;
    }
    const clusterDiff = (clusterOrder[b.cluster] || 0) - (clusterOrder[a.cluster] || 0);
    if (clusterDiff !== 0) return clusterDiff;
    return b.weight - a.weight;
  });

  let rIdx = 0;
  while (leftover > 0 && remainders.length > 0) {
    const item = remainders[rIdx % remainders.length];
    allocations[item.storeId] += 1;
    leftover -= 1;
    rIdx++;
  }

  const clusterTotals = { A: 0, B: 0, C: 0 };
  stores.forEach(s => {
    const qtd = allocations[s.id] || 0;
    if (s.cluster === 'A') clusterTotals.A += qtd;
    if (s.cluster === 'B') clusterTotals.B += qtd;
    if (s.cluster === 'C') clusterTotals.C += qtd;
  });

  const totalAllocated = Object.values(allocations).reduce((a, b) => a + b, 0);
  const reserveStock = Math.max(0, totalQuantity - totalAllocated);

  return {
    allocations,
    totalAllocated,
    reserveStock,
    targetTotal: totalQuantity,
    isBalanced: totalAllocated <= totalQuantity,
    isOverAllocated: totalAllocated > totalQuantity,
    difference: totalQuantity - totalAllocated,
    clusterTotals
  };
}

/**
 * Converte as unidades alocadas em uma grade de lojas em percentuais/pesos
 * para permitir salvar a distribuição como um novo modelo reutilizável.
 */
export function extractPresetFromAllocations(
  allocations: Record<string, number>,
  totalQuantity: number,
  reserveStock: number,
  stores: StoreConfig[] = DEFAULT_STORES
): { storeWeights: Record<string, number>; reserveStockPercent: number } {
  const safeTotal = Math.max(1, totalQuantity);
  const reserveStockPercent = Math.round(((reserveStock || 0) / safeTotal) * 100);
  const distributedUnits = Math.max(0, safeTotal - (reserveStock || 0));

  const storeWeights: Record<string, number> = {};
  if (distributedUnits <= 0) {
    stores.forEach(s => {
      storeWeights[s.id] = s.defaultWeight;
    });
    return { storeWeights, reserveStockPercent };
  }

  stores.forEach(s => {
    const units = Number(allocations[s.id]) || 0;
    const pct = (units / distributedUnits) * 100;
    storeWeights[s.id] = Math.round(pct * 100) / 100;
  });

  return { storeWeights, reserveStockPercent };
}

/**
 * Ajusta a quantidade/percentual de reserva no Estoque Central (CD) de forma estritamente proporcional,
 * retirando ou adicionando unidades nas lojas conforme as quantidades já distribuídas (respeitando
 * o padrão/preset carregado ou edições manuais existentes), sem resetar para os pesos padrões do sistema.
 */
export function adjustSeparationReserveProportionally(
  item: { qtdTotalUnidades: number; separacaoLojas?: Record<string, number>; qtdReservaEstoque?: number },
  targetReserveUnits: number,
  stores: StoreConfig[] = DEFAULT_STORES,
  fallbackPreset?: SeparationPreset
): SeparationResult {
  const totalQuantity = Number(item.qtdTotalUnidades) || 0;
  const safeReserve = Math.max(0, Math.min(totalQuantity, Math.round(targetReserveUnits || 0)));
  const quantityToDistribute = Math.max(0, totalQuantity - safeReserve);

  const emptyAllocations: Record<string, number> = {};
  stores.forEach(s => { emptyAllocations[s.id] = 0; });

  const clusterTotals = { A: 0, B: 0, C: 0 };

  if (quantityToDistribute <= 0) {
    return {
      allocations: emptyAllocations,
      totalAllocated: 0,
      reserveStock: totalQuantity,
      targetTotal: totalQuantity,
      isBalanced: true,
      isOverAllocated: false,
      difference: 0,
      clusterTotals
    };
  }

  const activeStores = stores.filter(s => s.active);
  const currentAlloc = item.separacaoLojas || {};

  let currentStoreSum = 0;
  activeStores.forEach(s => {
    currentStoreSum += Math.max(0, Number(currentAlloc[s.id]) || 0);
  });

  let totalWeight = 0;
  activeStores.forEach(store => {
    let w = 0;
    if (currentStoreSum > 0) {
      w = Math.max(0, Number(currentAlloc[store.id]) || 0);
    } else if (fallbackPreset && fallbackPreset.storeWeights && fallbackPreset.storeWeights[store.id] !== undefined) {
      w = Math.max(0, Number(fallbackPreset.storeWeights[store.id]) || 0);
    } else {
      w = Math.max(0, Number(store.defaultWeight) || 0);
    }
    totalWeight += Math.max(0, w);
  });

  const allocations: Record<string, number> = { ...emptyAllocations };
  const remainders: { storeId: string; cluster: string; weight: number; remainder: number; originalIndex: number }[] = [];
  let sumIntegers = 0;

  activeStores.forEach((store, index) => {
    let w = 0;
    if (currentStoreSum > 0) {
      w = Math.max(0, Number(currentAlloc[store.id]) || 0);
    } else if (fallbackPreset && fallbackPreset.storeWeights && fallbackPreset.storeWeights[store.id] !== undefined) {
      w = Math.max(0, Number(fallbackPreset.storeWeights[store.id]) || 0);
    } else {
      w = Math.max(0, Number(store.defaultWeight) || 0);
    }

    const exactQuota = totalWeight > 0 ? (w / totalWeight) * quantityToDistribute : 0;
    const integerPart = Math.floor(exactQuota);
    const remainder = exactQuota - integerPart;

    allocations[store.id] = integerPart;
    sumIntegers += integerPart;

    remainders.push({
      storeId: store.id,
      cluster: store.cluster,
      weight: w,
      remainder,
      originalIndex: index
    });
  });

  let leftover = quantityToDistribute - sumIntegers;
  const clusterOrder: Record<string, number> = { A: 3, B: 2, C: 1 };
  remainders.sort((a, b) => {
    if (Math.abs(b.remainder - a.remainder) > 0.000001) {
      return b.remainder - a.remainder;
    }
    const clusterDiff = (clusterOrder[b.cluster] || 0) - (clusterOrder[a.cluster] || 0);
    if (clusterDiff !== 0) return clusterDiff;
    return b.weight - a.weight;
  });

  let rIdx = 0;
  while (leftover > 0 && remainders.length > 0) {
    const itm = remainders[rIdx % remainders.length];
    allocations[itm.storeId] += 1;
    leftover -= 1;
    rIdx++;
  }

  stores.forEach(s => {
    const qtd = allocations[s.id] || 0;
    if (s.cluster === 'A') clusterTotals.A += qtd;
    if (s.cluster === 'B') clusterTotals.B += qtd;
    if (s.cluster === 'C') clusterTotals.C += qtd;
  });

  const totalAllocated = Object.values(allocations).reduce((a, b) => a + b, 0);
  const reserveStock = Math.max(0, totalQuantity - totalAllocated);

  return {
    allocations,
    totalAllocated,
    reserveStock,
    targetTotal: totalQuantity,
    isBalanced: totalAllocated <= totalQuantity,
    isOverAllocated: totalAllocated > totalQuantity,
    difference: totalQuantity - totalAllocated,
    clusterTotals
  };
}
