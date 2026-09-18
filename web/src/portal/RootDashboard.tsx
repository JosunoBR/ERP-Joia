import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Layers,
  Database,
  ShieldAlert,
  Power,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Sliders,
  LogOut,
  Sparkles,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { portalApi, TenantInfo, PortalUser, PortalModule, DashboardStats } from './portalApi';

interface RootDashboardProps {
  rootToken: string;
  rootUser: any;
  onLogout: () => void;
  onAccessTenantErp: (tenantSlug: string, tenantName: string, tenantModules?: string[]) => void;
}

export const RootDashboard: React.FC<RootDashboardProps> = ({
  rootToken,
  rootUser,
  onLogout,
  onAccessTenantErp
}) => {
  const [activeTab, setActiveTab] = useState<'tenants' | 'users' | 'modules'>('tenants');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [modules, setModules] = useState<PortalModule[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal de Módulos
  const [selectedTenantForModules, setSelectedTenantForModules] = useState<TenantInfo | null>(null);
  const [tenantModules, setTenantModules] = useState<string[]>([]);
  const [savingModules, setSavingModules] = useState(false);

  // Modal de Exclusão
  const [tenantToDelete, setTenantToDelete] = useState<TenantInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, tenantsRes, usersRes, modulesRes] = await Promise.all([
        portalApi.getRootStats(rootToken),
        portalApi.listTenants(rootToken),
        portalApi.listAllUsers(rootToken),
        portalApi.listModules(rootToken)
      ]);

      setStats(statsRes);
      setTenants(tenantsRes);
      setUsers(usersRes);
      setModules(modulesRes);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao carregar dados do painel.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [rootToken]);

  // Alternar Status da Empresa
  const handleToggleTenant = async (tenant: TenantInfo) => {
    try {
      await portalApi.toggleTenant(rootToken, tenant.id);
      setMessage({
        type: 'success',
        text: `Status da empresa "${tenant.nomeFantasia}" alterado com sucesso.`
      });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Abrir Modal de Gerenciar Módulos
  const handleOpenModules = async (tenant: TenantInfo) => {
    setSelectedTenantForModules(tenant);
    try {
      const activeMods = await portalApi.getTenantModules(rootToken, tenant.id);
      setTenantModules(activeMods.map(m => m.id));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Salvar Módulos
  const handleSaveModules = async () => {
    if (!selectedTenantForModules) return;
    setSavingModules(true);
    try {
      await portalApi.updateTenantModules(rootToken, selectedTenantForModules.id, tenantModules);
      setMessage({
        type: 'success',
        text: `Módulos da empresa "${selectedTenantForModules.nomeFantasia}" atualizados com sucesso.`
      });
      setSelectedTenantForModules(null);
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingModules(false);
    }
  };

  // Confirmar Exclusão
  const handleConfirmDelete = async () => {
    if (!tenantToDelete) return;
    setDeleting(true);
    try {
      await portalApi.deleteTenant(rootToken, tenantToDelete.id);
      setMessage({
        type: 'success',
        text: `Empresa "${tenantToDelete.nomeFantasia}" e seu banco de dados foram removidos permanentemente.`
      });
      setTenantToDelete(null);
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setDeleting(false);
    }
  };

  // Filtros
  const filteredTenants = tenants.filter(t =>
    t.nomeFantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.cnpj.includes(searchTerm) ||
    t.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.tenantNome && u.tenantNome.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-md shadow-rose-950/40">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                Painel Central do Administrador Root
              </h1>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-slate-400">Jóia ERP • Gestão Global de Empresas e Banco de Dados</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            title="Atualizar Dados"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-rose-100 border border-rose-800/80 text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Encerrar Sessão Root
          </button>
        </div>
      </header>



      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 flex-1 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total de Empresas</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{stats?.totalTenants ?? '-'}</p>
            <span className="text-[11px] text-emerald-400 font-medium">Bancos individuais provisionados</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Empresas Ativas</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{stats?.activeTenants ?? '-'}</p>
            <span className="text-[11px] text-slate-400">Acessando o sistema normalmente</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Usuários Globais</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{stats?.totalUsers ?? '-'}</p>
            <span className="text-[11px] text-slate-400">Em todas as empresas</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Módulos do Sistema</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{stats?.totalModules ?? '-'}</p>
            <span className="text-[11px] text-amber-400 font-medium">Features gerenciáveis</span>
          </div>
        </div>

        {/* Abas e Busca */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('tenants')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'tenants'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Empresas Cadastradas ({tenants.length})
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'users'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Usuários Globais ({users.length})
            </button>

            <button
              onClick={() => setActiveTab('modules')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'modules'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Módulos do Sistema ({modules.length})
            </button>
          </div>

          <div className="w-full sm:w-72 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por nome, CNPJ ou e-mail..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-hidden focus:border-emerald-500 placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* TAB 1: EMPRESAS */}
        {activeTab === 'tenants' && (
          <div className="space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Empresa / Logotipo</th>
                      <th className="py-3 px-4">CNPJ & Local</th>
                      <th className="py-3 px-4">Banco de Dados (.db)</th>
                      <th className="py-3 px-4">Usuários</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ações Administrativas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredTenants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          Nenhuma empresa encontrada com os termos buscados.
                        </td>
                      </tr>
                    ) : (
                      filteredTenants.map(tenant => (
                        <tr key={tenant.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                                {tenant.logoBase64 ? (
                                  <img
                                    src={tenant.logoBase64}
                                    alt={tenant.nomeFantasia}
                                    className="w-full h-full object-contain p-1"
                                  />
                                ) : (
                                  <Building2 className="w-5 h-5 text-slate-500" />
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-white text-sm">{tenant.nomeFantasia}</div>
                                <div className="text-slate-400 text-[11px] truncate max-w-xs">{tenant.razaoSocial}</div>
                                <span className="text-[10px] text-emerald-400 font-mono">slug: {tenant.slug}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-mono text-slate-300">{tenant.cnpj}</div>
                            <div className="text-slate-500 text-[11px]">
                              {tenant.cidade ? `${tenant.cidade} - ${tenant.estado}` : 'Não informado'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <Database className="w-3.5 h-3.5 text-blue-400" />
                              <span className="font-mono text-slate-300">{tenant.slug}.db</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Tamanho: <span className="text-slate-300 font-semibold">{tenant.dbSize}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-semibold">
                              <Users className="w-3 h-3 text-slate-400" />
                              {tenant.totalUsuarios || 0}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleTenant(tenant)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                                tenant.ativo
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900'
                                  : 'bg-rose-950 text-rose-400 border border-rose-800 hover:bg-rose-900'
                              }`}
                            >
                              <Power className="w-3 h-3" />
                              {tenant.ativo ? 'Ativo' : 'Suspenso'}
                            </button>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Acessar ERP como Root */}
                                <button
                                  onClick={() => onAccessTenantErp(tenant.slug, tenant.nomeFantasia, tenant.modules)}
                                  title="Acessar ERP desta empresa para suporte"
                                className="p-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80 transition-colors cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>

                              {/* Editar Módulos */}
                              <button
                                onClick={() => handleOpenModules(tenant)}
                                title="Configurar módulos habilitados"
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>

                              {/* Excluir Empresa */}
                              <button
                                onClick={() => setTenantToDelete(tenant)}
                                title="Excluir empresa e banco de dados"
                                className="p-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/80 text-rose-400 hover:text-rose-200 border border-rose-800/60 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USUÁRIOS GLOBAIS */}
        {activeTab === 'users' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Nome do Usuário</th>
                    <th className="py-3 px-4">E-mail de Acesso</th>
                    <th className="py-3 px-4">Empresa Vinculada</th>
                    <th className="py-3 px-4">Função / Perfil</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">{user.nome}</td>
                        <td className="py-3 px-4 text-slate-300 font-mono">{user.email}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-emerald-400">{user.tenantNome || 'Sem empresa'}</span>
                          <span className="text-[10px] text-slate-500 block font-mono">({user.tenantSlug})</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px] uppercase">
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {user.ativo ? (
                            <span className="text-emerald-400 font-medium">Ativo</span>
                          ) : (
                            <span className="text-rose-400 font-medium">Inativo</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: MÓDULOS DO SISTEMA */}
        {activeTab === 'modules' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map(mod => (
              <div key={mod.id} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{mod.nome}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
                    id: {mod.id}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{mod.descricao}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL: Gerenciar Módulos da Empresa */}
      {selectedTenantForModules && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">
                  Módulos de {selectedTenantForModules.nomeFantasia}
                </h3>
                <p className="text-xs text-slate-400">Ative ou desative funcionalidades para este tenant</p>
              </div>
              <button
                onClick={() => setSelectedTenantForModules(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {modules.map(mod => {
                const isChecked = tenantModules.includes(mod.id);
                return (
                  <label
                    key={mod.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={e => {
                        if (e.target.checked) {
                          setTenantModules([...tenantModules, mod.id]);
                        } else {
                          setTenantModules(tenantModules.filter(m => m !== mod.id));
                        }
                      }}
                      className="mt-1 rounded-sm border-slate-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">{mod.nome}</div>
                      <div className="text-[11px] text-slate-400">{mod.descricao}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedTenantForModules(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingModules}
                onClick={handleSaveModules}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {savingModules ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmar Exclusão de Empresa */}
      {tenantToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 w-fit">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-white text-lg">
                Excluir permanentemente a empresa?
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Você está prestes a excluir a empresa <strong className="text-white">{tenantToDelete.nomeFantasia}</strong> ({tenantToDelete.cnpj}). O banco de dados <code className="text-rose-300">{tenantToDelete.slug}.db</code> e todos os usuários vinculados serão deletados irreversivelmente.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setTenantToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {deleting ? 'Excluindo...' : 'Sim, Excluir Empresa e Banco'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
