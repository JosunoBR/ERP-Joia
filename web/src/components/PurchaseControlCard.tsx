import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Filter, 
  RotateCcw, 
  DollarSign, 
  Package, 
  Tag, 
  Trophy, 
  TrendingUp, 
  ArrowUpRight, 
  Search, 
  Boxes, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Receipt
} from 'lucide-react';
import { PurchaseOrder } from '../shared/types';
import { toBrDate } from '../utils/masks';

interface PurchaseControlCardProps {
  orders: PurchaseOrder[];
  onSelectOrder?: (order: PurchaseOrder) => void;
  onFilterChange?: (filteredOrderIds: Set<string> | null) => void;
}

interface AggregatedProduct {
  key: string;
  codigo: string;
  codigoInterno: string;
  descricao: string;
  fornecedor: string;
  maiorPrecoUnitario: number;
  menorPrecoUnitario: number;
  precoMedioUnitario: number;
  qtdTotalPecas: number;
  valorTotalFinanceiro: number;
  pedidosCount: number;
  exemplosPedidos: string[];
}

const MONTH_NAMES = [
  { value: '01', label: 'Jan', fullName: 'Janeiro' },
  { value: '02', label: 'Fev', fullName: 'Fevereiro' },
  { value: '03', label: 'Mar', fullName: 'Março' },
  { value: '04', label: 'Abr', fullName: 'Abril' },
  { value: '05', label: 'Mai', fullName: 'Maio' },
  { value: '06', label: 'Jun', fullName: 'Junho' },
  { value: '07', label: 'Jul', fullName: 'Julho' },
  { value: '08', label: 'Ago', fullName: 'Agosto' },
  { value: '09', label: 'Set', fullName: 'Setembro' },
  { value: '10', label: 'Out', fullName: 'Outubro' },
  { value: '11', label: 'Nov', fullName: 'Novembro' },
  { value: '12', label: 'Dez', fullName: 'Dezembro' },
];

function extractOrderDate(order: PurchaseOrder): { year: string; month: string; dateObj: Date | null } {
  const raw = order.header?.dataPedido || order.header?.createdAt;
  if (!raw) return { year: '', month: '', dateObj: null };
  const str = String(raw).trim();

  // Formato YYYY-MM-DD ou ISO
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2];
    const d = isoMatch[3];
    return {
      year: y,
      month: m,
      dateObj: new Date(Number(y), Number(m) - 1, Number(d))
    };
  }

  // Formato brasileiro DD/MM/AAAA
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    const d = brMatch[1];
    const m = brMatch[2].padStart(2, '0');
    const y = brMatch[3];
    return {
      year: y,
      month: m,
      dateObj: new Date(Number(y), Number(m) - 1, Number(d))
    };
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = String(parsed.getFullYear());
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    return { year: y, month: m, dateObj: parsed };
  }

  return { year: '', month: '', dateObj: null };
}

