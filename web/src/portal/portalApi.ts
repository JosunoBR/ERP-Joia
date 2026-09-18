const PORTAL_API_URL = import.meta.env.VITE_PORTAL_API_URL || 'http://localhost:3000/api';

export interface TenantInfo {
  id: string;
  slug: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  ie?: string;
  email: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  logoBase64?: string;
  plano?: string;
  ativo?: number | boolean;
  createdAt?: string;
  dbExists?: boolean;
  dbSize?: string;
  totalUsuarios?: number;
  modules?: string[];
}

export interface PortalUser {
  id: string;
  nome: string;
  email: string;
  role: string;
  tenantId?: string;
  tenantSlug?: string;
  tenantNome?: string;
  ativo?: number | boolean;
  createdAt?: string;
}

export interface PortalModule {
  id: string;
  nome: string;
  descricao: string;
  ativo: number;
  enabledAt?: string;
}

export interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalModules: number;
}

export const portalApi = {
  async registerCompany(company: any, owner: any) {
    const res = await fetch(`${PORTAL_API_URL}/portal/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company, owner })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar empresa');
    return data;
  },

  async login(email: string, senha: string) {
    const res = await fetch(`${PORTAL_API_URL}/portal/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Credenciais inválidas');
    return data;
  },

  async getTenantConfig(slug: string) {
    const res = await fetch(`${PORTAL_API_URL}/portal/tenant/${slug}/config`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Empresa não encontrada');
    return data;
  },

  // --- Rotas Root (requer token root) ---
  async getRootStats(token: string): Promise<DashboardStats> {
    const res = await fetch(`${PORTAL_API_URL}/root/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao carregar estatísticas');
    return data;
  },

  async listTenants(token: string): Promise<TenantInfo[]> {
    const res = await fetch(`${PORTAL_API_URL}/root/tenants`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao listar empresas');
    return data;
  },

  async toggleTenant(token: string, tenantId: string) {
    const res = await fetch(`${PORTAL_API_URL}/root/tenants/${tenantId}/toggle`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao alterar status da empresa');
    return data;
  },

  async deleteTenant(token: string, tenantId: string) {
    const res = await fetch(`${PORTAL_API_URL}/root/tenants/${tenantId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao excluir empresa');
    return data;
  },

  async listAllUsers(token: string): Promise<PortalUser[]> {
    const res = await fetch(`${PORTAL_API_URL}/root/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao listar usuários');
    return data;
  },

  async listModules(token: string): Promise<PortalModule[]> {
    const res = await fetch(`${PORTAL_API_URL}/root/modules`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao listar módulos');
    return data;
  },

  async getTenantModules(token: string, tenantId: string): Promise<PortalModule[]> {
    const res = await fetch(`${PORTAL_API_URL}/root/tenants/${tenantId}/modules`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao obter módulos');
    return data;
  },

  async updateTenantModules(token: string, tenantId: string, moduleIds: string[]) {
    const res = await fetch(`${PORTAL_API_URL}/root/tenants/${tenantId}/modules`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ moduleIds })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao atualizar módulos');
    return data;
  }
};
