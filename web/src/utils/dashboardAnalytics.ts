import { PurchaseOrder, OrderItem, Supplier } from '../shared/types';
import { toIsoDate } from './masks';

export interface DashboardFilter {
  periodPreset: '30d' | 'trimestre' | 'semestre' | 'ano' | 'tudo' | 'custom';
  startDate?: string;
  endDate?: string;
  supplierId?: string; // 'all' ou id específico
}

export interface ItemRanking {
  codigo?: string;
  descricao: string;
  totalPecas: number;
  totalInvestimento: number;
  faturamentoPdv: number;
  lucroReal: number;
  margemMedia: number;
  pedidosCount: number;
}

export interface SupplierRanking {
  id: string;
  razaoSocial: string;
  pedidosCount: number;
  totalInvestimento: number;
  totalPecas: number;
  totalLucro: number;
  aliquotaStMedia: number;
}

export interface PeriodSummary {
  periodoLabel: string;
  totalInvestido: number;
  faturamentoPdv: number;
  lucroReal: number;
  margemPercentual: number;
  totalPecas: number;
  pedidosCount: number;
}

export interface MonthlyChartData {
  mesLabel: string; // Ex: 'Jan/26', 'Fev/26'
  mesIndex: number; // 0 a 11
  ano: number;
  investimentoCompra: number;
  faturamentoPdv: number;
  lucroReal: number;
  totalPecas: number;
}

export interface DashboardMetrics {
  totalInvestido: number;
  totalPecas: number;
  faturamentoPdv: number;
  lucroReal: number;
  margemMedia: number;
  pedidosCount: number;
  ticketMedio: number;
  topItems: ItemRanking[];
  topSuppliers: SupplierRanking[];
  quarterlySummary: PeriodSummary[]; // Q1, Q2, Q3, Q4
  semesterSummary: PeriodSummary[];  // S1, S2
  annualSummary: PeriodSummary[];    // Anual
  monthlyData: MonthlyChartData[];
  clusterAllocation: { A: number; B: number; C: number; total: number };
}

/**
 * Converte qualquer string de data de pedido (ISO, DD/MM/AAAA, etc.) para Date válida de forma determinística
 */