export const PurchaseControlCard: React.FC<PurchaseControlCardProps> = ({
  orders,
  onSelectOrder,
  onFilterChange
}) => {
  // Controle de expansão/recolhimento do card (retrátil)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Filtros
  const [selectedYear, setSelectedYear] = useState<string>('todos');
  const [selectedMonth, setSelectedMonth] = useState<string>('todos');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('todos');
  const [syncWithTable, setSyncWithTable] = useState<boolean>(true);

  // Navegação interna do card (Abas)
  const [activeTab, setActiveTab] = useState<'kpis' | 'produtos' | 'pedidos'>('kpis');

  // Filtros da tabela interna de produtos
  const [productSearch, setProductSearch] = useState<string>('');
  const [productSortBy, setProductSortBy] = useState<'maiorPreco' | 'menorPreco' | 'maiorQtd' | 'maiorTotal'>('maiorPreco');

  // Anos disponíveis nos pedidos
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    orders.forEach(o => {
      const { year } = extractOrderDate(o);
      if (year && year.length === 4) {
        yearsSet.add(year);
      }
    });
    if (yearsSet.size === 0) {
      yearsSet.add(String(new Date().getFullYear()));
    }
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [orders]);

  // Fornecedores disponíveis
  const availableSuppliers = useMemo(() => {
    const suppSet = new Set<string>();
    orders.forEach(o => {
      if (o.header?.fornecedor) {
        suppSet.add(o.header.fornecedor.trim());
      }
    });
    return Array.from(suppSet).sort((a, b) => a.localeCompare(b));
  }, [orders]);

  // Pedidos filtrados pelo período e filtros do card
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const { year, month } = extractOrderDate(order);

      if (selectedYear !== 'todos' && year !== selectedYear) {
        return false;
      }

      if (selectedMonth !== 'todos' && month !== selectedMonth) {
        return false;
      }

      if (selectedSupplier !== 'todos' && (order.header?.fornecedor || '').trim() !== selectedSupplier) {
        return false;
      }

      return true;
    });
  }, [orders, selectedYear, selectedMonth, selectedSupplier]);

  // Sincronizar com a tabela externa de pedidos se habilitado
  React.useEffect(() => {
    if (!onFilterChange) return;

    if (!syncWithTable || (selectedYear === 'todos' && selectedMonth === 'todos' && selectedSupplier === 'todos')) {
      onFilterChange(null);
    } else {
      const ids = new Set<string>();
      filteredOrders.forEach(o => {
        if (o.id) ids.add(o.id);
        if (o.header?.id) ids.add(o.header.id);
      });
      onFilterChange(ids);
    }
  }, [filteredOrders, syncWithTable, selectedYear, selectedMonth, selectedSupplier, onFilterChange]);

  // Limpar filtros
  const handleResetFilters = () => {
    setSelectedYear('todos');
    setSelectedMonth('todos');
    setSelectedSupplier('todos');
  };

  // Atalhos rápidos
  const handleSetCurrentYear = () => {
    const currentYear = String(new Date().getFullYear());
    setSelectedYear(availableYears.includes(currentYear) ? currentYear : availableYears[0] || 'todos');
    setSelectedMonth('todos');
  };

  const handleSetCurrentMonth = () => {
    const now = new Date();
    const currentYear = String(now.getFullYear());
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    setSelectedYear(availableYears.includes(currentYear) ? currentYear : availableYears[0] || 'todos');
    setSelectedMonth(currentMonth);
  };

  const isAnyFilterActive = selectedYear !== 'todos' || selectedMonth !== 'todos' || selectedSupplier !== 'todos';

  // =========================================================================
  // CÁLCULO DOS INDICADORES E DAS MÉTRICAS SOLICITADAS
  // =========================================================================

  // 1. Total Comprado (e Maior Pedido)
  const { totalComprado, maiorPedido } = useMemo<{
    totalComprado: number;
    maiorPedido: { valor: number; order: PurchaseOrder | null } | null;
  }>(() => {
    let total = 0;
    let maior: { valor: number; order: PurchaseOrder | null } = { valor: -1, order: null };

    filteredOrders.forEach(order => {
      const totalOrder = order.items.reduce((sum, item) => sum + (Number(item.valorTotalBruto) || 0), 0);
      total += totalOrder;

      if (totalOrder > maior.valor) {
        maior = { valor: totalOrder, order };
      }
    });

    return {
      totalComprado: total,
      maiorPedido: maior.order ? { ...maior, valor: maior.valor } : null
    };
  }, [filteredOrders]);

  // 2. Quantidade de Produtos e Agrupamento por SKU
  const aggregatedProducts = useMemo(() => {
    const map = new Map<string, AggregatedProduct>();

    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.ruptura) return;

        const cod = (item.codigo || item.codigoInterno || item.codigoBarras || '').trim();
        const desc = (item.descricao || 'Produto sem descrição').trim();
        const key = cod ? `${cod}___${desc}` : desc;

        const precoUnit = Number(item.precoUnitario) || (item.qtdTotalUnidades > 0 ? (item.valorTotalBruto || 0) / item.qtdTotalUnidades : 0);
        const qtdPecas = Number(item.qtdTotalUnidades) || 0;
        const valorFinanceiro = Number(item.valorTotalBruto) || (precoUnit * qtdPecas);

        if (!map.has(key)) {
          map.set(key, {
            key,
            codigo: cod,
            codigoInterno: item.codigoInterno || '',
            descricao: desc,
            fornecedor: order.header?.fornecedor || '',
            maiorPrecoUnitario: precoUnit,
            menorPrecoUnitario: precoUnit,
            precoMedioUnitario: precoUnit,
            qtdTotalPecas: qtdPecas,
            valorTotalFinanceiro: valorFinanceiro,
            pedidosCount: 1,
            exemplosPedidos: [order.header?.numeroPedido || 'S/N']
          });
        } else {
          const existing = map.get(key)!;
          existing.qtdTotalPecas += qtdPecas;
          existing.valorTotalFinanceiro += valorFinanceiro;
          existing.pedidosCount += 1;
          if (!existing.exemplosPedidos.includes(order.header?.numeroPedido || '')) {
            existing.exemplosPedidos.push(order.header?.numeroPedido || '');
          }
          if (precoUnit > existing.maiorPrecoUnitario) {
            existing.maiorPrecoUnitario = precoUnit;
          }
          if (precoUnit < existing.menorPrecoUnitario && precoUnit > 0) {
            existing.menorPrecoUnitario = precoUnit;
          }
          existing.precoMedioUnitario = existing.qtdTotalPecas > 0 
            ? existing.valorTotalFinanceiro / existing.qtdTotalPecas 
            : existing.maiorPrecoUnitario;
        }
      });
    });

    return Array.from(map.values());
  }, [filteredOrders]);

  const totalProdutosDistintos = aggregatedProducts.length;
  const totalPecasGeral = useMemo(() => {
    return aggregatedProducts.reduce((sum, p) => sum + p.qtdTotalPecas, 0);
  }, [aggregatedProducts]);

  // 3. Média de Preço de Produto (e Maior Preço)
  const { mediaPrecoPonderada, produtoMaiorPreco } = useMemo<{
    mediaPrecoPonderada: number;
    produtoMaiorPreco: AggregatedProduct | null;
  }>(() => {
    if (aggregatedProducts.length === 0) {
      return { mediaPrecoPonderada: 0, produtoMaiorPreco: null };
    }

    const ponderada = totalPecasGeral > 0 ? totalComprado / totalPecasGeral : 0;

    let maxProd: AggregatedProduct | null = null;
    let maxPreco = -1;

    aggregatedProducts.forEach(p => {
      if (p.maiorPrecoUnitario > maxPreco) {
        maxPreco = p.maiorPrecoUnitario;
        maxProd = p;
      }
    });

    return {
      mediaPrecoPonderada: ponderada,
      produtoMaiorPreco: maxProd
    };
  }, [aggregatedProducts, totalComprado, totalPecasGeral]);

  // 4. Média de % de Nota Fiscal
  const { mediaPercentualNota, totalValorFaturadoNF } = useMemo(() => {
    if (filteredOrders.length === 0) {
      return { mediaPercentualNota: 100, totalValorFaturadoNF: 0 };
    }

    let somaNotasPonderadas = 0;
    let totalValor = 0;
    let somaNotasSimples = 0;

    filteredOrders.forEach(order => {
      const notaPct = order.header?.percentualNota !== undefined ? Number(order.header.percentualNota) : 100;
      const orderTotal = order.items.reduce((sum, item) => sum + (Number(item.valorTotalBruto) || 0), 0);
      
      somaNotasSimples += notaPct;
      somaNotasPonderadas += (notaPct / 100) * orderTotal;
      totalValor += orderTotal;
    });

    const mediaSimples = somaNotasSimples / filteredOrders.length;
    return {
      mediaPercentualNota: mediaSimples,
      totalValorFaturadoNF: somaNotasPonderadas
    };
  }, [filteredOrders]);

  // Lista de produtos filtrada para a aba de navegação
  const filteredProductList = useMemo(() => {
    let list = aggregatedProducts;
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase().trim();
      list = list.filter(p => 
        p.descricao.toLowerCase().includes(q) || 
        p.codigo.toLowerCase().includes(q) || 
        p.fornecedor.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (productSortBy === 'maiorPreco') return b.maiorPrecoUnitario - a.maiorPrecoUnitario;
      if (productSortBy === 'menorPreco') return a.maiorPrecoUnitario - b.maiorPrecoUnitario;
      if (productSortBy === 'maiorQtd') return b.qtdTotalPecas - a.qtdTotalPecas;
      if (productSortBy === 'maiorTotal') return b.valorTotalFinanceiro - a.valorTotalFinanceiro;
      return 0;
    });
  }, [aggregatedProducts, productSearch, productSortBy]);

  // Lista de pedidos ordenados por valor para a aba de Maiores Pedidos
  const sortedOrdersByValue = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      const totalA = a.items.reduce((s, i) => s + (i.valorTotalBruto || 0), 0);
      const totalB = b.items.reduce((s, i) => s + (i.valorTotalBruto || 0), 0);
      return totalB - totalA;
    });
  }, [filteredOrders]);

  // Texto do período selecionado
  const periodText = useMemo(() => {
    if (selectedYear === 'todos' && selectedMonth === 'todos') return 'Todo o Histórico';
    const monthObj = MONTH_NAMES.find(m => m.value === selectedMonth);
    const monthLabel = monthObj ? monthObj.fullName : 'Todos os Meses';
    if (selectedYear !== 'todos' && selectedMonth !== 'todos') {
      return `${monthLabel} de ${selectedYear}`;
    }
    if (selectedYear !== 'todos') {
      return `Ano de ${selectedYear}`;
    }
    return `Todos os anos (${monthLabel})`;
  }, [selectedYear, selectedMonth]);

  return (
    <div className="bg-white dark:bg-slate-800/95 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 p-5 shadow-sm space-y-4 transition-all">
      
      {/* 1. TOPO: TÍTULO, BADGE DE PERÍODO, RESUMO RÁPIDO (SE RECOLHIDO) E BOTÃO RETRÁTIL */}
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 cursor-pointer select-none group"
      >
        {/* Lado Esquerdo: Ícone + Título + Período */}
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md shadow-indigo-500/20 shrink-0 mt-0.5">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                Controle de Compras
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {periodText}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Análise comparativa de preços médios, volumes e maiores compras
            </p>
          </div>
        </div>

        {/* Lado Direito: Resumo Rápido (se recolhido) + Ações e Botão Retrátil */}
        <div className="flex items-center gap-2.5 self-start lg:self-auto" onClick={(e) => e.stopPropagation()}>
          
          {/* Resumo compacto quando o card está recolhido */}
          {isCollapsed && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                💰 R$ {totalComprado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                📦 {totalProdutosDistintos} SKUs ({totalPecasGeral.toLocaleString('pt-BR')} un)
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                🏷️ Média R$ {mediaPrecoPonderada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
                🏷️ {mediaPercentualNota.toFixed(1)}% OFF
              </span>
            </div>
          )}

          {/* Atalhos Rápidos de Período quando expandido */}
          {!isCollapsed && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={handleResetFilters}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  !isAnyFilterActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Histórico Completo
              </button>
              <button
                onClick={handleSetCurrentYear}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedYear === String(new Date().getFullYear()) && selectedMonth === 'todos'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Ano Atual ({new Date().getFullYear()})
              </button>
              <button
                onClick={handleSetCurrentMonth}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedMonth === String(new Date().getMonth() + 1).padStart(2, '0')
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Mês Atual
              </button>
            </div>
          )}

          {/* Botão Retrátil (Expandir / Recolher) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs"
            title={isCollapsed ? "Expandir card de controle de compras" : "Recolher card"}
          >
            <span>{isCollapsed ? 'Expandir' : 'Recolher'}</span>
            {isCollapsed ? <ChevronDown className="w-4 h-4 text-indigo-500" /> : <ChevronUp className="w-4 h-4 text-indigo-500" />}
          </button>

        </div>
      </div>

      {/* CONTEÚDO EXPANSÍVEL */}
      {!isCollapsed && (
        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
          
          {/* 2. LINHA DE FILTROS: ANO, MÊS, FORNECEDOR E SINCRONIZAÇÃO */}
          <div className="bg-slate-50/80 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 mr-1">
                <Filter className="w-3.5 h-3.5 text-indigo-500" />
                <span>Filtros:</span>
              </div>

              {/* Filtro de Ano */}
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Ano:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-hidden cursor-pointer shadow-2xs"
                >
                  <option value="todos">Todos os Anos</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Filtro de Mês */}
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Mês:</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-hidden cursor-pointer shadow-2xs"
                >
                  <option value="todos">Todos os Meses</option>
                  {MONTH_NAMES.map(m => (
                    <option key={m.value} value={m.value}>{m.value} - {m.fullName}</option>
                  ))}
                </select>
              </div>

              {/* Filtro de Fornecedor */}
              {availableSuppliers.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Fornecedor:</label>
                  <select
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="max-w-[180px] truncate px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-hidden cursor-pointer shadow-2xs"
                  >
                    <option value="todos">Todos os Fornecedores</option>
                    {availableSuppliers.map(sup => (
                      <option key={sup} value={sup}>{sup}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Botão Reset */}
              {isAnyFilterActive && (
                <button
                  onClick={handleResetFilters}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                  title="Limpar todos os filtros"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Informações da Amostragem & Checkbox de sincronização */}
            <div className="flex items-center gap-3 text-xs">
              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                <b>{filteredOrders.length}</b> {filteredOrders.length === 1 ? 'pedido' : 'pedidos'} analisados
              </span>

              <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={syncWithTable}
                  onChange={(e) => setSyncWithTable(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 cursor-pointer"
                />
                <span>Filtrar lista abaixo</span>
              </label>
            </div>

          </div>

          {/* 3. OS CARDS DE MÉTRICAS (TOTAL COMPRADO, QTD PRODUTOS, MÉDIA PREÇO, MÉDIA % NOTA) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            {/* CARD 1: TOTAL COMPRADO (MAIOR) */}
            <div className="bg-gradient-to-br from-white to-blue-50/40 dark:from-slate-800 dark:to-blue-950/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 shadow-2xs hover:border-blue-300 transition group">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                  <DollarSign className="w-4 h-4" />
                  Total Comprado
                </span>
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                  Volume Financeiro
                </span>
              </div>

              <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400 font-mono tracking-tight mt-1">
                R$ {totalComprado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>

              {/* Destaque do MAIOR Pedido */}
              <div className="mt-3 pt-2.5 border-t border-blue-100/80 dark:border-blue-900/40 text-[11px]">
                {maiorPedido ? (
                  <div 
                    className="cursor-pointer group-hover:text-blue-700 dark:group-hover:text-blue-300 transition"
                    onClick={() => maiorPedido.order && onSelectOrder && onSelectOrder(maiorPedido.order)}
                    title="Clique para abrir o maior pedido"
                  >
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-medium">
                      <span className="flex items-center gap-1 font-bold text-blue-800 dark:text-blue-300">
                        <Trophy className="w-3 h-3 text-amber-500" />
                        Maior Pedido:
                      </span>
                      <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                        R$ {maiorPedido.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5 flex items-center justify-between">
                      <span className="truncate">{maiorPedido.order?.header.numeroPedido} • {maiorPedido.order?.header.fornecedor}</span>
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition shrink-0 ml-1 text-blue-500" />
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-400 text-[10px]">Nenhum pedido no período</span>
                )}
              </div>
            </div>

            {/* CARD 2: QUANTIDADE DE PRODUTOS */}
            <div className="bg-gradient-to-br from-white to-emerald-50/40 dark:from-slate-800 dark:to-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50 shadow-2xs hover:border-emerald-300 transition">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <Package className="w-4 h-4" />
                  Quantidade de Produtos
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  {totalProdutosDistintos} SKUs
                </span>
              </div>

              <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight mt-1">
                {totalProdutosDistintos.toLocaleString('pt-BR')}{' '}
                <span className="text-xs font-normal text-slate-400">produtos</span>
              </div>

              {/* Detalhe de Volume Total de Peças */}
              <div className="mt-3 pt-2.5 border-t border-emerald-100/80 dark:border-emerald-900/40 text-[11px]">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-medium">
                  <span className="flex items-center gap-1 font-bold text-emerald-800 dark:text-emerald-300">
                    <Boxes className="w-3 h-3 text-emerald-500" />
                    Volume Total:
                  </span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                    {totalPecasGeral.toLocaleString('pt-BR')} peças
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
                  <span>Média por pedido:</span>
                  <span className="font-mono font-semibold">
                    {filteredOrders.length > 0 ? Math.round(totalPecasGeral / filteredOrders.length).toLocaleString('pt-BR') : 0} un
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 3: MÉDIA DE PREÇO DE PRODUTO (MAIOR) */}
            <div className="bg-gradient-to-br from-white to-amber-50/40 dark:from-slate-800 dark:to-amber-950/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/50 shadow-2xs hover:border-amber-300 transition">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <Tag className="w-4 h-4" />
                  Média Preço de Produto
                </span>
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                  Unitário Médio
                </span>
              </div>

              <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight mt-1">
                R$ {mediaPrecoPonderada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              {/* Destaque do PRODUTO DE MAIOR PREÇO */}
              <div className="mt-3 pt-2.5 border-t border-amber-100/80 dark:border-amber-900/40 text-[11px]">
                {produtoMaiorPreco ? (
                  <div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-medium">
                      <span className="flex items-center gap-1 font-bold text-amber-800 dark:text-amber-300 truncate max-w-[120px]" title="Produto de maior valor unitário">
                        <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                        Maior Preço:
                      </span>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-300 shrink-0">
                        R$ {produtoMaiorPreco.maiorPrecoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5" title={`${produtoMaiorPreco.descricao} (${produtoMaiorPreco.fornecedor})`}>
                      {produtoMaiorPreco.descricao}
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-400 text-[10px]">Sem produtos no período</span>
                )}
              </div>
            </div>

            {/* CARD 4: MÉDIA DE % OFF */}
            <div className="bg-gradient-to-br from-white to-purple-50/40 dark:from-slate-800 dark:to-purple-950/20 p-4 rounded-xl border border-purple-100 dark:border-purple-900/50 shadow-2xs hover:border-purple-300 transition">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400">
                  <Receipt className="w-4 h-4" />
                  Média % OFF
                </span>
                <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                  OFF %
                </span>
              </div>

              <div className="text-xl font-extrabold text-purple-600 dark:text-purple-400 font-mono tracking-tight mt-1 flex items-baseline gap-2">
                <span>{mediaPercentualNota.toFixed(1)}%</span>
                <span className="text-[10px] font-normal text-slate-400">média dos pedidos</span>
              </div>

              {/* Barra de Progresso e Total Faturado */}
              <div className="mt-3 pt-2.5 border-t border-purple-100/80 dark:border-purple-900/40 text-[11px]">
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden mb-1.5">
                  <div 
                    className="bg-purple-600 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.max(0, mediaPercentualNota))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span>Faturado oficial:</span>
                  <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                    R$ {totalValorFaturadoNF.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* 4. ABAS DE NAVEGAÇÃO INTERNA DO CARD */}
          <div className="border-t border-slate-100 dark:border-slate-700/60 pt-4 space-y-4">
            
            {/* Barra de Seleção de Abas */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800">
                
                <button
                  onClick={() => setActiveTab('kpis')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'kpis'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Visão Geral</span>
                </button>

                <button
                  onClick={() => setActiveTab('produtos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'produtos'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                  <span>Ranking de Produtos (Preços)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono font-bold">
                    {totalProdutosDistintos}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('pedidos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'pedidos'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-blue-500" />
                  <span>Maiores Pedidos</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-mono font-bold">
                    {filteredOrders.length}
                  </span>
                </button>

              </div>

              <span className="text-[11px] text-slate-400 font-medium">
                Navegue pelos detalhes analíticos do período
              </span>
            </div>

            {/* CONTEÚDO DA ABA 1: VISÃO GERAL */}
            {activeTab === 'kpis' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                
                {/* Card de Destaques: Maiores Compras */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/70 dark:border-slate-700/60 space-y-3">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>Extremos de Compra</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Maior Pedido do Período</div>
                      {maiorPedido ? (
                        <div className="mt-1 flex items-baseline justify-between">
                          <div>
                            <div className="font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                              R$ {maiorPedido.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {maiorPedido.order?.header.numeroPedido} • {maiorPedido.order?.header.fornecedor}
                            </div>
                          </div>
                          {onSelectOrder && maiorPedido.order && (
                            <button
                              onClick={() => onSelectOrder(maiorPedido.order!)}
                              className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 text-[10px] font-bold hover:bg-blue-100 transition cursor-pointer"
                            >
                              Abrir
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Nenhum</span>
                      )}
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Produto com Maior Preço Unitário</div>
                      {produtoMaiorPreco ? (
                        <div className="mt-1">
                          <div className="flex items-baseline justify-between">
                            <span className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]" title={produtoMaiorPreco.descricao}>
                              {produtoMaiorPreco.descricao}
                            </span>
                            <span className="font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                              R$ {produtoMaiorPreco.maiorPrecoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {produtoMaiorPreco.codigo ? `Cód: ${produtoMaiorPreco.codigo} • ` : ''}{produtoMaiorPreco.fornecedor}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Nenhum</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card de Médias e Comportamento */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/70 dark:border-slate-700/60 space-y-3">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span>Médias Operacionais</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Ticket Médio por Ordem:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        R$ {(filteredOrders.length > 0 ? totalComprado / filteredOrders.length : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Preço Médio Unitário:</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        R$ {mediaPrecoPonderada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Itens Distintos por Pedido:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {filteredOrders.length > 0 ? (totalProdutosDistintos / filteredOrders.length).toFixed(1) : 0} SKUs
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* CONTEÚDO DA ABA 2: RANKING DE PRODUTOS */}
            {activeTab === 'produtos' && (
              <div className="space-y-3 pt-1">
                
                {/* Barra de Busca e Ordenação de Produtos */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Pesquisar produto, código ou fornecedor..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-hidden"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Ordenar por:</span>
                    <select
                      value={productSortBy}
                      onChange={(e) => setProductSortBy(e.target.value as any)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-hidden cursor-pointer shadow-2xs"
                    >
                      <option value="maiorPreco">💎 Maior Preço Unitário</option>
                      <option value="menorPreco">Menor Preço Unitário</option>
                      <option value="maiorQtd">📦 Maior Quantidade (Peças)</option>
                      <option value="maiorTotal">💰 Maior Valor Financeiro (R$)</option>
                    </select>
                  </div>
                </div>

                {/* Tabela de Produtos */}
                <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-700/80 max-h-[360px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3 min-w-[220px]">Produto / Descrição</th>
                        <th className="py-2.5 px-3 min-w-[150px]">Fornecedor</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[110px]">
                          {productSortBy === 'maiorPreco' ? '★ Maior Preço Unit.' : 'Preço Unitário'}
                        </th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[100px]">Preço Médio</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[90px]">Qtd Peças</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[120px]">Total Investido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {filteredProductList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-slate-400">
                            Nenhum produto encontrado no período selecionado.
                          </td>
                        </tr>
                      ) : (
                        filteredProductList.map((prod, idx) => {
                          const isTopPrice = idx === 0 && productSortBy === 'maiorPreco';
                          return (
                            <tr key={prod.key} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${isTopPrice ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}`}>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  {isTopPrice && <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                  <span>{prod.descricao}</span>
                                </div>
                                {prod.codigo && (
                                  <span className="text-[10px] font-mono text-slate-400 block">
                                    Cód: {prod.codigo}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                {prod.fornecedor || '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-extrabold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                R$ {prod.maiorPrecoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                R$ {prod.precoMedioUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                {prod.qtdTotalPecas.toLocaleString('pt-BR')} un
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-extrabold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                R$ {prod.valorTotalFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* CONTEÚDO DA ABA 3: MAIORES PEDIDOS */}
            {activeTab === 'pedidos' && (
              <div className="space-y-3 pt-1">
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Listagem de ordens de compra ordenadas pelo maior valor total no período:</span>
                  <span className="font-bold font-mono">{sortedOrdersByValue.length} ordens</span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-700/80 max-h-[360px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3 min-w-[70px] text-center">Posição</th>
                        <th className="py-2.5 px-3 min-w-[110px]">Número Pedido</th>
                        <th className="py-2.5 px-3 min-w-[180px]">Fornecedor</th>
                        <th className="py-2.5 px-3 min-w-[95px]">Data</th>
                        <th className="py-2.5 px-3 text-center min-w-[80px]">Itens</th>
                        <th className="py-2.5 px-3 text-right min-w-[100px]">Peças</th>
                        <th className="py-2.5 px-3 text-right min-w-[130px]">Valor Total</th>
                        <th className="py-2.5 px-3 text-center min-w-[90px]">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {sortedOrdersByValue.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-6 text-slate-400">
                            Nenhum pedido encontrado com os filtros selecionados.
                          </td>
                        </tr>
                      ) : (
                        sortedOrdersByValue.map((ord, idx) => {
                          const totalOrder = ord.items.reduce((s, i) => s + (i.valorTotalBruto || 0), 0);
                          const totalPecas = ord.items.reduce((s, i) => s + (i.qtdTotalUnidades || 0), 0);
                          const isTop1 = idx === 0;

                          return (
                            <tr key={ord.id || ord.header.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${isTop1 ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}`}>
                              <td className="py-2.5 px-3 text-center">
                                {isTop1 ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                                    1º
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono text-[11px]">{idx + 1}º</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                {ord.header.numeroPedido}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                                {ord.header.fornecedor}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                                {toBrDate(ord.header.dataPedido || ord.header.createdAt)}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-semibold">
                                {ord.items.length}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold">
                                {totalPecas.toLocaleString('pt-BR')} un
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-extrabold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                R$ {totalOrder.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {onSelectOrder && (
                                  <button
                                    onClick={() => onSelectOrder(ord)}
                                    className="px-2 py-1 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition cursor-pointer"
                                    title="Abrir este pedido no editor"
                                  >
                                    Abrir
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};
