import { PurchaseOrder, Supplier, FiscalConfig, FiscalPreset, StoreConfig, Product, User, CentralStockItem, SeparationPreset, PaymentCondition, FinancialEntry, FinancialSummary } from '../shared/types';
import { API_BASE_URL } from './config';

export class ApiError extends Error {
  status: number;
  isNetworkError: boolean;

  constructor(message: string, status: number = 0, isNetworkError: boolean = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

export function isOfflineError(err: any): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (err instanceof ApiError && err.isNetworkError) return true;
  if (err?.name === 'TypeError' && err?.message?.toLowerCase().includes('fetch')) return true;
  if (err?.message?.toLowerCase().includes('failed to fetch')) return true;
  if (err?.message?.toLowerCase().includes('networkerror')) return true;
  return false;
}

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders };
  try {
    const raw = localStorage.getItem('erp_user');
    if (raw) {
      const user = JSON.parse(raw);
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
      if (user?.tenantSlug) {
        headers['X-Tenant-Slug'] = user.tenantSlug;
      }
    }
  } catch {}
  return headers;
}

async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const headers = getAuthHeaders(options.headers as Record<string, string> || {});
  
  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errorMessage = `Erro HTTP ${res.status}`;
      try {
        const errorData = await res.json();
        if (errorData?.error) errorMessage = errorData.error;
        else if (errorData?.message) errorMessage = errorData.message;
      } catch {}

      if (res.status === 401) {
        errorMessage = 'Sessão expirada ou não autenticada no servidor. Faça login novamente.';
      } else if (res.status === 403) {
        errorMessage = 'Acesso negado: seu usuário não tem permissão para esta operação.';
      }

      throw new ApiError(errorMessage, res.status, false);
    }
    return res;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(
      'Não foi possível conectar ao servidor. Verifique sua conexão ou se o servidor está ativo.',
      0,
      true
    );
  }
}

export async function fetchHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// PRODUTOS COM FOTOS
export async function fetchProductsFromDb(): Promise<Product[]> {
  const res = await apiFetch('/products');
  return res.json();
}

export async function saveProductToDb(product: Product): Promise<void> {
  await apiFetch('/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
}

export async function saveProductsBatchToDb(products: Product[]): Promise<void> {
  await apiFetch('/products/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(products)
  });
}

export async function deleteProductFromDb(id: string): Promise<void> {
  await apiFetch(`/products/${id}`, {
    method: 'DELETE'
  });
}

// FORNECEDORES
export async function fetchSuppliersFromDb(): Promise<Supplier[]> {
  const res = await apiFetch('/suppliers');
  return res.json();
}

export async function saveSupplierToDb(supplier: Supplier): Promise<void> {
  await apiFetch('/suppliers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(supplier)
  });
}

export async function deleteSupplierFromDb(id: string): Promise<void> {
  await apiFetch(`/suppliers/${id}`, {
    method: 'DELETE'
  });
}

// PEDIDOS DE COMPRA
export async function fetchOrdersFromDb(): Promise<PurchaseOrder[]> {
  const res = await apiFetch('/orders');
  return res.json();
}

export async function saveOrderToDb(order: PurchaseOrder): Promise<void> {
  await apiFetch('/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  });
}

export async function deleteOrderFromDb(orderId: string): Promise<void> {
  await apiFetch(`/orders/${orderId}`, {
    method: 'DELETE'
  });
}

export async function duplicateOrderInDb(orderId: string): Promise<PurchaseOrder> {
  const res = await apiFetch(`/orders/${orderId}/duplicate`, {
    method: 'POST'
  });
  const data = await res.json();
  return data.order;
}

export async function updateInstallmentInDb(
  orderId: string, 
  installment: any
): Promise<void> {
  await apiFetch(`/orders/${orderId}/installment`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(installment)
  });
}

export async function fetchStoresFromDb(): Promise<StoreConfig[]> {
  const res = await apiFetch('/config/stores');
  return res.json();
}

export async function saveStoresToDb(stores: StoreConfig[]): Promise<StoreConfig[]> {
  const res = await apiFetch('/config/stores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stores)
  });
  return res.json();
}

// MODELOS / PRESETS DE SEPARAÇÃO DE LOJAS (SAVES)
export async function fetchSeparationPresetsFromDb(): Promise<SeparationPreset[]> {
  const res = await apiFetch('/separation-presets');
  return res.json();
}

export async function saveSeparationPresetToDb(preset: SeparationPreset): Promise<SeparationPreset> {
  const res = await apiFetch('/separation-presets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preset)
  });
  return res.json();
}

export async function deleteSeparationPresetFromDb(id: string): Promise<void> {
  await apiFetch(`/separation-presets/${id}`, {
    method: 'DELETE'
  });
}

// MODELOS / PRESETS DE ENGENHARIA FISCAL (SAVES)
export async function fetchFiscalPresetsFromDb(): Promise<FiscalPreset[]> {
  const res = await apiFetch('/fiscal-presets');
  return res.json();
}

export async function saveFiscalPresetToDb(preset: FiscalPreset): Promise<FiscalPreset> {
  const res = await apiFetch('/fiscal-presets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preset)
  });
  return res.json();
}

export async function deleteFiscalPresetFromDb(id: string): Promise<void> {
  await apiFetch(`/fiscal-presets/${id}`, {
    method: 'DELETE'
  });
}

// ESTOQUE DO DEPÓSITO CENTRAL (CD MATRIZ)
export async function fetchStockFromDb(): Promise<CentralStockItem[]> {
  const res = await apiFetch('/stock');
  return res.json();
}

