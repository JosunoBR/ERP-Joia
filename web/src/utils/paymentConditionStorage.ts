import { PaymentCondition } from '../shared/types';
import {
  fetchPaymentConditionsFromDb,
  savePaymentConditionToDb,
  deletePaymentConditionFromDb,
  isOfflineError
} from './api';
import { safeSetItem } from './storage';

const STORAGE_KEY = 'erp_payment_conditions';

export const DEFAULT_PAYMENT_CONDITIONS: PaymentCondition[] = [
  { id: 'cond_30_60_90', descricao: '30/60/90 Dias', qtdParcelas: 3, parcelasDias: [30, 60, 90], especie: 'Boleto', ativo: true, padrao: true },
  { id: 'cond_7_14_21_28', descricao: '7/14/21/28 Dias', qtdParcelas: 4, parcelasDias: [7, 14, 21, 28], especie: 'Boleto', ativo: true },
  { id: 'cond_14_21_28_35_42_49_56', descricao: '14/21/28/35/42/49/56 Dias', qtdParcelas: 7, parcelasDias: [14, 21, 28, 35, 42, 49, 56], especie: 'Boleto', ativo: true },
  { id: 'cond_28_35_42', descricao: '28/35/42 Dias', qtdParcelas: 3, parcelasDias: [28, 35, 42], especie: 'Boleto', ativo: true },
  { id: 'cond_28_35_42_49_56', descricao: '28/35/42/49/56 Dias', qtdParcelas: 5, parcelasDias: [28, 35, 42, 49, 56], especie: 'Boleto', ativo: true },
  { id: 'cond_30_60', descricao: '30/60 Dias', qtdParcelas: 2, parcelasDias: [30, 60], especie: 'Boleto', ativo: true },
  { id: 'cond_30_45_60', descricao: '30/45/60 Dias', qtdParcelas: 3, parcelasDias: [30, 45, 60], especie: 'Boleto', ativo: true },
  { id: 'cond_30_40_50_60', descricao: '30/40/50/60 Dias', qtdParcelas: 4, parcelasDias: [30, 40, 50, 60], especie: 'Boleto', ativo: true },
  { id: 'cond_30_45_60_75_90', descricao: '30/45/60/75/90 Dias', qtdParcelas: 5, parcelasDias: [30, 45, 60, 75, 90], especie: 'Boleto', ativo: true },
  { id: 'cond_30_40_50_60_70_80_90', descricao: '30/40/50/60/70/80/90 Dias', qtdParcelas: 7, parcelasDias: [30, 40, 50, 60, 70, 80, 90], especie: 'Boleto', ativo: true },
  { id: 'cond_30_60_90_120', descricao: '30/60/90/120 Dias', qtdParcelas: 4, parcelasDias: [30, 60, 90, 120], especie: 'Boleto', ativo: true },
  { id: 'cond_30_45_60_75_90_105_120', descricao: '30/45/60/75/90/105/120 Dias', qtdParcelas: 7, parcelasDias: [30, 45, 60, 75, 90, 105, 120], especie: 'Boleto', ativo: true },
  { id: 'cond_30_40_50_60_70_80_90_100_110_120', descricao: '30/40/50/60/70/80/90/100/110/120 Dias', qtdParcelas: 10, parcelasDias: [30, 40, 50, 60, 70, 80, 90, 100, 110, 120], especie: 'Boleto', ativo: true },
  { id: 'cond_30_60_90_120_150', descricao: '30/60/90/120/150 Dias', qtdParcelas: 5, parcelasDias: [30, 60, 90, 120, 150], especie: 'Boleto', ativo: true },
  { id: 'cond_30_45_60_75_90_105_120_135_150', descricao: '30/45/60/75/90/105/120/135/150 Dias', qtdParcelas: 9, parcelasDias: [30, 45, 60, 75, 90, 105, 120, 135, 150], especie: 'Boleto', ativo: true },
  { id: 'cond_30_40_50_60_70_80_90_100_110_120_130_140_150', descricao: '30/40/50/60/70/80/90/100/110/120/130/140/150 Dias', qtdParcelas: 13, parcelasDias: [30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150], especie: 'Boleto', ativo: true },
  { id: 'cond_45_60_75_90', descricao: '45/60/75/90 Dias', qtdParcelas: 4, parcelasDias: [45, 60, 75, 90], especie: 'Boleto', ativo: true },
  { id: 'cond_45_55_65_75_85_95_105_115', descricao: '45/55/65/75/85/95/105/115 Dias', qtdParcelas: 8, parcelasDias: [45, 55, 65, 75, 85, 95, 105, 115], especie: 'Boleto', ativo: true },
  { id: 'cond_45_60_75_90_105_120', descricao: '45/60/75/90/105/120 Dias', qtdParcelas: 6, parcelasDias: [45, 60, 75, 90, 105, 120], especie: 'Boleto', ativo: true },
  { id: 'cond_45_60_75_90_105_120_135_150', descricao: '45/60/75/90/105/120/135/150 Dias', qtdParcelas: 8, parcelasDias: [45, 60, 75, 90, 105, 120, 135, 150], especie: 'Boleto', ativo: true },
  { id: 'cond_45_55_65_75_85_95_105_115_125_135_145_155', descricao: '45/55/65/75/85/95/105/115/125/135/145/155 Dias', qtdParcelas: 12, parcelasDias: [45, 55, 65, 75, 85, 95, 105, 115, 125, 135, 145, 155], especie: 'Boleto', ativo: true },
  { id: 'cond_30', descricao: '30 Dias (1x)', qtdParcelas: 1, parcelasDias: [30], especie: 'Boleto', ativo: true },
  { id: 'cond_vista', descricao: '100% À Vista (TED/PIX)', qtdParcelas: 1, parcelasDias: [0], especie: 'Depósito', ativo: true }
];