export function parseOrderDate(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Se já for ISO com T (ex: 2026-03-15T12:00:00.000Z)
  if (trimmed.includes('T')) {
    const dt = new Date(trimmed);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // Tenta converter formato BR (DD/MM/AAAA) ou AAAA-MM-DD para ISO YYYY-MM-DD
  const iso = toIsoDate(trimmed);
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    return isNaN(dt.getTime()) ? null : dt;
  }

  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Obtém a data oficial do pedido considerando dataPedido, dataEmissao, createdAt ou updatedAt
 */
export function getOrderDate(order: PurchaseOrder): Date {
  const parsed = parseOrderDate(order.header?.dataPedido) 
    || parseOrderDate(order.header?.dataEmissao) 
    || parseOrderDate(order.header?.createdAt) 
    || parseOrderDate(order.header?.updatedAt);
  return parsed || new Date();
}

/**
 * Depreciado: Retorna array vazio para garantir que dados fictícios jamais poluam o BI oficial.
 */
export function generateSeedOrders(): PurchaseOrder[] {
  return [];
}

/**
 * Calcula todas as métricas analíticas e agregações do dashboard com filtros de período e fornecedor.
 */
export function calculateDashboardMetrics(
  allOrders: PurchaseOrder[],
  filter: DashboardFilter
): DashboardMetrics {
  const now = new Date();
  const currentYear = now.getFullYear();

  // 1. Filtrar pedidos por data e fornecedor
  const filteredOrders = allOrders.filter(order => {
    if (!order || !order.header) return false;

    // Filtro de fornecedor
    if (filter.supplierId && filter.supplierId !== 'all') {
      const fornName = (order.header.fornecedor || '').toLowerCase();
      const target = filter.supplierId.toLowerCase();
      const matchSup = order.header.supplierId === filter.supplierId || fornName.includes(target);
      if (!matchSup) return false;
    }

    const orderDate = getOrderDate(order);

    if (filter.periodPreset === '30d') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      return orderDate >= thirtyDaysAgo;
    }

    if (filter.periodPreset === 'trimestre') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const orderQuarter = Math.floor(orderDate.getMonth() / 3);
      return orderDate.getFullYear() === currentYear && orderQuarter === currentQuarter;
    }

    if (filter.periodPreset === 'semestre') {
      const currentSemester = now.getMonth() < 6 ? 0 : 1;
      const orderSemester = orderDate.getMonth() < 6 ? 0 : 1;
      return orderDate.getFullYear() === currentYear && orderSemester === currentSemester;
    }

    if (filter.periodPreset === 'ano') {
      return orderDate.getFullYear() === currentYear;
    }

    if (filter.periodPreset === 'custom' && filter.startDate && filter.endDate) {
      const start = parseOrderDate(filter.startDate) || new Date(filter.startDate);
      const end = parseOrderDate(filter.endDate) || new Date(filter.endDate + 'T23:59:59');
      return orderDate >= start && orderDate <= end;
    }

    return true; // 'tudo'
  });

  // 2. Acumuladores globais
  let totalInvestido = 0;
  let totalPecas = 0;
  let faturamentoPdv = 0;
  let custoRealTotal = 0;
  let totalStValor = 0;
  const clusterAllocation = { A: 0, B: 0, C: 0, total: 0 };

  const itemsMap: Record<string, ItemRanking> = {};
  const suppliersMap: Record<string, SupplierRanking> = {};

  // 3. Processar cada pedido
  filteredOrders.forEach(order => {
    const items = order.items || [];
    const totalBrutoPedido = items.reduce((a, b) => a + (Number(b.valorTotalBruto) || 0), 0);
    const descontoOff = (totalBrutoPedido * (Number(order.header.percentualDescontoOff) || 0)) / 100;
    const subtotalAposDesconto = totalBrutoPedido - descontoOff;
    const stAliquota = Number(order.header.aliquotaSt) || 0;
    const stValorPedido = (subtotalAposDesconto * stAliquota) / 100;
    const pedidoInvestimentoLiquido = subtotalAposDesconto + stValorPedido + (Number(order.header.valorFreteGlobal) || 0);

    totalInvestido += pedidoInvestimentoLiquido;
    totalStValor += stValorPedido;

    // Fornecedor ranking
    const supKey = order.header.fornecedor ? order.header.fornecedor.trim() : 'Não identificado';
    if (!suppliersMap[supKey]) {
      suppliersMap[supKey] = {
        id: order.header.supplierId || supKey,
        razaoSocial: supKey,
        pedidosCount: 0,
        totalInvestimento: 0,
        totalPecas: 0,
        totalLucro: 0,
        aliquotaStMedia: stAliquota
      };
    }
    suppliersMap[supKey].pedidosCount += 1;
    suppliersMap[supKey].totalInvestimento += pedidoInvestimentoLiquido;

    // Itens
    items.forEach(item => {
      if (!item || !item.descricao || item.descricao.trim() === '') return;
      const qtdTotal = Number(item.qtdTotalUnidades) || 0;
      const valorBruto = Number(item.valorTotalBruto) || 0;
      if (qtdTotal <= 0 && valorBruto <= 0) return;

      const pdvAlvo = Number(item.pdvAlvo) || 0;
      const custoRealUnit = Number(item.custoRealEfetivo) || Number(item.precoUnitario) || 0;
      const itemFaturamento = qtdTotal * pdvAlvo;
      const itemCustoReal = qtdTotal * custoRealUnit;
      const itemLucro = itemFaturamento - itemCustoReal;

      totalPecas += qtdTotal;
      faturamentoPdv += itemFaturamento;
      custoRealTotal += itemCustoReal;

      suppliersMap[supKey].totalPecas += qtdTotal;
      suppliersMap[supKey].totalLucro += itemLucro;

      // Agregação de item
      const itemKey = (item.codigo && item.codigo.trim() !== '') 
        ? item.codigo.trim().toUpperCase() 
        : item.descricao.trim().toLowerCase();

      if (!itemsMap[itemKey]) {
        itemsMap[itemKey] = {
          codigo: item.codigo,
          descricao: item.descricao,
          totalPecas: 0,
          totalInvestimento: 0,
          faturamentoPdv: 0,
          lucroReal: 0,
          margemMedia: 0,
          pedidosCount: 0
        };
      }
      itemsMap[itemKey].totalPecas += qtdTotal;
      itemsMap[itemKey].totalInvestimento += valorBruto;
      itemsMap[itemKey].faturamentoPdv += itemFaturamento;
      itemsMap[itemKey].lucroReal += itemLucro;
      itemsMap[itemKey].pedidosCount += 1;

      // Clusters
      if (item.separacaoLojas && Array.isArray(order.storeConfigs)) {
        order.storeConfigs.forEach(store => {
          const qtd = Number(item.separacaoLojas?.[store.id]) || 0;
          if (store.cluster === 'A') clusterAllocation.A += qtd;
          if (store.cluster === 'B') clusterAllocation.B += qtd;
          if (store.cluster === 'C') clusterAllocation.C += qtd;
          clusterAllocation.total += qtd;
        });
      }
    });
  });

  const lucroReal = faturamentoPdv - custoRealTotal - totalStValor;
  const margemMedia = faturamentoPdv > 0 ? (lucroReal / faturamentoPdv) * 100 : 0;
  const pedidosCount = filteredOrders.length;
  const ticketMedio = pedidosCount > 0 ? totalInvestido / pedidosCount : 0;

  // Top Items ordenados por quantidade de peças
  const topItems = Object.values(itemsMap).map(i => ({
    ...i,
    margemMedia: i.faturamentoPdv > 0 ? (i.lucroReal / i.faturamentoPdv) * 100 : 0
  })).sort((a, b) => b.totalPecas - a.totalPecas);

  // Top Fornecedores ordenados por volume financeiro
  const topSuppliers = Object.values(suppliersMap).sort((a, b) => b.totalInvestimento - a.totalInvestimento);

  // 4. Agregações por Trimestre, Semestre e Anual (de todos os pedidos do ano analisado)
  const baseYearOrders = allOrders.filter(o => {
    if (!o || !o.header) return false;
    const d = getOrderDate(o);
    return d.getFullYear() === currentYear;
  });

  const quarters = [
    { label: '1º Trimestre (Jan - Mar)', months: [0, 1, 2] },
    { label: '2º Trimestre (Abr - Jun)', months: [3, 4, 5] },
    { label: '3º Trimestre (Jul - Set)', months: [6, 7, 8] },
    { label: '4º Trimestre (Out - Dez)', months: [9, 10, 11] }
  ];

  const quarterlySummary: PeriodSummary[] = quarters.map(q => {
    const qOrders = baseYearOrders.filter(o => {
      const d = getOrderDate(o);
      return q.months.includes(d.getMonth());
    });
    return summarizeOrdersGroup(q.label, qOrders);
  });

  const semesters = [
    { label: '1º Semestre (Jan - Jun)', months: [0, 1, 2, 3, 4, 5] },
    { label: '2º Semestre (Jul - Dez)', months: [6, 7, 8, 9, 10, 11] }
  ];

  const semesterSummary: PeriodSummary[] = semesters.map(s => {
    const sOrders = baseYearOrders.filter(o => {
      const d = getOrderDate(o);
      return s.months.includes(d.getMonth());
    });
    return summarizeOrdersGroup(s.label, sOrders);
  });

  const annualSummary: PeriodSummary[] = [
    summarizeOrdersGroup(`Ano Consolidado (${currentYear})`, baseYearOrders)
  ];

  // 5. Dados mensais para o gráfico de evolução
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthlyData: MonthlyChartData[] = monthNames.map((mesLabel, mesIndex) => {
    const mOrders = baseYearOrders.filter(o => {
      const d = getOrderDate(o);
      return d.getMonth() === mesIndex;
    });

    let mInvest = 0;
    let mFat = 0;
    let mCusto = 0;
    let mPecas = 0;

    mOrders.forEach(o => {
      const items = o.items || [];
      const bruto = items.reduce((a, b) => a + (Number(b.valorTotalBruto) || 0), 0);
      const desc = (bruto * (Number(o.header.percentualDescontoOff) || 0)) / 100;
      const stVal = ((bruto - desc) * (Number(o.header.aliquotaSt) || 0)) / 100;
      mInvest += (bruto - desc + stVal + (Number(o.header.valorFreteGlobal) || 0));

      items.forEach(i => {
        if (!i || !i.descricao || i.descricao.trim() === '') return;
        const q = Number(i.qtdTotalUnidades) || 0;
        mPecas += q;
        mFat += q * (Number(i.pdvAlvo) || 0);
        mCusto += q * (Number(i.custoRealEfetivo) || Number(i.precoUnitario) || 0);
      });
    });

    return {
      mesLabel: `${mesLabel}/${String(currentYear).slice(2)}`,
      mesIndex,
      ano: currentYear,
      investimentoCompra: mInvest,
      faturamentoPdv: mFat,
      lucroReal: Math.max(0, mFat - mCusto),
      totalPecas: mPecas
    };
  });

  return {
    totalInvestido,
    totalPecas,
    faturamentoPdv,
    lucroReal,
    margemMedia,
    pedidosCount,
    ticketMedio,
    topItems,
    topSuppliers,
    quarterlySummary,
    semesterSummary,
    annualSummary,
    monthlyData,
    clusterAllocation
  };
}

