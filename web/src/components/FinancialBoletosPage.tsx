import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  DollarSign, 
  Calendar, 
  Building2, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  Edit3, 
  FileSpreadsheet, 
  Receipt, 
  Sparkles, 
  Plus, 
  X, 
  Save, 
  RotateCcw,
  Check,
  TrendingUp,
  CreditCard,
  FileText,
  ChevronLeft,
  ChevronRight,
  Store,
  Layers,
  Trash2
} from 'lucide-react';
import { 
  PurchaseOrder, 
  PaymentInstallment, 
  Supplier, 
  StoreConfig, 
  FinancialEntry, 
  FinancialSummary, 
  FinancialCategory, 
  FinancialStatus 
} from '../shared/types';
import { 
  fetchFinancialEntriesFromDb, 
  fetchFinancialSummaryFromDb, 
  saveFinancialEntryToDb, 
  payFinancialEntryInDb, 
  deleteFinancialEntryFromDb 
} from '../utils/api';
import { toBrDate } from '../utils/masks';
import { MonthlyPurchasesMatrixView } from './MonthlyPurchasesMatrixView';
import { FinancialEntryModal } from './FinancialEntryModal';
import { FinancialDailyView } from './FinancialDailyView';

interface FinancialBoletosPageProps {
  orders: PurchaseOrder[];
  suppliers: Supplier[];
  stores?: StoreConfig[];
  onSelectOrder: (order: PurchaseOrder) => void;
  onUpdateInstallment: (orderId: string, updatedInstallment: PaymentInstallment) => void;
  onSaveOrder: (updatedOrder: PurchaseOrder) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const MONTHS_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const FinancialBoletosPage: React.FC<FinancialBoletosPageProps> = ({
  orders,
  suppliers,
  stores = [],
  onSelectOrder,
  onUpdateInstallment: _onUpdateInstallment,
  onSaveOrder: _onSaveOrder,
  showToast
}) => {
  // Aba ativa: 'daily' (Visão Diária da Planilha), 'list' (Contas a Pagar Analítico), 'stores' (Por Loja), 'matrix' (Matriz Mensal de Compras)
  const [activeTab, setActiveTab] = useState<'daily' | 'list' | 'stores' | 'matrix'>('daily');

  // Filtros de Período (padrão 2026-08 para casar com a planilha do cliente ou data corrente)
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('08');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [onlyPending, setOnlyPending] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Estados de Dados do Backend
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Modais
  const [isEntryModalOpen, setIsEntryModalOpen] = useState<boolean>(false);
  const [payingEntry, setPayingEntry] = useState<FinancialEntry | null>(null);
  const [payForm, setPayForm] = useState<{ dataPagamento: string; valorPago: number; observacao: string }>({
    dataPagamento: new Date().toISOString().substring(0, 10),
    valorPago: 0,
    observacao: ''
  });

  // Carregar lançamentos e resumo do SQLite
  const loadFinancialData = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        year: selectedYear !== 'all' ? selectedYear : undefined,
        month: selectedMonth !== 'all' ? selectedMonth : undefined,
        lojaNome: selectedStore !== 'all' ? selectedStore : undefined,
        categoria: selectedCategory !== 'all' ? selectedCategory : undefined,
        status: onlyPending ? 'pendente' : (selectedStatus !== 'all' ? selectedStatus : undefined),
        search: searchQuery.trim() || undefined
      };

      const [entriesData, summaryData] = await Promise.all([
        fetchFinancialEntriesFromDb(filters),
        fetchFinancialSummaryFromDb(filters)
      ]);