export async function loadPaymentConditions(onlyActive: boolean = false): Promise<PaymentCondition[]> {
  try {
    const list = await fetchPaymentConditionsFromDb(onlyActive);
    if (Array.isArray(list) && list.length > 0) {
      safeSetItem(STORAGE_KEY, JSON.stringify(list));
      return list;
    }
  } catch (err) {
    if (!isOfflineError(err)) {
      console.warn('Falha ao carregar condições do backend, usando cache local:', err);
    }
  }

  // Fallback para cache local
  const localRaw = localStorage.getItem(STORAGE_KEY);
  if (localRaw) {
    try {
      const parsed: PaymentCondition[] = JSON.parse(localRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return onlyActive ? parsed.filter(c => c.ativo) : parsed;
      }
    } catch {}
  }

  return onlyActive ? DEFAULT_PAYMENT_CONDITIONS.filter(c => c.ativo) : DEFAULT_PAYMENT_CONDITIONS;
}

export async function savePaymentCondition(condition: Partial<PaymentCondition>): Promise<PaymentCondition> {
  let savedCondition: PaymentCondition | null = null;
  try {
    savedCondition = await savePaymentConditionToDb(condition);
  } catch (err) {
    console.warn('Não foi possível salvar condição no backend, salvando no cache local:', err);
  }

  const existingList = await loadPaymentConditions(false);
  const now = new Date().toISOString();
  const id = savedCondition?.id || condition.id || ('cond_' + Date.now());
  
  const formatted: PaymentCondition = {
    id,
    descricao: condition.descricao || 'Nova Condição',
    qtdParcelas: Number(condition.qtdParcelas) || 1,
    parcelasDias: condition.parcelasDias && condition.parcelasDias.length > 0
      ? condition.parcelasDias 
      : [30],
    especie: condition.especie || 'Boleto',
    banco: condition.banco || '',
    ativo: condition.ativo !== undefined ? condition.ativo : true,
    padrao: condition.padrao || false,
    observacao: condition.observacao || '',
    createdAt: condition.createdAt || now,
    updatedAt: now,
    ...(savedCondition || {})
  };

  let updatedList = [...existingList];
  const idx = updatedList.findIndex(c => c.id === id);

  if (formatted.padrao) {
    updatedList = updatedList.map(c => ({ ...c, padrao: c.id === id }));
  }

  if (idx >= 0) {
    updatedList[idx] = formatted;
  } else {
    updatedList.unshift(formatted);
  }

  safeSetItem(STORAGE_KEY, JSON.stringify(updatedList));
  return savedCondition || formatted;
}

export async function deletePaymentCondition(id: string): Promise<void> {
  try {
    await deletePaymentConditionFromDb(id);
  } catch (err) {
    console.warn('Não foi possível excluir no backend, excluindo do cache local:', err);
  }

  const existingList = await loadPaymentConditions(false);
  const filtered = existingList.filter(c => c.id !== id);
  safeSetItem(STORAGE_KEY, JSON.stringify(filtered));
}
