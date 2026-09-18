import React from 'react';
import { 
  ShoppingCart, 
  PackageCheck, 
  BarChart3, 
  Building2, 
  Package, 
  Store, 
  Sparkles, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  FileSpreadsheet, 
  Smartphone, 
  Boxes, 
  History, 
  FileText,
  AlertTriangle,
  Trash2,
  Calendar,
  FileEdit,
  CreditCard,
  Warehouse
} from 'lucide-react';
import { PurchaseOrder, User, Supplier, StoreConfig } from '../shared/types';
import { ActiveNavTab } from './Sidebar';
import { toBrDate } from '../utils/masks';

interface HomePageProps {
  currentUser: User;
  savedOrders: PurchaseOrder[];
  draftOrder: PurchaseOrder | null;
  suppliers: Supplier[];
  stores: StoreConfig[];
  onNavigate: (tab: ActiveNavTab) => void;
  onNewOrder: () => void;
  onContinueDraft: () => void;
  onDiscardDraft: () => void;
  onSelectOrder: (order: PurchaseOrder) => void;
  onSwitchViewMode: (mode: 'desktop' | 'mobile_purchases' | 'mobile_separation') => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  currentUser,
  savedOrders,
  draftOrder,
  suppliers,
  stores,
  onNavigate,
  onNewOrder,
  onContinueDraft,
  onDiscardDraft,
  onSelectOrder,
  onSwitchViewMode
}) => {
  // Saudação dinâmica por horário
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Verifica se há um rascunho real em aberto (com itens ou fornecedor preenchido)
  const hasValidDraft = Boolean(
    draftOrder && (
      (draftOrder.items && draftOrder.items.length > 0) || 
      (draftOrder.header.fornecedor && draftOrder.header.fornecedor.trim() !== '')
    )
  );

  // Cálculos do rascunho
  const userRole = currentUser.role || 'diretoria';
  const isManager = userRole === 'diretoria' || userRole === 'owner' || userRole === 'root';
  const canAccessOrders = isManager || userRole === 'comprador';
  const isDeposit = userRole === 'deposito';

  const draftItemCount = draftOrder?.items?.length || 0;
  const draftTotalVal = draftOrder?.items?.reduce((sum, it) => sum + (it.valorTotalBruto || 0), 0) || 0;

  // Estatísticas rápidas pelo funil de status
  const totalOrdersCount = savedOrders.length;
  const cotacaoCount = savedOrders.filter(o => (o.header.status || 'Em Cotação') === 'Em Cotação' || o.header.status === 'Rascunho').length;
  const separacaoCount = savedOrders.filter(o => o.header.status === 'Em Separação' || o.header.status === 'Aprovado').length;
  const finalizadosCount = savedOrders.filter(o => o.header.status === 'Finalizado').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Finalizado':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'Em Separação':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'Aprovado':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'Cancelado':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      default:
        return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Header de Boas-Vindas & Identificação Executiva */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 sm:p-8 border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-8 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Matriz Jóia ERP • Sistema Integrado
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {getGreeting()}, <span className="text-emerald-400">{(currentUser.nome || 'Usuário').replace(/\s*\([^)]*\)/g, '').trim()}</span>!
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              {currentUser.role === 'deposito' 
                ? 'Gestão de estoque central CD, controle de saldos, transferências para as lojas e conferência de separação.'
                : `Central de compras, simulação fiscal, rateio para ${stores.length > 0 ? `${stores.length} lojas` : 'lojas da rede'} e controle de separação da matriz.`}
            </p>
          </div>

          {/* Ação Primária em Destaque */}
          <div className="flex items-center gap-3">
            {currentUser.role === 'deposito' ? (
              <button
                onClick={() => onNavigate('stock')}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer hover:scale-102"
              >
                <Warehouse className="w-4 h-4" />
                <span>Estoque Central CD</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onNewOrder}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer hover:scale-102"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Novo Pedido de Compras</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. CARD DE RASCUNHO EM ANDAMENTO (Diretoria / Owner / Comprador) */}
      {hasValidDraft && canAccessOrders && (
        <div className="p-5 rounded-3xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 shadow-lg relative overflow-hidden animate-in slide-in-from-top-3 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-md shadow-amber-500/30 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500 text-slate-950 uppercase tracking-wider">
                    Rascunho em Aberto
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    {draftOrder?.header.numeroPedido || 'PED-NOVO'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  Você possui um pedido em andamento que ainda não foi salvo.
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {draftOrder?.header.fornecedor && (
                    <span>Fornecedor: <strong className="text-slate-900 dark:text-white">{draftOrder.header.fornecedor}</strong></span>
                  )}
                  <span>Itens: <strong className="text-slate-900 dark:text-white">{draftItemCount}</strong></span>
                  {draftTotalVal > 0 && (
                    <span>Valor Total: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">R$ {draftTotalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={onContinueDraft}
                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continuar Digitação</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Métricas do Funil Operacional de Pedidos (4 Status da Jóia ERP) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        {/* 1. Pedido em Aberto (Não Salvo) */}
        <div 
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border ${
            hasValidDraft 
              ? 'border-amber-400 dark:border-amber-500/60 ring-2 ring-amber-400/20 shadow-md' 
              : 'border-slate-200 dark:border-slate-800 shadow-xs'
          } flex flex-col justify-between transition group relative overflow-hidden`}
        >
          {hasValidDraft && (
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase">
                Não Salvo
              </span>
            </div>
          )}

          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-xl ${
              hasValidDraft 
                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            } flex items-center justify-center shrink-0 group-hover:scale-105 transition`}>
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <div className={`text-xl font-black font-mono ${hasValidDraft ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                {hasValidDraft ? 1 : 0}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-tight">
                Pedido em Aberto
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[110px]">
              {hasValidDraft 
                ? (draftOrder?.header.fornecedor || `${draftItemCount} item(ns)`) 
                : 'Nenhum rascunho'}
            </span>
            <button
              onClick={canAccessOrders ? (hasValidDraft ? onContinueDraft : () => onNavigate('orders')) : () => onNavigate('separation')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                hasValidDraft
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
              title={canAccessOrders ? (hasValidDraft ? 'Acessar e continuar pedido em aberto' : 'Ir para página de pedidos') : 'Acessar painel de separação e distribuição'}
            >
              <span>{hasValidDraft && canAccessOrders ? 'Acessar' : 'Abrir'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 2. Em Cotação / Salvos (Pendente de Aprovação) */}
        <div 
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between transition group hover:border-slate-300 dark:hover:border-slate-700"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono">
                {cotacaoCount}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-tight">
                Em Cotação / Salvos
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Salvos no SQLite
            </span>
            <button
              onClick={() => onNavigate(canAccessOrders ? 'history' : 'separation')}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-blue-950/60 dark:hover:text-blue-400 text-slate-700 dark:text-slate-300 transition flex items-center gap-1 cursor-pointer"
              title={canAccessOrders ? 'Acessar histórico de cotações' : 'Acessar painel de separação e distribuição'}
            >
              <span>Ver</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 3. Em Separação / Doca */}
        <div 
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between transition group hover:border-slate-300 dark:hover:border-slate-700"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">
                {separacaoCount}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-tight">
                Na Doca / Separação
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Conferência {stores.length > 0 ? `${stores.length} Lojas` : 'Lojas'}
            </span>
            <button
              onClick={() => onNavigate('separation')}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-purple-50 hover:text-purple-600 dark:bg-slate-800 dark:hover:bg-purple-950/60 dark:hover:text-purple-400 text-slate-700 dark:text-slate-300 transition flex items-center gap-1 cursor-pointer"
              title="Acessar painel de separação"
            >
              <span>Acessar</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 4. Finalizados / Concluídos */}
        <div 
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between transition group hover:border-slate-300 dark:hover:border-slate-700"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {finalizadosCount}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-tight">
                Finalizados
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Despachados
            </span>
            <button
              onClick={() => onNavigate('separationHistory')}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-slate-800 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 transition flex items-center gap-1 cursor-pointer"
              title="Acessar histórico de finalizados"
            >
              <span>Acessar</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>

      {/* 4. Ações Rápidas & Módulos Principais */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
            Módulos & Operações Rápidas
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Acesso direto às ferramentas da Matriz
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Card 1: Novo Pedido (Diretoria / Owner / Comprador) */}
          {canAccessOrders && (
            <div 
              onClick={onNewOrder}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-xs hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                Cotação & Digitação de Pedido
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Crie pedidos em branco, simule impostos e calcule a margem real unitária.
              </p>
            </div>
          )}

          {/* Card 2: Depósito / Estoque Central CD (Diretoria, Owner, Comprador e Depósito) */}
          {(canAccessOrders || isDeposit) && (
            <div 
              onClick={() => onNavigate('stock')}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-xs hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition">
                  <Warehouse className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                Depósito & Estoque Central CD
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Gerencie saldos em unidades, inventário do galpão e gere transferências para as lojas.
              </p>
            </div>
          )}

          {/* Card 3: Conferência & Romaneio (Todos) */}
          <div 
            onClick={() => onNavigate('separation')}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-110 transition">
                <PackageCheck className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-500 group-hover:translate-x-1 transition" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">
              Conferência & Romaneio ({stores.length > 0 ? `${stores.length} Lojas` : 'Lojas'})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Painel de doca com conferência em tempo real, peças por loja e impressão em PDF.
            </p>
          </div>

          {/* Card 4: Dashboard & BI (Diretoria / Owner / Root) */}
          {isManager && (
            <div 
              onClick={() => onNavigate('dashboard')}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-xs hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                Dashboard Executivo & BI
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Gráficos de investimento mensal, ranking de fornecedores e análise de rentabilidade.
              </p>
            </div>
          )}

          {/* Card 5: Catálogo de Produtos (Diretoria, Owner, Comprador e Depósito) */}
          {(canAccessOrders || isDeposit) && (
            <div 
              onClick={() => onNavigate('products')}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 shadow-xs hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition">
                  <Package className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                Catálogo com Fotos & EAN
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Consulta geral de produtos, fotos em alta resolução, embalagens e dados de código.
              </p>
            </div>
          )}

          {/* Card 6: Gestão Financeira & Boletos (Diretoria / Owner / Root) */}
          {isManager && (
            <div 
              onClick={() => onNavigate('financial')}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 shadow-xs hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
                  <CreditCard className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-1 transition" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                Controle Financeiro & Boletos
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Fluxo de pagamentos por fornecedor e mês com parcelas editáveis para acordos comerciais.
              </p>
            </div>
          )}

          {/* Card 7: Histórico de Separações (Todos) */}
          <div 
            onClick={() => onNavigate('separationHistory')}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-110 transition">
                <Boxes className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-500 group-hover:translate-x-1 transition" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">
              Histórico de Romaneios & Cargas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Consulte romaneios finalizados e cargas expedidas para as lojas da rede.
            </p>
          </div>

          {/* Card 8: Histórico Geral de Pedidos (Diretoria / Owner / Comprador) */}
          {canAccessOrders && (
            <div 
              onClick={() => onNavigate('history')}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 shadow-xs hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition">
                  <History className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-500 group-hover:translate-x-1 transition" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                Histórico & Arquivo Geral
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Consulte pedidos antigos gravados no SQLite, reabra ou exporte para Excel.
              </p>
            </div>
          )}

        </div>
      </div>

      {/* 5. Histórico Recente de Pedidos */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Histórico Recente de Pedidos
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acompanhe o andamento das cotações, pedidos em separação e histórico finalizado
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate(canAccessOrders ? 'history' : 'separationHistory')}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Ver Todos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {savedOrders.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Nenhum pedido gravado ainda
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Inicie um novo pedido de compras para salvar cotações e gerar separação para as lojas.
            </p>
            {canAccessOrders && (
              <button
                onClick={onNewOrder}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Criar Primeiro Pedido
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Nº Pedido</th>
                  <th className="py-3 px-4">Fornecedor</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4 text-center">Itens</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {savedOrders.slice(0, 5).map((ord) => {
                  const totalVal = ord.items?.reduce((sum, it) => sum + (it.valorTotalBruto || 0), 0) || 0;
                  return (
                    <tr 
                      key={ord.header.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition cursor-pointer"
                      onClick={() => onSelectOrder(ord)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {ord.header.numeroPedido}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {ord.header.fornecedor || 'Fornecedor não informado'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {toBrDate(ord.header.dataPedido) || '-'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {ord.items?.length || 0}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        R$ {totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${getStatusBadge(ord.header.status)}`}>
                          {ord.header.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectOrder(ord)}
                          className="px-3 py-1 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                        >
                          Abrir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