      setEntries(entriesData);
      setSummary(summaryData);
    } catch (err: any) {
      console.error('Erro ao carregar financeiro:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, selectedStore, selectedCategory, selectedStatus, searchQuery, onlyPending]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  // Navegação de Mês
  const handlePrevMonth = () => {
    let m = selectedMonth === 'all' ? 12 : parseInt(selectedMonth, 10) - 1;
    let y = parseInt(selectedYear === 'all' ? '2026' : selectedYear, 10);
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(String(m).padStart(2, '0'));
    if (selectedYear === 'all') setSelectedYear('2026');
  };

  const handleNextMonth = () => {
    let m = selectedMonth === 'all' ? 1 : parseInt(selectedMonth, 10) + 1;
    let y = parseInt(selectedYear === 'all' ? '2026' : selectedYear, 10);
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(String(m).padStart(2, '0'));
    if (selectedYear === 'all') setSelectedYear('2026');
  };

  // Baixa rápida de Pagamento
  const handleOpenPayModal = (entry: FinancialEntry) => {
    setPayingEntry(entry);
    setPayForm({
      dataPagamento: new Date().toISOString().substring(0, 10),
      valorPago: entry.valor,
      observacao: ''
    });
  };

  const handleConfirmPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingEntry) return;

    try {
      await payFinancialEntryInDb(payingEntry.id, payForm);
      showToast(`Pagamento de R$ ${payForm.valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} baixado com sucesso!`, 'success');
      setPayingEntry(null);
      await loadFinancialData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao liquidar pagamento.', 'error');
    }
  };

  // Exclusão de Lançamento
  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lançamento financeiro?')) return;
    try {
      await deleteFinancialEntryFromDb(id);
      showToast('Lançamento excluído com sucesso.', 'info');
      await loadFinancialData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir lançamento.', 'error');
    }
  };

  // Cálculos consolidados para os cards superiores
  const totalPrevisto = summary?.totalGeral || 0;
  const totalPago = summary?.totalPago || 0;
  const totalAberto = summary?.totalAberto || 0;
  const totalVenceHoje = summary?.totalVenceHoje || 0;
  const countVenceHoje = summary?.countVenceHoje || 0;
  const totalEmAtraso = summary?.totalEmAtraso || 0;
  const countEmAtraso = summary?.countEmAtraso || 0;
  const percentPago = totalPrevisto > 0 ? Math.round((totalPago / totalPrevisto) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* 1. Header Principal e Botões de Ação ERP */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                Gestão Financeira & Contas a Pagar
              </h1>
            </div>
          </div>
        </div>

        {/* Botões de Ação do Topo */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Novo Lançamento ERP */}
          <button
            type="button"
            onClick={() => setIsEntryModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            + Novo Lançamento ERP
          </button>
        </div>
      </div>

      {/* 2. Cards de Métricas e KPIs Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Total Previsto no Mês */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Previsto Mês</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              R$ {totalPrevisto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {summary?.totalEntries || entries.length} compromissos cadastrados
            </p>
          </div>
        </div>

        {/* Total Pago / Liquidado */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Liquidado</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${percentPago}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">
              {percentPago}% do volume quitado
            </p>
          </div>
        </div>

        {/* Saldo em Aberto */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">A Pagar / Em Aberto</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              R$ {totalAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Restante para quitação
            </p>
          </div>
        </div>

        {/* Vence Hoje */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Vence Hoje</span>
            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
              {countVenceHoje} contas
            </span>
          </div>
          <div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
              R$ {totalVenceHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Prioridade para pagamento hoje
            </p>
          </div>
        </div>

        {/* Em Atraso */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Em Atraso</span>
            <span className="px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
              {countEmAtraso} contas
            </span>
          </div>
          <div>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
              R$ {totalEmAtraso.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Requer atenção imediata
            </p>
          </div>
        </div>

      </div>

      {/* 3. Barra de Navegação de Mês, Filtros e Abas */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        
        {/* Linha 1: Navegação de Mês e Abas */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Seletor de Período Mês / Ano com Dropdowns e Filtro Rápido */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={selectedMonth === 'all'}
              onClick={handlePrevMonth}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Dropdown Mês */}
            <div className="relative flex items-center">
              <Calendar className="w-4 h-4 text-amber-500 absolute left-3 pointer-events-none" />
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer"
              >
                <option value="all">📅 Todos os Meses (Visão Geral)</option>
                {MONTHS_NAMES.map((name, idx) => {
                  const mVal = String(idx + 1).padStart(2, '0');
                  return (
                    <option key={mVal} value={mVal}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Dropdown Ano */}
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer"
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="all">Todos os Anos</option>
            </select>

            <button
              type="button"
              disabled={selectedMonth === 'all'}
              onClick={handleNextMonth}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Botão Destaque: Apenas Pendentes (Não baixados) */}
            <button
              type="button"
              onClick={() => {
                setOnlyPending(prev => {
                  const nextVal = !prev;
                  if (nextVal) setSelectedStatus('all');
                  return nextVal;
                });
              }}
              className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border ${
                onlyPending
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/30'
                  : 'bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="Filtrar instantaneamente apenas o que não foi dado baixa (A Vencer, Vence Hoje e Em Atraso)"
            >
              <Clock className={`w-3.5 h-3.5 ${onlyPending ? 'text-white' : 'text-amber-500'}`} />
              <span>Apenas Pendentes</span>
              {onlyPending && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
            </button>
          </div>

          {/* Abas Modernas de Visualização */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs">
            
            <button
              type="button"
              onClick={() => setActiveTab('daily')}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'daily'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Visão Diária (Planilha)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'list'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Contas a Pagar (ERP Grid)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stores')}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'stores'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              Despesas por Loja
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'matrix'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Matriz de Compras
            </button>

          </div>

        </div>

        {/* Linha 2: Filtros de Loja, Categoria, Status e Busca */}
        {activeTab !== 'matrix' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs">
            
            {/* Busca */}
            <div className="lg:col-span-4 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar fornecedor, despesa, NF ou documento..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Filtro Loja */}
            <div className="lg:col-span-3">
              <select
                value={selectedStore}
                onChange={e => setSelectedStore(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">Todas as Lojas / Unidades</option>
                <optgroup label="Empresas Matriz">
                  <option value="ALS">ALS (Geral)</option>
                  <option value="CONECTA">CONECTA</option>
                </optgroup>
                <optgroup label="Jóia ERP (Lojas Físicas)">
                  {stores.map(st => (
                    <option key={st.id} value={st.name}>{st.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Filtro Categoria */}
            <div className="lg:col-span-3">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">Todas as Categorias</option>
                <option value="FIXO">FIXO (Água, Luz, Aluguel...)</option>
                <option value="PRODUTOS">PRODUTOS (Mercadorias/Fornecedores)</option>
                <option value="RH">RH (Folha, Retiradas)</option>
                <option value="OPERACIONAL">OPERACIONAL (Dia a dia loja)</option>
                <option value="IMPOSTOS">IMPOSTOS & TRIBUTOS</option>
                <option value="INVESTIMENTOS">INVESTIMENTOS</option>
                <option value="OUTROS">OUTROS</option>
              </select>
            </div>

            {/* Filtro Status */}
            <div className="lg:col-span-2">
              <select
                value={onlyPending ? 'pendente' : selectedStatus}
                onChange={e => {
                  if (e.target.value === 'pendente') {
                    setOnlyPending(true);
                    setSelectedStatus('all');
                  } else {
                    setOnlyPending(false);
                    setSelectedStatus(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">Todos os Status</option>
                <option value="pendente">⚡ Apenas Pendentes (A Pagar)</option>
                <option value="A Vencer">A Vencer</option>
                <option value="Vence Hoje">Vence Hoje</option>
                <option value="Em Atraso">Em Atraso</option>
                <option value="Pago">Pago</option>
              </select>
            </div>

          </div>
        )}

      </div>

      {/* 4. Conteúdo Dinâmico das Abas */}

      {/* ABA 1: Visão Diária de Gastos (Planilha do Cliente) */}
      {activeTab === 'daily' && (
        <FinancialDailyView
          entries={entries}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onPayEntry={(id) => {
            const entry = entries.find(e => e.id === id);
            if (entry) handleOpenPayModal(entry);
          }}
          onSelectEntry={(entry) => console.log('Selecionou:', entry)}
          onDeleteEntry={handleDeleteEntry}
        />
      )}

      {/* ABA 2: Grade Analítica ERP de Contas a Pagar */}
      {activeTab === 'list' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Grade Corporativa de Contas ({entries.length} registros)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/60 dark:bg-slate-900/40 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-100 dark:border-slate-700/60">
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Descrição / Favorecido</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Loja / Unidade</th>
                  <th className="py-3 px-3">Forma Pgto</th>
                  <th className="py-3 px-3">NF / Doc</th>
                  <th className="py-3 px-3">Parcela</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      Nenhum lançamento financeiro encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  entries.map(item => {
                    const isPaid = item.status === 'Pago';
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors ${
                          isPaid ? 'opacity-65 bg-slate-50/30 dark:bg-slate-800/30' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {toBrDate(item.dataVencimento)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          <span className={isPaid ? 'line-through text-slate-400' : ''}>
                            {item.descricao}
                          </span>
                          {item.observacao && (
                            <span className="text-[10px] text-slate-400 block truncate max-w-xs font-normal">
                              {item.observacao}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {item.categoria}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">
                          {item.lojaNome || item.empresa || 'ALS'}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300 uppercase">
                          {item.formaPagamento}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                          {item.documentoRef || '—'}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {item.parcelaDesc}
                        </td>
                        <td className="py-3 px-3">
                          {isPaid ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" /> Pago
                            </span>
                          ) : item.status === 'Vence Hoje' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> Vence Hoje
                            </span>
                          ) : item.status === 'Em Atraso' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 inline-flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> Em Atraso
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              A Vencer
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {!isPaid && (
                              <button
                                type="button"
                                onClick={() => handleOpenPayModal(item)}
                                title="Baixar Pagamento"
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white transition-all"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(item.id)}
                              title="Excluir Lançamento"
                              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* ABA 3: Despesas Consolidadas por Loja & Centro de Custo */}
      {activeTab === 'stores' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
              Despesas Consolidadas por Loja da Jóia ERP
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Distribuição de custos fixos, operacionais e mercadorias por unidade de faturamento
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary && Object.entries(summary.byStore).map(([lojaName, info]) => {
              return (
                <div
                  key={lojaName}
                  className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                        <Store className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {lojaName}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-400">
                      {info.count} {info.count === 1 ? 'conta' : 'contas'}
                    </span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Total Previsto:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        R$ {info.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-600">Total Quitado:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        R$ {info.pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ABA 4: Matriz Mensal de Compras (Já existente) */}
      {activeTab === 'matrix' && (
        <MonthlyPurchasesMatrixView
          orders={orders}
          onSelectOrder={onSelectOrder}
          showToast={showToast}
        />
      )}

      {/* Modal de Lançamento ERP Padrão */}
      <FinancialEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        onSuccess={() => loadFinancialData()}
        suppliers={suppliers}
        stores={stores}
        showToast={showToast}
        onSaveEntry={async (payload) => {
          return await saveFinancialEntryToDb(payload);
        }}
      />

      {/* Modal de Baixa de Pagamento */}
      {payingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Liquidar Pagamento
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dar baixa no compromisso financeiro
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPayingEntry(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">{payingEntry.descricao}</p>
              <p className="text-slate-500">Loja: {payingEntry.lojaNome || payingEntry.empresa || 'ALS'}</p>
              <p className="text-slate-500">Vencimento: {toBrDate(payingEntry.dataVencimento)}</p>
            </div>

            <form onSubmit={handleConfirmPay} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Data do Pagamento
                </label>
                <input
                  type="date"
                  value={payForm.dataPagamento}
                  onChange={e => setPayForm({ ...payForm, dataPagamento: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Valor Pago (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={payForm.valorPago}
                  onChange={e => setPayForm({ ...payForm, valorPago: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-bold font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observações / Comprovante
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pago via Santander, autenticação 123..."
                  value={payForm.observacao}
                  onChange={e => setPayForm({ ...payForm, observacao: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingEntry(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Confirmar Baixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
