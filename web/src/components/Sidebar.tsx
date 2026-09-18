import React, { useState } from 'react';
import { 
  Home,
  ShoppingCart, 
  PackageCheck, 
  BarChart3, 
  Building2, 
  FolderOpen, 
  Settings, 
  Sun, 
  Moon, 
  ShoppingBag, 
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Users as UsersIcon,
  Boxes, 
  CreditCard,
  Warehouse,
  ArrowLeft
} from 'lucide-react';
import { PurchaseOrder, User, UserRole } from '../shared/types';

export type ActiveNavTab = 'home' | 'orders' | 'stock' | 'financial' | 'separation' | 'separationHistory' | 'products' | 'dashboard' | 'suppliers' | 'history' | 'fiscal' | 'users';

interface SidebarProps {
  order: PurchaseOrder;
  activeNav: ActiveNavTab;
  onSelectNav: (tab: ActiveNavTab) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  currentUser?: User;
  onLogout?: () => void;
  onReturnToRoot?: () => void;
  hasActiveDraft?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  order: _order,
  activeNav,
  onSelectNav,
  isDark,
  onToggleTheme,
  currentUser,
  onLogout,
  onReturnToRoot,
  hasActiveDraft
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('erp_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('erp_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const userRole: UserRole = currentUser?.role || 'diretoria';

  // Configuração de visibilidade estrita por perfil (RBAC) e Módulos Contratados pelo Tenant
  const isManager = userRole === 'diretoria' || userRole === 'owner' || userRole === 'root';

  // Validação dinâmica dos módulos liberados pelo administrador Root para a empresa (Root tem acesso total irrestrito)
  const isModuleActive = (modId: string): boolean => {
    if (userRole === 'root' || currentUser?.isRootSupport) return true;
    if (currentUser?.tenantModules && Array.isArray(currentUser.tenantModules)) {
      return currentUser.tenantModules.includes(modId);
    }
    return true;
  };

  const canAccessHome = isManager || userRole === 'deposito' || userRole === 'comprador';
  const canAccessOrders = (isManager || userRole === 'comprador') && isModuleActive('compras');
  const canAccessStock = (isManager || userRole === 'deposito') && isModuleActive('estoque');
  const canAccessSeparation = isModuleActive('separacao');
  const canAccessFinancial = isManager && isModuleActive('financeiro');
  const canAccessDashboard = isManager && isModuleActive('relatorios');
  const canAccessHistory = (isManager || userRole === 'comprador') && isModuleActive('compras');
  const canAccessSeparationHistory = isModuleActive('separacao');
  const canAccessProducts = (isManager || userRole === 'deposito' || userRole === 'comprador') && isModuleActive('catalogo');
  const canAccessSuppliers = (isManager || userRole === 'comprador') && isModuleActive('catalogo');
  const canAccessFiscal = isManager;
  const canAccessUsers = isManager;

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'owner': return 'Proprietário';
      case 'diretoria': return 'Diretoria';
      case 'root': return 'Super Admin';
      case 'deposito': return 'Depósito & CD';
      case 'separacao': return 'Separação & Doca';
      case 'comprador': return 'Comprador';
      default: return 'Usuário';
    }
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'diretoria': return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
      case 'deposito': return 'bg-blue-500/15 text-blue-500 border-blue-500/30';
      case 'separacao': return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
      default: return 'bg-slate-500/15 text-slate-500 border-slate-500/30';
    }
  };

  const renderItem = (
    id: ActiveNavTab,
    label: string,
    icon: React.ReactNode,
    isActive: boolean,
    badge?: React.ReactNode,
    showDraftDot?: boolean
  ) => {
    if (isCollapsed) {
      return (
        <button
          key={id}
          onClick={() => onSelectNav(id)}
          className={`w-11 h-11 mx-auto rounded-xl flex items-center justify-center transition-all relative cursor-pointer group ${
            isActive
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={label}
        >
          {icon}
          {showDraftDot && !isActive && (
            <span 
              className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" 
              title="Rascunho em andamento"
            />
          )}
        </button>
      );
    }

    return (
      <button
        key={id}
        onClick={() => onSelectNav(id)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
          isActive
            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="shrink-0">{icon}</span>
          <span className="truncate">{label}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {badge}
          {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
        </div>
      </button>
    );
  };

  return (
    <aside 
      className={`${
        isCollapsed ? 'w-[72px]' : 'w-64'
      } bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between shrink-0 h-screen sticky top-0 transition-all duration-300 ease-in-out z-30 select-none overflow-x-hidden overflow-y-auto`}
    >
      
      {/* 1. Topo: Brand & Botão de Recolher/Expandir */}
      <div>
        <div className={`p-3.5 border-b border-slate-200/80 dark:border-slate-800 ${isCollapsed ? 'flex flex-col items-center gap-2' : 'flex items-center justify-between'}`}>
          <div 
            onClick={isCollapsed ? toggleCollapsed : undefined}
            className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'cursor-pointer' : ''}`}
            title={isCollapsed ? 'Expandir menu lateral' : undefined}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/25 shrink-0 transition-transform hover:scale-105 overflow-hidden p-1">
              {currentUser?.tenantLogo ? (
                <img src={currentUser.tenantLogo} alt={currentUser.tenantName || 'Logo'} className="w-full h-full object-contain" />
              ) : (
                <ShoppingBag className="w-5 h-5" />
              )}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-none truncate" title={currentUser?.tenantName || 'Jóia ERP'}>
                  {currentUser?.tenantName || 'Jóia ERP'}
                </h1>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
                    {currentUser?.tenantSlug ? `${currentUser.tenantSlug}.db` : 'SQLite Ativo'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={toggleCollapsed}
            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral (Expandir espaço)'}
            aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* 2. Menu de Navegação Estruturado em 3 Pilares Lógicos */}
        <div className={`space-y-3 ${isCollapsed ? 'p-2' : 'p-3'}`}>
          
          {/* GRUPO 1: OPERAÇÃO CENTRAL */}
          <div className="space-y-1">
            {!isCollapsed ? (
              <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Operação Central
              </div>
            ) : (
              <div className="h-px bg-slate-200/80 dark:bg-slate-800 my-1 mx-2" />
            )}

            {/* Início / Home Hub */}
            {canAccessHome && renderItem(
              'home',
              'Início (Visão Geral)',
              <Home className={`w-4 h-4 ${activeNav === 'home' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />,
              activeNav === 'home'
            )}

            {/* Cotação & Pedidos */}
            {canAccessOrders && renderItem(
              'orders',
              'Cotação & Pedidos',
              <ShoppingCart className={`w-4 h-4 ${activeNav === 'orders' ? 'text-white' : 'text-emerald-500'}`} />,
              activeNav === 'orders',
              hasActiveDraft && activeNav !== 'orders' ? (
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-500 text-slate-950 uppercase tracking-tight animate-pulse" title="Rascunho em andamento">
                  Rascunho
                </span>
              ) : null,
              Boolean(hasActiveDraft)
            )}

            {/* Separação e Distribuição por Lojas */}
            {canAccessSeparation && renderItem(
              'separation',
              userRole === 'separacao' 
                ? 'Conferência & Doca' 
                : 'Distribuição',
              userRole === 'separacao' ? (
                <PackageCheck className={`w-4 h-4 ${activeNav === 'separation' ? 'text-white' : 'text-purple-500'}`} />
              ) : (
                <Boxes className={`w-4 h-4 ${activeNav === 'separation' ? 'text-white' : 'text-blue-500'}`} />
              ),
              activeNav === 'separation'
            )}

            {/* Depósito / Estoque Central */}
            {canAccessStock && renderItem(
              'stock',
              'Depósito / Estoque CD',
              <Warehouse className={`w-4 h-4 ${activeNav === 'stock' ? 'text-white' : 'text-emerald-500'}`} />,
              activeNav === 'stock'
            )}
          </div>

          {/* GRUPO 2: GESTÃO & INTELIGÊNCIA */}
          <div className="space-y-1">
            {!isCollapsed ? (
              <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Gestão & Inteligência
              </div>
            ) : (
              <div className="h-px bg-slate-200/80 dark:bg-slate-800 my-1 mx-2" />
            )}

            {/* Financeiro / Boletos */}
            {canAccessFinancial && renderItem(
              'financial',
              'Financeiro / Boletos',
              <CreditCard className={`w-4 h-4 ${activeNav === 'financial' ? 'text-white' : 'text-amber-500'}`} />,
              activeNav === 'financial'
            )}

            {/* Dashboard & BI */}
            {canAccessDashboard && renderItem(
              'dashboard',
              'Dashboard & BI',
              <BarChart3 className={`w-4 h-4 ${activeNav === 'dashboard' ? 'text-white' : 'text-teal-500'}`} />,
              activeNav === 'dashboard'
            )}

            {/* Histórico de Pedidos */}
            {canAccessHistory && renderItem(
              'history',
              'Histórico de Pedidos',
              <FolderOpen className={`w-4 h-4 ${activeNav === 'history' ? 'text-white' : 'text-amber-500'}`} />,
              activeNav === 'history'
            )}

            {/* Histórico de Separações */}
            {canAccessSeparationHistory && renderItem(
              'separationHistory',
              'Histórico Separações',
              <Boxes className={`w-4 h-4 ${activeNav === 'separationHistory' ? 'text-white' : 'text-teal-400'}`} />,
              activeNav === 'separationHistory'
            )}
          </div>

          {/* GRUPO 3: CADASTROS & SISTEMA */}
          <div className="space-y-1">
            {!isCollapsed ? (
              <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Cadastros & Sistema
              </div>
            ) : (
              <div className="h-px bg-slate-200/80 dark:bg-slate-800 my-1 mx-2" />
            )}

            {/* Catálogo de Produtos */}
            {canAccessProducts && renderItem(
              'products',
              'Catálogo de Produtos',
              <ShoppingBag className={`w-4 h-4 ${activeNav === 'products' ? 'text-white' : 'text-purple-400'}`} />,
              activeNav === 'products'
            )}

            {/* Fornecedores */}
            {canAccessSuppliers && renderItem(
              'suppliers',
              'Fornecedores',
              <Building2 className={`w-4 h-4 ${activeNav === 'suppliers' ? 'text-white' : 'text-emerald-500'}`} />,
              activeNav === 'suppliers'
            )}

            {/* Configurações Gerais */}
            {canAccessFiscal && renderItem(
              'fiscal',
              'Configurações gerais',
              <Settings className={`w-4 h-4 ${activeNav === 'fiscal' ? 'text-white' : 'text-indigo-400'}`} />,
              activeNav === 'fiscal'
            )}

            {/* Gestão de Usuários (RBAC) */}
            {canAccessUsers && renderItem(
              'users',
              'Gestão de Usuários',
              <UsersIcon className={`w-4 h-4 ${activeNav === 'users' ? 'text-white' : 'text-pink-400'}`} />,
              activeNav === 'users'
            )}
          </div>

        </div>
      </div>

      {/* 3. Rodapé da Barra Lateral: Usuário & Tema */}
      <div className={`border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 ${isCollapsed ? 'p-2 space-y-2' : 'p-3 space-y-2'}`}>
        
        {/* Widget do Usuário Logado */}
        {currentUser && (
          isCollapsed ? (
            <div className="flex flex-col items-center gap-1.5">
              <div 
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-extrabold text-xs shadow-xs cursor-default"
                title={`${currentUser.nome} (${getRoleLabel(currentUser.role)})`}
              >
                {currentUser.nome.charAt(0).toUpperCase()}
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="w-9 h-9 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center justify-center transition cursor-pointer"
                  title="Sair da Conta"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs">
                  {currentUser.nome.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {(currentUser.nome || 'Usuário').replace(/\s*\([^)]*\)/g, '').trim()}
                  </div>
                  <div className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md border inline-block ${getRoleBadgeStyle(currentUser.role)}`}>
                    {getRoleLabel(currentUser.role)}
                  </div>
                </div>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                  title="Sair da Conta"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )
        )}

        {/* Botão de Retorno ao Painel Root (quando em Modo Suporte) */}
        {currentUser?.isRootSupport && onReturnToRoot && (
          <div className="pt-1 pb-2">
            <button
              type="button"
              onClick={onReturnToRoot}
              className={`w-full py-2 px-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                isCollapsed ? 'w-10 h-10 mx-auto p-0' : ''
              }`}
              title="Retornar ao painel de gerenciamento"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate">Retornar ao painel</span>}
            </button>
          </div>
        )}

        {/* Alternador de Tema Visual */}
        {isCollapsed ? (
          <div className="flex justify-center pt-1 border-t border-slate-200/60 dark:border-slate-800">
            <button
              onClick={onToggleTheme}
              className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer flex items-center justify-center shadow-2xs"
              title={isDark ? "Alternar para Modo Claro" : "Alternar para Modo Escuro"}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Modo de Cor</span>
            <button
              onClick={onToggleTheme}
              className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs"
              title="Alternar Modo Escuro / Claro"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px]">Escuro</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-[10px]">Claro</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>

    </aside>
  );
};