function summarizeOrdersGroup(label: string, orders: PurchaseOrder[]): PeriodSummary {
  let invest = 0;
  let fat = 0;
  let custo = 0;
  let pecas = 0;
  let stVal = 0;

  orders.forEach(o => {
    const items = o.items || [];
    const bruto = items.reduce((a, b) => a + (Number(b.valorTotalBruto) || 0), 0);
    const desc = (bruto * (Number(o.header?.percentualDescontoOff) || 0)) / 100;
    const st = ((bruto - desc) * (Number(o.header?.aliquotaSt) || 0)) / 100;
    stVal += st;
    invest += (bruto - desc + st + (Number(o.header?.valorFreteGlobal) || 0));

    items.forEach(i => {
      if (!i || !i.descricao || i.descricao.trim() === '') return;
      const q = Number(i.qtdTotalUnidades) || 0;
      pecas += q;
      fat += q * (Number(i.pdvAlvo) || 0);
      custo += q * (Number(i.custoRealEfetivo) || Number(i.precoUnitario) || 0);
    });
  });

  const lucro = fat - custo - stVal;
  const margem = fat > 0 ? (lucro / fat) * 100 : 0;

  return {
    periodoLabel: label,
    totalInvestido: invest,
    faturamentoPdv: fat,
    lucroReal: lucro,
    margemPercentual: margem,
    totalPecas: pecas,
    pedidosCount: orders.length
  };
}
