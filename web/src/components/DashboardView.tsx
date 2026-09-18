import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Boxes, 
  PieChart, 
  Calendar, 
  Filter, 
  Building2, 
  Package, 
  Store, 
  Sparkles,
  ArrowUpRight,
  Receipt,
  Layers,
  ChevronRight,
  ShieldAlert,
  Clock,
  Percent,
  CheckCircle2,
  Lightbulb,
  Handshake,
  Target,
  ArrowDownRight,
  Plus
} from 'lucide-react';
import { PurchaseOrder, Supplier } from '../shared/types';
import { 
  DashboardFilter, 
  calculateDashboardMetrics, 
  MonthlyChartData,
  getOrderDate
} from '../utils/dashboardAnalytics';

interface DashboardViewProps {
  orders: PurchaseOrder[];
  suppliers: Supplier[];
  onSelectOrder?: (order: PurchaseOrder) => void;
  onNavigateToOrders?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  orders,
  suppliers,
  onSelectOrder,
  onNavigateToOrders
}) => {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // Considera estritamente pedidos reais com itens válidos registrados
  const allOrdersForDashboard = useMemo(() => {
    return (orders || []).filter(o => 
      o && 
      o.header && 
      Array.isArray(o.items) && 
      o.items.some(i => (Number(i.qtdTotalUnidades) || 0) > 0 || (Number(i.valorTotalBruto) || 0) > 0)
    );
  }, [orders]);

  // Filtros do Dashboard
  const [filter, setFilter] = useState<DashboardFilter>({
    periodPreset: 'ano',
    supplierId: 'all'
  });

  const [activeViewTab, setActiveViewTab] = useState<'geral' | 'trimestres' | 'itens' | 'fornecedores'>('geral');
  const [chartMetric, setChartMetric] = useState<'valores' | 'pecas'>('valores');

  // Estado do Filtro de Fornecedor na Aba de Barganha
  const [barganhaSupplierId, setBarganhaSupplierId] = useState<string>('all');

  // Métricas calculadas gerais
  const metrics = useMemo(() => {
    return calculateDashboardMetrics(allOrdersForDashboard, filter);
  }, [allOrdersForDashboard, filter]);

  // Maior valor para normalização do gráfico de barras mensal geral
  const maxMonthlyVal = useMemo(() => {
    return Math.max(...metrics.monthlyData.map(m => chartMetric === 'valores' ? m.faturamentoPdv : m.totalPecas), 100);
  }, [metrics.monthlyData, chartMetric]);

  const maxItemPecas = useMemo(() => {
    return metrics.topItems.length > 0 ? metrics.topItems[0].totalPecas : 1;
  }, [metrics.topItems]);

  const maxSupplierVal = useMemo(() => {
    return metrics.topSuppliers.length > 0 ? metrics.topSuppliers[0].totalInvestimento : 1;
  }, [metrics.topSuppliers]);

  // Porcentagens dinâmicas de alocação por cluster
  const totalClusterPecas = metrics.clusterAllocation.total;
  const pctA = totalClusterPecas > 0 ? (metrics.clusterAllocation.A / totalClusterPecas) * 100 : 0;
  const pctB = totalClusterPecas > 0 ? (metrics.clusterAllocation.B / totalClusterPecas) * 100 : 0;
  const pctC = totalClusterPecas > 0 ? (metrics.clusterAllocation.C / totalClusterPecas) * 100 : 0;

  // Dados filtrados de barganha para o fornecedor selecionado
  const selectedSupplierObj = useMemo(() => {
    if (barganhaSupplierId === 'all') return null;
    const cleanTarget = barganhaSupplierId.trim().toLowerCase();
    return suppliers.find(s => 
      s.id === barganhaSupplierId || 
      s.razaoSocial.trim().toLowerCase() === cleanTarget ||
      (s.nomeFantasia && s.nomeFantasia.trim().toLowerCase() === cleanTarget)
    ) || null;
  }, [barganhaSupplierId, suppliers]);

  const supplierOrders = useMemo(() => {
    if (barganhaSupplierId === 'all') return allOrdersForDashboard;
    const cleanTarget = barganhaSupplierId.trim().toLowerCase();
    return allOrdersForDashboard.filter(o => {
      if (o.header.supplierId === barganhaSupplierId) return true;
      const fornName = (o.header.fornecedor || '').trim().toLowerCase();
      if (fornName === cleanTarget) return true;
      if (selectedSupplierObj) {
        if (fornName === selectedSupplierObj.razaoSocial.trim().toLowerCase()) return true;
        if (selectedSupplierObj.nomeFantasia && fornName === selectedSupplierObj.nomeFantasia.trim().toLowerCase()) return true;
      }
      return false;
    });
  }, [allOrdersForDashboard, barganhaSupplierId, selectedSupplierObj]);

  const supplierBargainMetrics = useMemo(() => {
    let totalInvestido = 0;
    let totalPecas = 0;
    let faturamentoPdv = 0;
    let lucroReal = 0;
    let totalAvariasPecas = 0;

    const monthlyMap: Record<number, { invest: number; fat: number; pecas: number; lucro: number }> = {};
    for (let i = 0; i < 12; i++) monthlyMap[i] = { invest: 0, fat: 0, pecas: 0, lucro: 0 };

    const itemsMap = new Map<string, { codigo: string; descricao: string; pecas: number; caixas: number; invest: number; lucro: number }>();

    supplierOrders.forEach(ord => {
      const d = getOrderDate(ord);
      const mesIdx = d.getMonth();
      const items = ord.items || [];

      items.forEach(item => {
        if (!item || !item.descricao || item.descricao.trim() === '') return;
        const qtdTotal = Number(item.qtdTotalUnidades) || 0;
        const investItem = Number(item.valorTotalBruto) || 0;
        if (qtdTotal <= 0 && investItem <= 0) return;

        const fatItem = qtdTotal * (Number(item.pdvAlvo) || 0);
        const custoRealItem = qtdTotal * (Number(item.custoRealEfetivo) || Number(item.precoUnitario) || 0);
        const lucroItem = fatItem - custoRealItem;

        totalInvestido += investItem;
        totalPecas += qtdTotal;
        faturamentoPdv += fatItem;
        lucroReal += lucroItem;

        monthlyMap[mesIdx].invest += investItem;
        monthlyMap[mesIdx].fat += fatItem;
        monthlyMap[mesIdx].pecas += qtdTotal;
        monthlyMap[mesIdx].lucro += lucroItem;

        const key = (item.codigo && item.codigo.trim() !== '') ? item.codigo.trim().toUpperCase() : item.descricao.trim().toLowerCase();
        const curr = itemsMap.get(key) || { codigo: item.codigo || '', descricao: item.descricao, pecas: 0, caixas: 0, invest: 0, lucro: 0 };
        curr.pecas += qtdTotal;
        curr.caixas += (Number(item.qtdPacotes) || 0);
        curr.invest += investItem;
        curr.lucro += lucroItem;
        itemsMap.set(key, curr);
      });

      if (ord.inspection?.possuiAvarias && Array.isArray(ord.inspection?.avarias)) {
        ord.inspection.avarias.forEach(av => {
          totalAvariasPecas += Number(av.quantidade) || 0;
        });
      }
    });

    const monthShortNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthlyList: MonthlyChartData[] = monthShortNames.map((mesLabel, idx) => ({
      mesLabel: `${mesLabel}/${String(currentYear).slice(2)}`,
      mesIndex: idx,
      ano: currentYear,
      investimentoCompra: monthlyMap[idx].invest,
      faturamentoPdv: monthlyMap[idx].fat,
      lucroReal: monthlyMap[idx].lucro,
      totalPecas: monthlyMap[idx].pecas
    }));

    const margemMedia = faturamentoPdv > 0 ? (lucroReal / faturamentoPdv) * 100 : 0;
    const ticketMedio = supplierOrders.length > 0 ? totalInvestido / supplierOrders.length : 0;
    const topSupplierItems = Array.from(itemsMap.values()).sort((a, b) => b.invest - a.invest);

    // Média real calculada sobre o histórico de pedidos
    const totalDescontoSoma = supplierOrders.reduce((acc, o) => acc + (Number(o.header.percentualDescontoOff) || 0), 0);
    const avgDescontoOffReal = supplierOrders.length > 0 ? (totalDescontoSoma / supplierOrders.length) : (selectedSupplierObj?.descontoOffPadrao || 0);

    const totalStSoma = supplierOrders.reduce((acc, o) => acc + (Number(o.header.aliquotaSt) || 0), 0);
    const avgStReal = supplierOrders.length > 0 ? (totalStSoma / supplierOrders.length) : (selectedSupplierObj?.aliquotaStPadrao || 0);

    return {
      totalInvestido,
      totalPecas,
      faturamentoPdv,
      lucroReal,
      margemMedia,
      pedidosCount: supplierOrders.length,
      ticketMedio,
      totalAvariasPecas,
      avgDescontoOffReal,
      avgStReal,
      monthlyList,
      topSupplierItems
    };
  }, [supplierOrders, selectedSupplierObj, currentYear]);

  const maxSupplierMonthlyVal = useMemo(() => {
    return Math.max(...supplierBargainMetrics.monthlyList.map(m => m.investimentoCompra), 100);
  }, [supplierBargainMetrics.monthlyList]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header do Dashboard & Barra de Filtros de Período */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Painel Executivo & Business Intelligence (BI)
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    Jóia ERP
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Visão consolidada de compras, inteligência de barganha com fornecedores e lucratividade PDV
                </p>
              </div>
            </div>
          </div>

          {/* Presets de Período */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium self-start lg:self-auto">
            <button
              onClick={() => setFilter(prev => ({ ...prev, periodPreset: '30d' }))}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter.periodPreset === '30d' 
                  ? 'bg-emerald-600 text-white font-bold shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              30 Dias
            </button>
            <button
              onClick={() => setFilter(prev => ({ ...prev, periodPreset: 'trimestre' }))}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter.periodPreset === 'trimestre' 
                  ? 'bg-emerald-600 text-white font-bold shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Trimestre
            </button>
            <button
              onClick={() => setFilter(prev => ({ ...prev, periodPreset: 'semestre' }))}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter.periodPreset === 'semestre' 
                  ? 'bg-emerald-600 text-white font-bold shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semestre
            </button>
            <button
              onClick={() => setFilter(prev => ({ ...prev, periodPreset: 'ano' }))}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter.periodPreset === 'ano' 
                  ? 'bg-emerald-600 text-white font-bold shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Ano {currentYear}
            </button>
            <button
              onClick={() => setFilter(prev => ({ ...prev, periodPreset: 'tudo' }))}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter.periodPreset === 'tudo' 
                  ? 'bg-emerald-600 text-white font-bold shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Histórico
            </button>
          </div>
        </div>

        {/* Subtabs de Navegação do Dashboard */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/60 overflow-x-auto">
          <button
            onClick={() => setActiveViewTab('geral')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeViewTab === 'geral'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Visão Geral & Gráfico Anual
          </button>
          <button
            onClick={() => setActiveViewTab('trimestres')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeViewTab === 'trimestres'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Trimestres, Semestres & Anual
          </button>
          <button
            onClick={() => setActiveViewTab('itens')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeViewTab === 'itens'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Itens Mais Comprados ({metrics.topItems.length})
          </button>
          <button
            onClick={() => setActiveViewTab('fornecedores')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeViewTab === 'fornecedores'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Handshake className="w-3.5 h-3.5" />
            Barganha & Fornecedores ({metrics.topSuppliers.length})
          </button>
        </div>
      </div>

      {allOrdersForDashboard.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4 shadow-inner">
            <BarChart3 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Nenhum Pedido de Compra Registrado
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
            O Painel Executivo e BI consolida dados em tempo real a partir dos pedidos salvos no banco de dados. Cadastre seu primeiro pedido de compra para visualizar indicadores financeiros, evolução de faturamento PDV, curva de itens e inteligência de barganha.
          </p>
          {onNavigateToOrders && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={onNavigateToOrders}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Criar Novo Pedido de Compra
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 2. Cards Executivos de Resumo com Valores em Linha Única */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        
        {/* Total Compras */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Compras</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-sm xl:text-base font-extrabold text-slate-900 dark:text-white font-mono whitespace-nowrap tracking-tight" title={`R$ ${metrics.totalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}>
              <span className="text-xs font-semibold mr-1">R$</span>
              {metrics.totalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block truncate">
              {metrics.pedidosCount} {metrics.pedidosCount === 1 ? 'pedido no período' : 'pedidos no período'}
            </span>
          </div>
        </div>

        {/* Faturamento PDV */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Faturamento PDV</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <div className="text-sm xl:text-base font-extrabold text-blue-600 dark:text-blue-400 font-mono whitespace-nowrap tracking-tight" title={`R$ ${metrics.faturamentoPdv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}>
              <span className="text-xs font-semibold mr-1">R$</span>
              {metrics.faturamentoPdv.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block truncate">Projetado nas 20 lojas</span>
          </div>
        </div>

        {/* Lucro Líquido Real */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Lucro Líquido Real</span>
            <Receipt className="w-4 h-4 text-teal-500" />
          </div>
          <div>
            <div className="text-sm xl:text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap tracking-tight" title={`R$ ${metrics.lucroReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}>
              <span className="text-xs font-semibold mr-1">R$</span>
              {metrics.lucroReal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block truncate">Após impostos, 40% & ST</span>
          </div>
        </div>

        {/* Margem Média */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Margem Média</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div>
            <div className="text-sm xl:text-base font-extrabold text-slate-900 dark:text-white font-mono whitespace-nowrap tracking-tight">
              {metrics.margemMedia.toFixed(1)}%
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block truncate">
              Rentabilidade média
            </span>
          </div>
        </div>

        {/* Volume de Peças */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Volume de Peças</span>
            <Boxes className="w-4 h-4 text-purple-500" />
          </div>
          <div>
            <div className="text-sm xl:text-base font-extrabold text-slate-900 dark:text-white font-mono whitespace-nowrap tracking-tight">
              {metrics.totalPecas.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">un</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block truncate">
              Unidades totais compradas
            </span>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Ticket Médio</span>
            <DollarSign className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <div className="text-sm xl:text-base font-extrabold text-slate-900 dark:text-white font-mono whitespace-nowrap tracking-tight" title={`R$ ${metrics.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}>
              <span className="text-xs font-semibold mr-1">R$</span>
              {metrics.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block truncate">Média por pedido</span>
          </div>
        </div>

      </div>

      {/* SUB-ABA 1: VISÃO GERAL & GRÁFICO ANUAL */}
      {activeViewTab === 'geral' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Evolução Mensal de Compras vs Faturamento PDV ({currentYear})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Volume financeiro investido x receita gerada na ponta por mês
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-medium">
                  <button
                    onClick={() => setChartMetric('valores')}
                    className={`px-3 py-1 rounded-lg transition ${
                      chartMetric === 'valores' 
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs' 
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Valores (R$)
                  </button>
                  <button
                    onClick={() => setChartMetric('pecas')}
                    className={`px-3 py-1 rounded-lg transition ${
                      chartMetric === 'pecas' 
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs' 
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Peças (un)
                  </button>
                </div>
              </div>

              <div className="h-64 flex items-end gap-2 pt-8 pb-2 px-2 border-b border-slate-100 dark:border-slate-700">
                {metrics.monthlyData.map((m, idx) => {
                  const heightInvest = (m.investimentoCompra / maxMonthlyVal) * 100;
                  const heightFat = (m.faturamentoPdv / maxMonthlyVal) * 100;
                  const heightPecas = (m.totalPecas / maxMonthlyVal) * 100;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-14 bg-slate-900 text-white text-[10px] p-2 rounded-xl shadow-xl z-20 whitespace-nowrap transition-all duration-200">
                        <div className="font-bold text-emerald-400">{m.mesLabel}</div>
                        {chartMetric === 'valores' ? (
                          <>
                            <div>Compra: R$ {m.investimentoCompra.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
                            <div>PDV: R$ {m.faturamentoPdv.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
                            <div className="text-teal-300">Lucro: R$ {m.lucroReal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
                          </>
                        ) : (
                          <div>Total: {m.totalPecas.toLocaleString('pt-BR')} peças</div>
                        )}
                      </div>

                      {chartMetric === 'valores' ? (
                        <div className="w-full flex items-end justify-center gap-1 h-full">
                          <div 
                            style={{ height: `${Math.max(heightInvest, 4)}%` }} 
                            className="w-full max-w-[12px] bg-slate-300 dark:bg-slate-600 rounded-t-md group-hover:bg-emerald-500 transition-all duration-300" 
                          />
                          <div 
                            style={{ height: `${Math.max(heightFat, 4)}%` }} 
                            className="w-full max-w-[12px] bg-emerald-600 dark:bg-emerald-500 rounded-t-md group-hover:bg-emerald-400 transition-all duration-300 shadow-sm" 
                          />
                        </div>
                      ) : (
                        <div 
                          style={{ height: `${Math.max(heightPecas, 4)}%` }} 
                          className="w-full max-w-[20px] bg-indigo-600 dark:bg-indigo-500 rounded-t-md group-hover:bg-indigo-400 transition-all duration-300 shadow-sm" 
                        />
                      )}

                      <span className="text-[10px] font-medium text-slate-400 mt-2 truncate">
                        {m.mesLabel.split('/')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-6 mt-4 text-xs text-slate-500 dark:text-slate-400">
                {chartMetric === 'valores' ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-slate-300 dark:bg-slate-600" />
                      <span>Investimento de Compra</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-emerald-600" />
                      <span className="font-semibold text-slate-800 dark:text-white">Faturamento PDV Projetado</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-indigo-600" />
                    <span className="font-semibold text-slate-800 dark:text-white">Volume de Peças Distribuídas</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Store className="w-4 h-4 text-indigo-500" />
                    Rateio das 20 Lojas (39 Pts)
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {metrics.totalPecas.toLocaleString('pt-BR')} un
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                  Distribuição ponderada por porte de loja nos Clusters da rede
                </p>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-blue-600 dark:text-blue-400">Cluster A (8 Lojas Grandes • 20 Pts)</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {metrics.clusterAllocation.A.toLocaleString('pt-BR')} un ({pctA.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div style={{ width: `${pctA}%` }} className="h-full bg-blue-500 rounded-full transition-all duration-300" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-600 dark:text-slate-300">Cluster B (8 Lojas Médias • 14 Pts)</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {metrics.clusterAllocation.B.toLocaleString('pt-BR')} un ({pctB.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div style={{ width: `${pctB}%` }} className="h-full bg-slate-400 rounded-full transition-all duration-300" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-teal-600 dark:text-teal-400">Cluster C (4 Lojas/CD • 5 Pts)</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {metrics.clusterAllocation.C.toLocaleString('pt-BR')} un ({pctC.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div style={{ width: `${pctC}%` }} className="h-full bg-teal-500 rounded-full transition-all duration-300" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-100 dark:border-slate-700 mt-5">
                <button
                  onClick={onNavigateToOrders}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition flex items-center justify-center gap-2"
                >
                  Ir para Cotação & Rateio de Pedidos
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 2: TRIMESTRES, SEMESTRES & ANUAL */}
      {activeViewTab === 'trimestres' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              Consolidado por Trimestre (Q1, Q2, Q3, Q4)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Acompanhamento de metas e compras por período trimestral
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Trimestre</th>
                    <th className="py-3 px-4 text-center">Pedidos</th>
                    <th className="py-3 px-4 text-right">Volume (Peças)</th>
                    <th className="py-3 px-4 text-right">Total Compras</th>
                    <th className="py-3 px-4 text-right">Faturamento PDV</th>
                    <th className="py-3 px-4 text-right">Lucro Real</th>
                    <th className="py-3 px-4 text-center">Margem (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {metrics.quarterlySummary.map((q, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{q.periodoLabel}</td>
                      <td className="py-3.5 px-4 text-center font-mono">{q.pedidosCount}</td>
                      <td className="py-3.5 px-4 text-right font-mono">{q.totalPecas.toLocaleString('pt-BR')} un</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        R$ {q.totalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-blue-600 dark:text-blue-400 font-bold">
                        R$ {q.faturamentoPdv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                        R$ {q.lucroReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          q.margemPercentual >= 20 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {q.margemPercentual.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" />
                Comparativo por Semestre (S1 vs S2)
              </h3>
              <div className="space-y-3">
                {metrics.semesterSummary.map((s, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-white">{s.periodoLabel}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Margem: {s.margemPercentual.toFixed(1)}%
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] text-slate-400">Compras</div>
                        <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                          R$ {(s.totalInvestido / 1000).toFixed(1)}k
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] text-slate-400">Faturamento</div>
                        <div className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                          R$ {(s.faturamentoPdv / 1000).toFixed(1)}k
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] text-slate-400">Lucro Real</div>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          R$ {(s.lucroReal / 1000).toFixed(1)}k
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-4 h-4" />
                  Fechamento Anual Consolidado ({currentYear})
                </span>
                <h4 className="text-2xl font-extrabold text-white mt-1">
                  R$ {metrics.faturamentoPdv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  Receita total estimada na venda de {metrics.totalPecas.toLocaleString('pt-BR')} peças nas 20 lojas.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-700/80">
                <div>
                  <div className="text-[11px] text-slate-400">Total Investido em Compras</div>
                  <div className="text-base font-extrabold text-white mt-0.5">
                    R$ {metrics.totalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Lucro Líquido Real Projetado</div>
                  <div className="text-base font-extrabold text-emerald-400 mt-0.5">
                    R$ {metrics.lucroReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 3: ITENS MAIS COMPRADOS */}
      {activeViewTab === 'itens' && (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-500" />
                Ranking de Produtos Mais Comprados & Volume de Giro
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Itens com maior quantidade de peças adquiridas e rentabilidade gerada
              </p>
            </div>

            <div className="flex items-center gap-2 bg-emerald-50/70 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-300/80 dark:border-emerald-700 shadow-xs self-start sm:self-auto">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <label className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider whitespace-nowrap">
                Fornecedor:
              </label>
              <select
                value={filter.supplierId}
                onChange={(e) => setFilter(prev => ({ ...prev, supplierId: e.target.value }))}
                className="bg-transparent text-xs font-extrabold text-emerald-950 dark:text-white outline-hidden cursor-pointer max-w-[240px] truncate"
              >
                <option value="all" className="dark:bg-slate-800 dark:text-white">🏢 Todos os Fornecedores</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id} className="dark:bg-slate-800 dark:text-white">
                    {s.razaoSocial}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center">Posição</th>
                  <th className="py-3 px-3">Código & Descrição</th>
                  <th className="py-3 px-3 text-right">Qtd Unidades</th>
                  <th className="py-3 px-3 text-right">Total Compra (R$)</th>
                  <th className="py-3 px-3 text-right">Faturamento PDV (R$)</th>
                  <th className="py-3 px-3 text-right">Lucro Real (R$)</th>
                  <th className="py-3 px-3 text-center">Margem (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                {metrics.topItems.map((item, idx) => {
                  const sharePercent = maxItemPecas > 0 ? (item.totalPecas / maxItemPecas) * 100 : 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-extrabold text-xs ${
                          idx === 0 
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300' 
                            : idx === 1 
                            ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' 
                            : idx === 2 
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' 
                            : 'text-slate-400 font-mono'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{item.descricao}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {item.codigo ? `CÓD: ${item.codigo}` : 'S/ CÓDIGO'} • {item.pedidosCount} {item.pedidosCount === 1 ? 'pedido' : 'pedidos'}
                        </div>
                        <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-1.5">
                          <div style={{ width: `${sharePercent}%` }} className="h-full bg-emerald-500 rounded-full" />
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                        {item.totalPecas.toLocaleString('pt-BR')} un
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        R$ {item.totalInvestimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                        R$ {item.faturamentoPdv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                        R$ {item.lucroReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          item.margemMedia >= 20 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {item.margemMedia.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {metrics.topItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      Nenhum produto encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-ABA 4: PAINEL DE INTELIGÊNCIA DE BARGANHA & RANKING DE FORNECEDORES */}
      {activeViewTab === 'fornecedores' && (
        <div className="space-y-6">
          
          {/* 1. Header com Filtro de Fornecedor Dedicado */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Handshake className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Painel de Barganha & Inteligência de Negociação com Fornecedores
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Volume acumulado de compras, poder de barganha de preços, prazos e histórico mensal
              </p>
            </div>

            {/* Dropdown de Filtro */}
            <div className="flex items-center gap-2 bg-emerald-50/80 dark:bg-emerald-950/40 px-3.5 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-xs self-start sm:self-auto">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <label className="text-[11px] font-bold text-emerald-950 dark:text-emerald-300 uppercase tracking-wider whitespace-nowrap">
                Fornecedor:
              </label>
              <select
                value={barganhaSupplierId}
                onChange={(e) => setBarganhaSupplierId(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-emerald-950 dark:text-white outline-hidden cursor-pointer max-w-[260px] truncate"
              >
                <option value="all" className="dark:bg-slate-800 dark:text-white">🏢 Todos os Fornecedores (Visão Geral)</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id} className="dark:bg-slate-800 dark:text-white">
                    {s.razaoSocial}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Dossiê de Barganha do Fornecedor Selecionado */}
          {selectedSupplierObj ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Card de Identidade do Fornecedor */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 shadow-md border border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                      Dossiê de Barganha
                    </span>
                    {selectedSupplierObj.nomeFantasia && (
                      <span className="text-xs text-slate-300 font-semibold">• {selectedSupplierObj.nomeFantasia}</span>
                    )}
                  </div>
                  <h3 className="text-xl font-extrabold text-white mt-1.5">
                    {selectedSupplierObj.razaoSocial}
                  </h3>
                  <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>CNPJ: <span className="font-mono text-white">{selectedSupplierObj.cnpj || 'Não informado'}</span></span>
                    <span>Vendedor: <span className="text-white font-medium">{selectedSupplierObj.vendedorPadrao || 'N/A'}</span></span>
                    <span>Contato: <span className="font-mono text-emerald-400">{selectedSupplierObj.contatoVendedor || 'S/ Contato'}</span></span>
                    <span>Prazo Habitual: <span className="text-amber-300 font-bold">{selectedSupplierObj.condicaoPagamentoPadrao || '30/60/90'}</span></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-600 text-xs font-mono font-bold text-emerald-400">
                    ST Média: {supplierBargainMetrics.avgStReal > 0 ? `+${supplierBargainMetrics.avgStReal.toFixed(1)}%` : 'Isento (0%)'}
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-600 text-xs font-mono font-bold text-amber-300">
                    Desconto Médio: {supplierBargainMetrics.avgDescontoOffReal > 0 ? `${supplierBargainMetrics.avgDescontoOffReal.toFixed(1)}% OFF` : '0% OFF'}
                  </span>
                </div>
              </div>

              {/* 4 Cards de Poder de Negociação com o Fornecedor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Volume Total Investido</span>
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                  </span>
                  <div className="text-lg xl:text-xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono whitespace-nowrap tracking-tight">
                    R$ {supplierBargainMetrics.totalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block">
                    Em {supplierBargainMetrics.pedidosCount} {supplierBargainMetrics.pedidosCount === 1 ? 'pedido' : 'pedidos'} realizados
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Volume de Peças & Caixas</span>
                    <Boxes className="w-4 h-4 text-blue-500" />
                  </span>
                  <div className="text-lg xl:text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1 font-mono whitespace-nowrap tracking-tight">
                    {supplierBargainMetrics.totalPecas.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">un</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Unidades totais movimentadas com o fornecedor
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Ticket Médio por Ordem</span>
                    <Target className="w-4 h-4 text-amber-500" />
                  </span>
                  <div className="text-lg xl:text-xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono whitespace-nowrap tracking-tight">
                    R$ {supplierBargainMetrics.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Média financeira por cotação
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Lucro & Margem Gerados</span>
                    <Receipt className="w-4 h-4 text-teal-500" />
                  </span>
                  <div className="text-lg xl:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono whitespace-nowrap tracking-tight">
                    R$ {supplierBargainMetrics.lucroReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block">
                    Margem real média: {supplierBargainMetrics.margemMedia.toFixed(1)}%
                  </span>
                </div>

              </div>

              {/* 3. Gráfico de Evolução Mensal de Compras com Este Fornecedor */}
              <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      Evolução Mensal de Compras com {selectedSupplierObj.razaoSocial} ({currentYear})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Histórico mês a mês do volume financeiro investido na fábrica / distribuidora
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    Total: R$ {supplierBargainMetrics.totalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Barras do Gráfico */}
                <div className="h-56 flex items-end gap-2 pt-8 pb-2 px-2 border-b border-slate-100 dark:border-slate-700">
                  {supplierBargainMetrics.monthlyList.map((m, idx) => {
                    const heightPercent = maxSupplierMonthlyVal > 0 ? (m.investimentoCompra / maxSupplierMonthlyVal) * 100 : 0;

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                        <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-12 bg-slate-900 text-white text-[10px] p-2 rounded-xl shadow-xl z-20 whitespace-nowrap transition-all duration-200">
                          <div className="font-bold text-emerald-400">{m.mesLabel}</div>
                          <div>Compras: R$ {m.investimentoCompra.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
                          <div>Volume: {m.totalPecas.toLocaleString('pt-BR')} peças</div>
                        </div>

                        <div className="w-full flex items-end justify-center h-full">
                          <div 
                            style={{ height: `${Math.max(heightPercent, m.investimentoCompra > 0 ? 8 : 2)}%` }} 
                            className={`w-full max-w-[16px] rounded-t-md transition-all duration-300 ${
                              m.investimentoCompra > 0 
                                ? 'bg-emerald-600 dark:bg-emerald-500 group-hover:bg-emerald-400 shadow-xs' 
                                : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                          />
                        </div>

                        <span className="text-[10px] font-medium text-slate-400 mt-2 truncate">
                          {m.mesLabel.split('/')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Painel de Recomendações e Dicas Estratégicas de Barganha */}
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-emerald-50/50 dark:from-amber-950/20 dark:to-emerald-950/20 rounded-2xl border-2 border-amber-300/80 dark:border-amber-700/80 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-amber-200 dark:border-amber-800">
                  <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-sm font-extrabold text-amber-950 dark:text-amber-200">
                    Estratégia e Recomendações de Barganha para a Próxima Cotação
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                  
                  {/* Card 1: Desconto OFF */}
                  <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-amber-200/80 dark:border-amber-800/80 shadow-xs flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0">
                      <Percent className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">Alavancagem de Volume Comercial</h4>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                        A Jóia ERP já adquiriu <b>{supplierBargainMetrics.totalPecas.toLocaleString('pt-BR')} peças</b> (R$ {supplierBargainMetrics.totalInvestido.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}). Use este volume para solicitar <b>+3% a +5% de Desconto Comercial OFF</b> na próxima fatura.
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Prazos */}
                  <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-amber-200/80 dark:border-amber-800/80 shadow-xs flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">Ampliação de Prazo de Pagamento</h4>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                        Prazo praticado: <b>{selectedSupplierObj.condicaoPagamentoPadrao || '30/60/90 Dias'}</b>. Pelo histórico de {supplierBargainMetrics.pedidosCount} pedidos recorrentes, solicite extensão para <b>30/60/90/120 Dias</b> para preservar o fluxo de caixa da rede.
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Compensação de ST */}
                  <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-amber-200/80 dark:border-amber-800/80 shadow-xs flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">Compensação de Substituição Tributária (ST)</h4>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                        {supplierBargainMetrics.avgStReal > 0 ? (
                          <>Este fornecedor tem alíquota média de <b>+{supplierBargainMetrics.avgStReal.toFixed(1)}% de ST</b> nos pedidos. Negocie bonificação em mercadorias de alto giro (ex: 5% a mais em peças) para neutralizar o impacto fiscal de entrada.</>
                        ) : (
                          <>Fornecedor isento de ST (0% nos pedidos). Excelente para manter preços agressivos de venda no PDV das 20 lojas.</>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Card 4: Qualidade & Doca */}
                  <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-amber-200/80 dark:border-amber-800/80 shadow-xs flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 shrink-0">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">Conferência de Doca & Avarias</h4>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                        {supplierBargainMetrics.totalAvariasPecas > 0 ? (
                          <>Foram apontadas <b>{supplierBargainMetrics.totalAvariasPecas} peças em avaria</b> no recebimento. Utilize esse histórico para exigir paletização padrão PBR e abatimento em duplicata.</>
                        ) : (
                          <>Cargas entregues com 100% de integridade física. Excelente índice de qualidade na doca.</>
                        )}
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* 5. Tabela de Produtos Fornecidos por Ele */}
              <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-500" />
                  Produtos Mais Comprados de {selectedSupplierObj.razaoSocial}
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-3">Código & Descrição</th>
                        <th className="py-3 px-3 text-right">Qtd Peças</th>
                        <th className="py-3 px-3 text-right">Caixas</th>
                        <th className="py-3 px-3 text-right">Total Investido (R$)</th>
                        <th className="py-3 px-3 text-right">Lucro Gerado (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {supplierBargainMetrics.topSupplierItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                            {item.descricao} {item.codigo && <span className="text-slate-400 font-mono text-[11px]">({item.codigo})</span>}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                            {item.pecas.toLocaleString('pt-BR')} un
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-500">
                            {item.caixas.toLocaleString('pt-BR')} cx
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            R$ {item.invest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                            R$ {item.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      {supplierBargainMetrics.topSupplierItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                            Nenhum item registrado para este fornecedor.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            /* 3. Tabela Comparativa de Todos os Fornecedores (Visão Geral) */
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Ranking Comparativo de Todos os Fornecedores
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Selecione um fornecedor no filtro acima para abrir o dossiê detalhado de barganha
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-3 text-center">Posição</th>
                      <th className="py-3 px-3">Razão Social / Nome Fantasia</th>
                      <th className="py-3 px-3 text-center">Pedidos</th>
                      <th className="py-3 px-3 text-right">Volume (Peças)</th>
                      <th className="py-3 px-3 text-right">Total Investido (R$)</th>
                      <th className="py-3 px-3 text-right">Lucro Gerado (R$)</th>
                      <th className="py-3 px-3 text-center">Alíquota ST</th>
                      <th className="py-3 px-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {metrics.topSuppliers.map((sup, idx) => {
                      const sharePercent = maxSupplierVal > 0 ? (sup.totalInvestimento / maxSupplierVal) * 100 : 0;

                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-extrabold text-xs ${
                              idx === 0 
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300' 
                                : idx === 1 
                                ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' 
                                : idx === 2 
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' 
                                : 'text-slate-400 font-mono'
                            }`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {sup.razaoSocial}
                            </div>
                            <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-1.5">
                              <div style={{ width: `${sharePercent}%` }} className="h-full bg-emerald-500 rounded-full" />
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold">
                            {sup.pedidosCount}
                          </td>
                          <td className="py-3 px-3 text-right font-mono">
                            {sup.totalPecas.toLocaleString('pt-BR')} un
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                            R$ {sup.totalInvestimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                            R$ {sup.totalLucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {sup.aliquotaStMedia > 0 ? `+${sup.aliquotaStMedia.toFixed(1)}% ST` : 'Isento (0%)'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => setBarganhaSupplierId(sup.id)}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 transition"
                            >
                              Ver Dossiê
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {metrics.topSuppliers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                          Nenhum fornecedor registrado para os filtros selecionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
        </>
      )}

    </div>
  );
};