export async function saveStockItemToDb(item: CentralStockItem): Promise<CentralStockItem> {
  const res = await apiFetch('/stock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  return res.json();
}

export async function updateStockBalanceInDb(
  id: string, 
  deltaUnidades: number, 
  localizacaoGalpao?: string
): Promise<CentralStockItem> {
  const res = await apiFetch(`/stock/${id}/balance`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deltaUnidades, localizacaoGalpao })
  });
  return res.json();
}

export async function deleteStockItemFromDb(id: string): Promise<void> {
  await apiFetch(`/stock/${id}`, {
    method: 'DELETE'
  });
}

export async function clearAllStockFromDb(): Promise<void> {
  await apiFetch('/stock/clear/all', {
    method: 'DELETE'
  });
}

export async function fetchFiscalConfigFromDb(): Promise<FiscalConfig> {
  try {
    const res = await apiFetch('/config/fiscal');
    return await res.json();
  } catch {
    return {
      icmsAliquota: 0.11,
      ipiAliquota: 0.00,
      pisCofinsAliquota: 0.03,
      custosFixos: 0.26,
      creditoEntradaICMS: 0.195
    };
  }
}

export async function saveFiscalConfigToDb(config: FiscalConfig): Promise<void> {
  await apiFetch('/config/fiscal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
}

export async function fetchNextOrderNumberFromDb(): Promise<string> {
  try {
    const res = await apiFetch('/orders');
    const orders: PurchaseOrder[] = await res.json();
    if (!orders || orders.length === 0) return 'PED-0001';

    let maxNum = 0;
    orders.forEach(o => {
      const match = (o.header?.numeroPedido || '').match(/(\d+)/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });

    return `PED-${String(maxNum + 1).padStart(4, '0')}`;
  } catch {
    return 'PED-0001';
  }
}

export async function fetchUsersFromDb(): Promise<User[]> {
  const res = await apiFetch('/users');
  return res.json();
}

export async function saveUserToDb(user: Partial<User> & { senha?: string }): Promise<User> {
  const isUpdate = Boolean(user.id);
  const url = isUpdate ? `/users/${user.id}` : '/users';
  const method = isUpdate ? 'PUT' : 'POST';

  const res = await apiFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
  return res.json();
}

export async function deleteUserFromDb(id: string): Promise<void> {
  await apiFetch(`/users/${id}`, {
    method: 'DELETE'
  });
}

// Condições de Pagamento
export async function fetchPaymentConditionsFromDb(activeOnly: boolean = false): Promise<PaymentCondition[]> {
  const query = activeOnly ? '?active=true' : '';
  const res = await apiFetch(`/payment-conditions${query}`);
  return res.json();
}

export async function savePaymentConditionToDb(condition: Partial<PaymentCondition>): Promise<PaymentCondition> {
  const res = await apiFetch('/payment-conditions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(condition)
  });
  return res.json();
}

export async function deletePaymentConditionFromDb(id: string): Promise<void> {
  await apiFetch(`/payment-conditions/${id}`, {
    method: 'DELETE'
  });
}

// -------------------------------------------------------------
// GESTÃO FINANCEIRA ERP & CONTAS A PAGAR
// -------------------------------------------------------------

export interface FinancialFilters {
  month?: string;
  year?: string;
  storeId?: string;
  lojaNome?: string;
  categoria?: string;
  status?: string;
  tipo?: string;
  search?: string;
  empresa?: string;
}

export async function fetchFinancialEntriesFromDb(filters: FinancialFilters = {}): Promise<FinancialEntry[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') {
      params.append(k, String(v));
    }
  });
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const res = await apiFetch(`/financial/entries${queryString}`);
  const json = await res.json();
  return json.data || [];
}

export async function fetchFinancialSummaryFromDb(filters: FinancialFilters = {}): Promise<FinancialSummary> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') {
      params.append(k, String(v));
    }
  });
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const res = await apiFetch(`/financial/summary${queryString}`);
  const json = await res.json();
  return json.data;
}

export async function saveFinancialEntryToDb(entryData: any): Promise<FinancialEntry | FinancialEntry[]> {
  const isUpdate = Boolean(entryData.id);
  const url = isUpdate ? `/financial/entries/${entryData.id}` : '/financial/entries';
  const method = isUpdate ? 'PUT' : 'POST';

  const res = await apiFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entryData)
  });
  const json = await res.json();
  return json.data;
}

export async function payFinancialEntryInDb(id: string, paymentData: { dataPagamento?: string; valorPago?: number; observacao?: string } = {}): Promise<FinancialEntry> {
  const res = await apiFetch(`/financial/entries/${id}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentData)
  });
  const json = await res.json();
  return json.data;
}

export async function deleteFinancialEntryFromDb(id: string): Promise<void> {
  await apiFetch(`/financial/entries/${id}`, {
    method: 'DELETE'
  });
}

export async function syncFinancialOrdersInDb(): Promise<{ createdCount: number; message: string }> {
  const res = await apiFetch('/financial/sync-orders', {
    method: 'POST'
  });
  const json = await res.json();
  return json.data;
}

export async function importFinancialClientSheetInDb(customFilePath?: string): Promise<{ importedCount: number; totalValor: number; message: string }> {
  const res = await apiFetch('/financial/import-sheet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customFilePath })
  });
  const json = await res.json();
  return json.data;
}

export async function restoreDatabaseBackupApi(backupData: any): Promise<{
  success: boolean;
  restoredSuppliersCount: number;
  restoredProductsCount: number;
  restoredOrdersCount: number;
  restoredItemsCount?: number;
  restoredConditionsCount?: number;
}> {
  const res = await apiFetch('/config/restore-backup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backupData)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao restaurar backup no servidor.');
  }
  return res.json();
}

export async function exportDatabaseBackupApi(): Promise<Record<string, string>> {
  const res = await apiFetch('/config/export-backup');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao exportar backup do servidor.');
  }
  return res.json();
}
