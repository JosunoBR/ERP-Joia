import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Home,
  ShoppingCart, 
  PackageCheck, 
  BarChart3, 
  Building2, 
  FolderOpen, 
  Settings, 
  Plus, 
  Save, 
  FileSpreadsheet, 
  FileText, 
  ShoppingBag, 
  Boxes, 
  CreditCard,
  Users as UsersIcon,
  Monitor,
  Smartphone,
  Sparkles,
  Clock,
  Trash2,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Check,
  Warehouse,
  Copy
} from 'lucide-react';
import { PurchaseOrder, User, UserRole } from '../shared/types';
import { ActiveNavTab } from './Sidebar';
import { calculateOrderNetTotal } from '../utils/installments';

interface HeaderProps {
  activeNav: ActiveNavTab;
  order: PurchaseOrder;
  currentUser: User;
  viewMode: 'desktop' | 'mobile_purchases' | 'mobile_separation';
  onChangeViewMode: (mode: 'desktop' | 'mobile_purchases' | 'mobile_separation') => void;
  hasActiveDraft: boolean;
  isSavedOrder: boolean;
  savedOrders?: PurchaseOrder[];
  onSelectOrder?: (selectedOrder: PurchaseOrder) => void;
  onNewOrder: () => void;
  onSaveOrder: () => void;
  onCloseOrder?: () => void;
  onDuplicateOrder?: () => void;
  onDiscardDraft: () => void;
  onExportExcel?: () => void;
  onExportPDF: () => void;
  onImportExcel?: () => void;
  onSelectNav?: (tab: ActiveNavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeNav,
  order,
  currentUser,
  viewMode,
  onChangeViewMode,
  hasActiveDraft,
  isSavedOrder,
  savedOrders = [],
  onSelectOrder,
  onNewOrder,
  onSaveOrder,
  onCloseOrder,
  onDuplicateOrder,
  onDiscardDraft,
  onExportExcel,
  onExportPDF,
  onImportExcel,
  onSelectNav
}) => {
  const [isOrdersDropdownOpen, setIsOrdersDropdownOpen] = useState(false);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const ordersDropdownRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ordersDropdownRef.current && !ordersDropdownRef.current.contains(e.target as Node)) {
        setIsOrdersDropdownOpen(false);
      }
    };
    if (isOrdersDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOrdersDropdownOpen]);

  // Filtra exclusivamente os pedidos salvos que ainda NÃO seguiram o fluxo da esteira (apenas 'Em Cotação' ou 'Rascunho')
  const openSavedOrders = useMemo(() => {
    if (!savedOrders) return [];
    return savedOrders.filter(o => {
      const status = o.header?.status || 'Em Cotação';
      return status === 'Em Cotação' || status === 'Rascunho';
    });
  }, [savedOrders]);

  const filteredOrders = useMemo(() => {
    if (!orderSearchTerm.trim()) return openSavedOrders;
    const term = orderSearchTerm.toLowerCase();
    return openSavedOrders.filter(o => 
      o.header.numeroPedido.toLowerCase().includes(term) ||
      (o.header.fornecedor && o.header.fornecedor.toLowerCase().includes(term)) ||
      (o.header.status && o.header.status.toLowerCase().includes(term))
    );
  }, [openSavedOrders, orderSearchTerm]);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Aprovado':
        return { label: 'Aprovado', cls: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' };
      case 'Em Separação':
        return { label: 'Em Separação', cls: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' };
      case 'Em Cotação':
      case 'Rascunho':
      default:
        return { label: status || 'Em Cotação', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' };
    }
  };

  const userRole: UserRole = currentUser?.role || 'diretoria';
  const isManager = userRole === 'diretoria' || userRole === 'owner' || userRole === 'root';
  const canAccessOrders = isManager || userRole === 'comprador';

  // Configurações de Título e Ícone da Página Ativa
  const getNavMeta = (tab: ActiveNavTab) => {
    switch (tab) {
      case 'home':
        return { title: 'Visão Geral & Hub', group: 'Operação', icon: Home, color: 'text-emerald-500' };
      case 'orders':
        return { title: 'Cotação & Pedidos de Compras', group: 'Operação', icon: ShoppingCart, color: 'text-emerald-500' };
      case 'stock':
        return { title: 'Estoque Central CD & Almoxarifado', group: 'Operação', icon: Warehouse, color: 'text-emerald-500' };
      case 'separation':
        return { title: 'Separação & Distribuição de Lojas', group: 'Operação', icon: userRole === 'separacao' ? PackageCheck : Boxes, color: 'text-blue-500' };
      case 'financial':
        return { title: 'Gestão Financeira & Boletos', group: 'Gestão', icon: CreditCard, color: 'text-amber-500' };
      case 'dashboard':
        return { title: 'Dashboard Executivo & Barganha BI', group: 'Gestão', icon: BarChart3, color: 'text-teal-500' };
      case 'history':
        return { title: 'Histórico & Arquivo de Pedidos', group: 'Gestão', icon: FolderOpen, color: 'text-amber-500' };
      case 'separationHistory':
        return { title: 'Histórico de Separações & Conferência', group: 'Gestão', icon: Boxes, color: 'text-teal-500' };
      case 'products':
        return { title: 'Catálogo de Produtos & Imagens', group: 'Cadastros', icon: ShoppingBag, color: 'text-purple-500' };
      case 'suppliers':
        return { title: 'Cadastro de Fornecedores & ST', group: 'Cadastros', icon: Building2, color: 'text-emerald-500' };
      case 'fiscal':
        return { title: 'Configurações Gerais & Parâmetros', group: 'Cadastros', icon: Settings, color: 'text-indigo-500' };
      case 'users':
        return { title: 'Gestão de Usuários & Acessos (RBAC)', group: 'Sistema', icon: UsersIcon, color: 'text-pink-500' };
      default:
        return { title: 'Sistema Jóia ERP', group: 'Matriz', icon: ShoppingBag, color: 'text-emerald-500' };
    }
  };

  const navMeta = getNavMeta(activeNav);
  const IconComp = navMeta.icon;

  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/80 dark:border-slate-800 backdrop-blur-md transition-colors shadow-2xs">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Lado Esquerdo: Breadcrumb & Título da Página (Sem quebras de texto) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
            <IconComp className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 leading-none mb-1">
              <span>Jóia ERP</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-slate-600 dark:text-slate-400">{navMeta.group}</span>
              {activeNav === 'orders' && hasActiveDraft && !isSavedOrder && (
                <span className="ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
                  Rascunho Ativo
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight whitespace-nowrap">
                {activeNav === 'orders' ? 'Cotação & Pedidos' : navMeta.title}
              </h1>
              {activeNav === 'orders' && canAccessOrders && order?.header?.numeroPedido && (
                <div className="relative" ref={ordersDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsOrdersDropdownOpen(prev => !prev)}
                    className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white inline-flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0 cursor-pointer transition select-none group"
                    title="Navegar entre pedidos salvos em cotação (que ainda não seguiram o fluxo)"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-pulse" />
                    <span>{order.header.numeroPedido}</span>
                    <ChevronDown className={`w-3.5 h-3.5 opacity-80 group-hover:opacity-100 transition-transform duration-200 ${isOrdersDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Menu Dropdown de Pedidos Salvos em Cotação (Não seguiram o fluxo) */}
                  {isOrdersDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                      
                      {/* Topo do Menu */}
                      <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-2">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Pedidos Salvos (Em Cotação)
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                          {openSavedOrders.length} {openSavedOrders.length === 1 ? 'salvo' : 'salvos'}
                        </span>
                      </div>

                      {/* Campo de Busca Rápida se houver 4 ou mais pedidos */}
                      {openSavedOrders.length >= 4 && (
                        <div className="relative mb-2 px-1">
                          <input
                            type="text"
                            value={orderSearchTerm}
                            onChange={(e) => setOrderSearchTerm(e.target.value)}
                            placeholder="Buscar por número ou fornecedor..."
                            className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 outline-hidden focus:ring-1 focus:ring-emerald-500"
                            autoFocus
                          />
                        </div>
                      )}

                      {/* Lista de Pedidos */}
                      <div className="max-h-64 overflow-y-auto space-y-1 pr-0.5">
                        {filteredOrders.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400">
                            {openSavedOrders.length === 0 
                              ? 'Nenhum pedido em cotação salvo no momento.'
                              : 'Nenhum pedido encontrado com esse filtro.'}
                          </div>
                        ) : (
                          filteredOrders.map((ord) => {
                            const isCurrent = ord.header.id === order.header.id;
                            const statusBadge = getStatusBadge(ord.header.status);
                            const totalVal = calculateOrderNetTotal(ord);

                            return (
                              <button
                                key={ord.header.id}
                                type="button"
                                onClick={() => {
                                  if (onSelectOrder) {
                                    onSelectOrder(ord);
                                  }
                                  setIsOrdersDropdownOpen(false);
                                }}
                                className={`w-full text-left p-2.5 rounded-xl border transition flex flex-col gap-1 cursor-pointer ${
                                  isCurrent
                                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 shadow-2xs'
                                    : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black font-mono text-slate-900 dark:text-white">
                                      {ord.header.numeroPedido}
                                    </span>
                                    <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-extrabold uppercase border ${statusBadge.cls}`}>
                                      {statusBadge.label}
                                    </span>
                                  </div>
                                  {isCurrent ? (
                                    <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                      <Check className="w-3 h-3" />
                                      <span>Ativo</span>
                                    </span>
                                  ) : (
                                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                                      R$ {totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                  <span className="truncate max-w-[200px] font-medium">
                                    {ord.header.fornecedor || 'Fornecedor não informado'}
                                  </span>
                                  <span className="text-[10px]">
                                    {ord.items?.length || 0} {(ord.items?.length || 0) === 1 ? 'item' : 'itens'}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>

                      {/* Rodapé do Menu */}
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-1">
                        <button
                          type="button"
                          onClick={() => {
                            onNewOrder();
                            setIsOrdersDropdownOpen(false);
                          }}
                          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Novo Pedido</span>
                        </button>

                        {onSelectNav && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectNav('history');
                              setIsOrdersDropdownOpen(false);
                            }}
                            className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                          >
                            Ver Histórico →
                          </button>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lado Direito: Modos de Dispositivo & Ações Contextuais Agrupadas */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          
          {/* Grupo 1: Seletor de Modo de Visualização & Sincronizar BD */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold shadow-2xs">
              <button
                onClick={() => onChangeViewMode('desktop')}
                className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'desktop'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Visualização Completa para Computadores"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desktop</span>
              </button>

              {canAccessOrders && (
                <button
                  onClick={() => onChangeViewMode('mobile_purchases')}
                  className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'mobile_purchases'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Modo Mobile: Digitação Rápida para Feiras e Viagens"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="hidden sm:inline">Viagens</span>
                </button>
              )}

              <button
                onClick={() => onChangeViewMode('mobile_separation')}
                className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'mobile_separation'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Modo Mobile: Romaneio de Bolso para Doca e Galpão"
              >
                <PackageCheck className="w-3.5 h-3.5 text-teal-300" />
                <span className="hidden sm:inline">Doca</span>
              </button>
            </div>
          </div>

          {/* Divisor vertical sutil */}
          <div className="hidden xl:block h-6 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Grupo 2: Ações Específicas da Tela de Cotação & Pedidos */}
          {activeNav === 'orders' && viewMode === 'desktop' && canAccessOrders && (
            <div className="flex items-center gap-2 flex-wrap">
              
              {/* Subgrupo: Gestão do Pedido (Novo, Duplicar, Descartar) */}
              <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                <button
                  onClick={onNewOrder}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 hover:shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Criar novo pedido em branco"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Novo</span>
                </button>

                {onDuplicateOrder && (
                  <button
                    onClick={onDuplicateOrder}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 hover:shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    title="Duplicar este pedido para ajustar quantidades"
                  >
                    <Copy className="w-3.5 h-3.5 text-blue-500" />
                    <span className="hidden sm:inline">Duplicar</span>
                  </button>
                )}

                {onDiscardDraft && (
                  <button
                    onClick={() => {
                      if (window.confirm('Tem certeza que deseja descartar as alterações deste pedido e zerar a digitação?')) {
                        onDiscardDraft();
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                    title="Descartar rascunho e zerar pedido"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Botão de Exportação: Gerar Proposta Comercial (PDF) */}
              <button
                onClick={onExportPDF}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-rose-400 hover:text-rose-700 dark:hover:text-rose-400 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                title="Gerar PDF da Proposta Comercial Oficial (Via Fornecedor)"
              >
                <FileText className="w-3.5 h-3.5 text-rose-500" />
                <span>Gerar proposta comercial</span>
              </button>

              {/* Botão de Exportação: Exportar Excel (.xlsx) */}
              {onExportExcel && (
                <button
                  onClick={onExportExcel}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Exportar Proposta Comercial em planilha Excel (.xlsx) com o mesmo layout do PDF"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Exportar Excel</span>
                </button>
              )}

              {/* Botão de Importação: Importar Pedido Excel (.xlsx) */}
              {onImportExcel && (
                <button
                  onClick={onImportExcel}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Importar pedido a partir de planilha Excel (.xlsx / .xls)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Importar pedido</span>
                </button>
              )}

              {/* Subgrupo: Ações Principais (Salvar & Fechar Pedido) */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onSaveOrder}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-amber-400 hover:text-amber-700 dark:hover:text-amber-400 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Salvar alterações e manter pedido em espera/rascunho"
                >
                  <Save className="w-3.5 h-3.5 text-amber-500" />
                  <span>Salvar pedido</span>
                </button>

                {onCloseOrder && (
                  <button
                    onClick={onCloseOrder}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 transition flex items-center gap-1.5 cursor-pointer hover:scale-102"
                    title="Fechar pedido e enviar para a separação do depósito"
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>Fechar pedido</span>
                  </button>
                )}
              </div>

            </div>
          )}

          {/* Grupo 3: Ações Específicas da Tela de Separação */}
          {activeNav === 'separation' && viewMode === 'desktop' && (
            <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              {onExportExcel && (
                <button
                  onClick={onExportExcel}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 hover:shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Exportar Romaneio em Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Excel</span>
                </button>
              )}

              <button
                onClick={onExportPDF}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 hover:shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                title="Imprimir Romaneio PDF"
              >
                <FileText className="w-3.5 h-3.5 text-rose-500" />
                <span>Romaneio PDF</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </header>
  );
};
