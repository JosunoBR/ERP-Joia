import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Building2, 
  User, 
  Calendar, 
  CreditCard, 
  Percent, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Truck, 
  Hash, 
  Plus, 
  Edit3, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  Star,
  BookmarkCheck,
  PackageCheck,
  X,
  Search,
  Check,
  RotateCcw,
  ArrowRightLeft
} from 'lucide-react';
import { OrderHeader, Supplier, PaymentCondition, PurchaseOrder } from '../shared/types';
import { handleCurrencyInput, formatCurrency, maskPhone, maskDate, toBrDate, toIsoDate } from '../utils/masks';
import { LEGACY_DEFAULT_OBSERVACOES } from '../utils/storage';
import { PaymentConditionsModal } from './PaymentConditionsModal';
import { loadPaymentConditions } from '../utils/paymentConditionStorage';
import { 
  PARCELAS_OPTIONS, 
  PRAZO_OPTIONS, 
  SALDO_PRAZO_OPTIONS,
  DEPOSITO_PRAZO_OPTIONS,
  QUICK_PAYMENT_PRESETS,
  findMatchingPresetForParcelas,
  parsePaymentConditionString, 
  formatPaymentConditionString,
  addDaysToDate,
  getDaysDifference
} from '../utils/installments';

const FORMA_PAGAMENTO_OPTIONS = [
  { value: 'Boleto', label: '📄 Boleto' },
  { value: 'Depósito', label: '🏦 Depósito / PIX' },
  { value: 'Cheque', label: '📜 Cheque' },
  { value: 'Boleto / Depósito', label: '📄/🏦 Boleto / Depósito' },
  { value: 'Dinheiro', label: '💵 Dinheiro' }
];

const TIPO_FRETE_OPTIONS = [
  { value: 'CIF', label: '🚚 CIF (Por Conta do Fornecedor)' },
  { value: 'FOB', label: '🚛 FOB (Por Conta da Mega 12)' },
  { value: 'Retira', label: '🏬 Retira (Retirada no Fornecedor)' }
];

interface OrderHeaderFormProps {
  header: OrderHeader;
  suppliers: Supplier[];
  existingOrders?: PurchaseOrder[];
  onChange: (updatedHeader: OrderHeader) => void;
  onOpenSupplierModal: (supplierToEdit?: Supplier | null) => void;
  orderTotal?: number;
  onSaveAsSupplierTemplate?: () => void;
  onLoadSupplierTemplate?: (supplierId?: string) => void;
  hasSupplierTemplate?: boolean;
  supplierTemplateItemsCount?: number;
  showToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const OrderHeaderForm: React.FC<OrderHeaderFormProps> = ({ 
  header, 
  suppliers, 
  existingOrders = [],
  onChange,
  onOpenSupplierModal,
  orderTotal,
  onSaveAsSupplierTemplate,
  onLoadSupplierTemplate,
  hasSupplierTemplate = false,
  supplierTemplateItemsCount = 0,
  showToast
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [supplierFilterText, setSupplierFilterText] = useState('');
  const [syncFeedback, setSyncFeedback] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 🛡️ Validação em tempo real de unicidade do número do pedido
  const duplicateOrderConflict = useMemo(() => {
    if (!header.numeroPedido || !existingOrders || existingOrders.length === 0) return null;
    const currentNum = header.numeroPedido.trim().toUpperCase();
    if (!currentNum) return null;
    return existingOrders.find(o => 
      o.header.id !== header.id && 
      o.header.numeroPedido && 
      o.header.numeroPedido.trim().toUpperCase() === currentNum
    ) || null;
  }, [header.numeroPedido, header.id, existingOrders]);

  // Box de Condições de Pagamento
  const [isPaymentCondModalOpen, setIsPaymentCondModalOpen] = useState(false);
  const [availableConditions, setAvailableConditions] = useState<PaymentCondition[]>([]);

  const refreshPaymentConditions = async () => {
    try {
      const conds = await loadPaymentConditions(true);
      setAvailableConditions(conds);
    } catch (err) {
      console.error('Erro ao carregar condições de pagamento:', err);
    }
  };

  useEffect(() => {
    refreshPaymentConditions();
  }, []);

  const handleApplyPaymentCondition = (cond: PaymentCondition) => {
    const baseDate = header.dataEntregaPrevista || header.dataPedido || new Date().toISOString().split('T')[0];

    const customDates: Record<string, string> = {};
    if (cond.parcelasDias && cond.parcelasDias.length > 0) {
      cond.parcelasDias.forEach((dias, idx) => {
        const numParcela = idx + 1;
        customDates[String(numParcela)] = addDaysToDate(baseDate, dias);
      });
    }

    let formaPgto = header.formaPagamento || 'Boleto';
    if (cond.especie) {
      const espLower = cond.especie.toLowerCase();
      if (espLower.includes('depósito') || espLower.includes('deposito') || espLower.includes('pix')) {
        formaPgto = 'Depósito';
      } else if (espLower.includes('cheque')) {
        formaPgto = 'Cheque';
      } else if (espLower.includes('boleto')) {
        formaPgto = 'Boleto';
      }
    }

    let prazoStr = '30';
    if (cond.parcelasDias && cond.parcelasDias.length > 0) {
      if (cond.parcelasDias[0] === 0 && cond.parcelasDias.length === 1) {
        prazoStr = 'vista';
      } else if (cond.parcelasDias.length > 1 && cond.parcelasDias[0] === 0) {
        prazoStr = String(cond.parcelasDias[1]);
      } else {
        prazoStr = String(cond.parcelasDias[0]);
      }
    }

    onChange({
      ...header,
      condicaoPagamento: cond.descricao,
      parcelasCount: cond.qtdParcelas,
      prazoDias: prazoStr,
      formaPagamento: formaPgto,
      datasVencimentoPersonalizadas: Object.keys(customDates).length > 0 ? customDates : undefined
    });
  };

  // Identificar o fornecedor ativo no cadastro
  const currentSupplier = suppliers.find(s => 
    (header.supplierId && s.id === header.supplierId) || 
    s.razaoSocial.toLowerCase() === (header.fornecedor || '').toLowerCase() ||
    (s.nomeFantasia && s.nomeFantasia.toLowerCase() === (header.fornecedor || '').toLowerCase())
  );

  // Alíquota de ST e Percentual de Nota do cadastro do fornecedor ou do header
  const aliquotaStCadastrada = currentSupplier?.aliquotaStPadrao !== undefined 
    ? currentSupplier.aliquotaStPadrao 
    : (header.aliquotaSt ?? 0);

  const notaCadastrada = currentSupplier?.percentualNotaPadrao !== undefined
    ? currentSupplier.percentualNotaPadrao
    : (header.percentualNota ?? 100);

  // Sincronizar ST, OFF e NOTA do pedido se o fornecedor cadastrado tiver valores definidos e o header ainda não tiver
  useEffect(() => {
    if (!currentSupplier) return;

    let needsUpdate = false;
    const updatedHeader = { ...header };

    if (!header.supplierId || header.supplierId !== currentSupplier.id) {
      updatedHeader.supplierId = currentSupplier.id;
      needsUpdate = true;
    }

    if (header.aliquotaSt === undefined && currentSupplier.aliquotaStPadrao !== undefined) {
      updatedHeader.aliquotaSt = currentSupplier.aliquotaStPadrao;
      needsUpdate = true;
    }

    if (header.percentualNota === undefined && currentSupplier.percentualNotaPadrao !== undefined) {
      updatedHeader.percentualNota = currentSupplier.percentualNotaPadrao;
      needsUpdate = true;
    }

    if (needsUpdate) {
      onChange(updatedHeader);
    }
  }, [currentSupplier, header.fornecedor]);

  // Limpar texto padrão legado caso o rascunho salvo ainda contenha texto fixo antigo
  useEffect(() => {
    if (header.observacoesDescarga && LEGACY_DEFAULT_OBSERVACOES.includes(header.observacoesDescarga.trim())) {
      handleFieldChange('observacoesDescarga', '');
    }
  }, [header.observacoesDescarga]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFieldChange = (field: keyof OrderHeader, value: any) => {
    if (field === 'tipoFrete') {
      const isCif = String(value || 'CIF').toUpperCase().includes('CIF');
      onChange({
        ...header,
        tipoFrete: value,
        ...(isCif ? { valorFrete: 0, valorFreteGlobal: 0 } : {})
      });
      return;
    }
    if (field === 'valorFrete') {
      const numVal = typeof value === 'number' ? value : (parseFloat(String(value).replace(',', '.')) || 0);
      const isCif = String(header.tipoFrete || 'CIF').toUpperCase().includes('CIF');
      const newTipoFrete = (numVal > 0 && isCif) ? 'FOB' : (header.tipoFrete || 'CIF');
      onChange({
        ...header,
        tipoFrete: newTipoFrete,
        valorFrete: numVal,
        valorFreteGlobal: numVal
      });
      return;
    }
    if (field === 'percentualDescontoOff') {
      const pct = Math.max(0, Math.min(100, parseFloat(value) || 0));
      const descVal = valorBaseMercadoria > 0 ? Number(((valorBaseMercadoria * pct) / 100).toFixed(2)) : 0;
      onChange({
        ...header,
        percentualDescontoOff: pct,
        descontoComercialTotal: descVal,
        descontoComercialTipo: '%'
      });
      return;
    }
    if (field === 'descontoComercialTotal') {
      const valR$ = Math.max(0, parseFloat(value) || 0);
      const pct = valorBaseMercadoria > 0 ? Number(((valR$ / valorBaseMercadoria) * 100).toFixed(2)) : 0;
      onChange({
        ...header,
        descontoComercialTotal: valR$,
        percentualDescontoOff: pct,
        descontoComercialTipo: 'R$'
      });
      return;
    }
    if (field === 'percentualNota') {
      const pctVal = parseFloat(value) || 0;
      if (isEntradaMista && pctVal > 0 && pctVal <= 100) {
        const isCurrentlyInverted = header.percentualEntrada !== undefined && header.percentualEntrada === (header.percentualNota || 0);
        const newPctDeposito = isCurrentlyInverted ? pctVal : Math.max(0, 100 - pctVal);
        const newValorEntrada = valorBaseMercadoria > 0 ? Number((valorBaseMercadoria * (newPctDeposito / 100)).toFixed(2)) : 0;
        const newCondString = formatPaymentConditionString(
          depositoParcelas + saldoParcelas,
          'deposito_e_boleto',
          newValorEntrada,
          saldoParcelas,
          saldoPrazo,
          depositoParcelas,
          depositoPrazo,
          header.depositoFormaPagamento || 'Depósito',
          header.saldoFormaPagamento || 'Boleto'
        );
        onChange({
          ...header,
          prazoDias: 'deposito_e_boleto',
          percentualNota: pctVal,
          percentualEntrada: newPctDeposito,
          isEntradaProporcional: true,
          valorEntradaAVista: newValorEntrada,
          condicaoPagamento: newCondString,
          datasVencimentoPersonalizadas: undefined
        });
        return;
      }
    }
    if (field === 'depositoFormaPagamento' || field === 'saldoFormaPagamento') {
      const newDepForma = field === 'depositoFormaPagamento' ? value : (header.depositoFormaPagamento || 'Depósito');
      const newSalForma = field === 'saldoFormaPagamento' ? value : (header.saldoFormaPagamento || 'Boleto');
      const newFormaGeral = `${newSalForma} / ${newDepForma}`;
      const newCondString = formatPaymentConditionString(
        depositoParcelas + saldoParcelas,
        'deposito_e_boleto',
        valorEntrada,
        saldoParcelas,
        saldoPrazo,
        depositoParcelas,
        depositoPrazo,
        newDepForma,
        newSalForma
      );
      onChange({
        ...header,
        [field]: value,
        formaPagamento: newFormaGeral,
        prazoDias: 'deposito_e_boleto',
        condicaoPagamento: newCondString
      });
      return;
    }
    if (field === 'dataEntregaPrevista' || field === 'dataPedido') {
      onChange({
        ...header,
        [field]: value,
        datasVencimentoPersonalizadas: undefined
      });
      return;
    }

    if (field === 'formaPagamento' && (value === 'Boleto / Depósito' || value === 'Boleto / Cheque')) {
      const pctBoleto = (header.percentualNota !== undefined && header.percentualNota > 0 && header.percentualNota < 100)
        ? header.percentualNota
        : 70;
      const pctDeposito = Math.max(0, 100 - pctBoleto);
      const initEntrada = valorBaseMercadoria > 0 ? Number((valorBaseMercadoria * (pctDeposito / 100)).toFixed(2)) : 0;
      const initDepParc = header.depositoParcelasCount || 2;
      const initDepPrazo = header.depositoPrazoDias || '30';
      const initSaldoParc = header.saldoParcelasCount || 2;
      const initSaldoPrazo = header.saldoPrazoDias || '30';
      const newCondString = formatPaymentConditionString(
        initDepParc + initSaldoParc, 
        'deposito_e_boleto', 
        initEntrada, 
        initSaldoParc, 
        initSaldoPrazo, 
        initDepParc, 
        initDepPrazo,
        header.depositoFormaPagamento || 'Depósito',
        header.saldoFormaPagamento || 'Boleto'
      );
      onChange({
        ...header,
        formaPagamento: value,
        prazoDias: 'deposito_e_boleto',
        percentualEntrada: pctDeposito,
        isEntradaProporcional: true,
        valorEntradaAVista: initEntrada,
        depositoParcelasCount: initDepParc,
        depositoPrazoDias: initDepPrazo,
        saldoParcelasCount: initSaldoParc,
        saldoPrazoDias: initSaldoPrazo,
        condicaoPagamento: newCondString,
        datasVencimentoPersonalizadas: undefined
      });
      return;
    }

    if (field === 'formaPagamento' && (value === 'Boleto' || value === 'Depósito' || value === 'Cheque')) {
      const fallbackPrazo = (currentPrazo === 'deposito_e_boleto' || currentPrazo === 'entrada_com_parcelamento') ? '30' : currentPrazo;
      const fallbackParc = currentParcelas > 0 ? currentParcelas : 3;
      const newCondString = formatPaymentConditionString(fallbackParc, fallbackPrazo);
      onChange({
        ...header,
        formaPagamento: value,
        prazoDias: fallbackPrazo,
        condicaoPagamento: newCondString,
        datasVencimentoPersonalizadas: undefined
      });
      return;
    }

    onChange({
      ...header,
      [field]: value
    });
  };

  // Garante que o campo dataPedido esteja sempre preenchido com a data atual caso esteja em branco
  useEffect(() => {
    if (!header.dataPedido || header.dataPedido.trim() === '') {
      const today = new Date().toISOString().split('T')[0];
      onChange({
        ...header,
        dataPedido: today,
        dataEmissao: header.dataEmissao || today
      });
    }
  }, [header.dataPedido]);

  // Condição de Pagamento estruturada (Dropdown Duplo & Entrada Mista)
  const parsedPayment = parsePaymentConditionString(header.condicaoPagamento);
  const currentParcelas = (header.parcelasCount && (header.condicaoPagamento?.includes('/') || header.condicaoPagamento?.toLowerCase().includes('x')) && parsedPayment.parcelas > 1 && header.parcelasCount === 1)
    ? parsedPayment.parcelas
    : (header.parcelasCount ?? parsedPayment.parcelas);

  const isDepositoEBoleto = header.prazoDias === 'deposito_e_boleto' || 
    header.formaPagamento === 'Boleto / Depósito' || 
    header.formaPagamento === 'Boleto / Cheque' ||
    (header.depositoParcelasCount !== undefined && header.saldoParcelasCount !== undefined && (header.depositoParcelasCount > 0 || header.saldoParcelasCount > 0)) ||
    Boolean(header.condicaoPagamento && (header.condicaoPagamento.toLowerCase().includes('depósito') || header.condicaoPagamento.toLowerCase().includes('deposito')) && (header.condicaoPagamento.toLowerCase().includes('boleto') || header.condicaoPagamento.toLowerCase().includes('saldo') || header.condicaoPagamento.toLowerCase().includes('cheque')));

  const isEntradaMista = header.prazoDias === 'entrada_com_parcelamento' || isDepositoEBoleto;

  const currentPrazo = isDepositoEBoleto 
    ? 'deposito_e_boleto' 
    : (header.prazoDias === 'entrada_com_parcelamento' ? 'entrada_com_parcelamento' : String(header.prazoDias ?? parsedPayment.prazo));
  const isVistaIntegral = currentPrazo === 'vista';

  const valorTotalPedido = orderTotal || 0;
  const valorFreteNum = Number(header.valorFrete ?? header.valorFreteGlobal) || 0;
  const valorBaseMercadoria = Math.max(0, valorTotalPedido - valorFreteNum);

  const hasCustomOff = header.percentualNota !== undefined && header.percentualNota > 0 && header.percentualNota < 100;
  const pctBoletoFromOff = hasCustomOff ? header.percentualNota! : (isDepositoEBoleto ? 70 : 70);
  const pctDepositoFromOff = Math.max(0, 100 - pctBoletoFromOff);

  const isProporcional = header.isEntradaProporcional !== false;
  const targetPctDeposito = header.percentualEntrada !== undefined
    ? header.percentualEntrada
    : pctDepositoFromOff;

  const valorEntrada = valorBaseMercadoria > 0
    ? (isProporcional
        ? Number((valorBaseMercadoria * (targetPctDeposito / 100)).toFixed(2))
        : Math.min(valorBaseMercadoria, Math.max(0, header.valorEntradaAVista || 0)))
    : 0;

  const depositoParcelas = Math.max(1, header.depositoParcelasCount || (currentPrazo === 'deposito_e_boleto' ? 2 : 1));
  const depositoPrazo = String(header.depositoPrazoDias || (currentPrazo === 'entrada_com_parcelamento' ? 'vista' : '30'));
  const valorPorParcelaDeposito = depositoParcelas > 0 ? (valorEntrada / depositoParcelas) : 0;

  const saldoParcelas = Math.max(1, header.saldoParcelasCount || 2);
  const saldoPrazo = String(header.saldoPrazoDias || '30');

  const baseReferenciaTotal = valorBaseMercadoria > 0 ? valorBaseMercadoria : 0;
  const saldoRestante = Math.max(0, baseReferenciaTotal - valorEntrada);
  const valorPorParcelaSaldo = (saldoParcelas > 0 && saldoRestante > 0) ? (saldoRestante / saldoParcelas) : 0;
  const baseReferenciaPercentual = valorBaseMercadoria > 0 ? valorBaseMercadoria : 0;

  // Sanitiza valorEntradaAVista se o pedido estiver com total de mercadorias zerado
  useEffect(() => {
    if (valorBaseMercadoria === 0 && header.valorEntradaAVista !== undefined && header.valorEntradaAVista > 0) {
      onChange({
        ...header,
        valorEntradaAVista: 0
      });
    }
  }, [valorBaseMercadoria, header.valorEntradaAVista]);

  // Se for pagamento combinado (Depósito + Boleto) e a condicaoPagamento estiver inconsistente/corrompida
  useEffect(() => {
    if (isDepositoEBoleto) {
      const isCorrupted = !header.condicaoPagamento || 
        !header.condicaoPagamento.includes('+') || 
        header.prazoDias !== 'deposito_e_boleto';
      if (isCorrupted) {
        const correctCond = formatPaymentConditionString(
          depositoParcelas + saldoParcelas,
          'deposito_e_boleto',
          valorEntrada,
          saldoParcelas,
          saldoPrazo,
          depositoParcelas,
          depositoPrazo,
          header.depositoFormaPagamento || 'Depósito',
          header.saldoFormaPagamento || 'Boleto'
        );
        if (header.condicaoPagamento !== correctCond || header.prazoDias !== 'deposito_e_boleto') {
          onChange({
            ...header,
            prazoDias: 'deposito_e_boleto',
            condicaoPagamento: correctCond
          });
        }
      }
    }
  }, [isDepositoEBoleto, header.condicaoPagamento, header.prazoDias, depositoParcelas, saldoParcelas, depositoPrazo, saldoPrazo, valorEntrada]);

  const handlePaymentParcelasChange = (newParcelas: number) => {
    const rawBase = header.dataEntregaPrevista || header.dataPedido || new Date().toISOString().split('T')[0];
    const baseDate = addDaysToDate(rawBase, 0);

    if (isEntradaMista) {
      const newCondString = formatPaymentConditionString(
        newParcelas, 
        'deposito_e_boleto', 
        valorEntrada, 
        saldoParcelas, 
        saldoPrazo, 
        depositoParcelas, 
        depositoPrazo,
        header.depositoFormaPagamento || 'Depósito',
        header.saldoFormaPagamento || 'Boleto'
      );
      onChange({
        ...header,
        prazoDias: 'deposito_e_boleto',
        parcelasCount: newParcelas,
        condicaoPagamento: newCondString,
        datasVencimentoPersonalizadas: undefined
      });
      return;
    }

    if (newParcelas <= 1) {
      if (currentPrazo === 'vista') {
        onChange({
          ...header,
          parcelasCount: 1,
          prazoDias: 'vista',
          condicaoPagamento: '100% À Vista (TED/PIX)',
          datasVencimentoPersonalizadas: { '1': baseDate }
        });
      } else {
        onChange({
          ...header,
          parcelasCount: 1,
          prazoDias: '30',
          condicaoPagamento: '30 Dias',
          datasVencimentoPersonalizadas: { '1': addDaysToDate(baseDate, 30) }
        });
      }
      return;
    }

    // Identificar a cadência e o início atual
    let detectedStep = 30;
    let detectedStart = 30;
    const condLower = (header.condicaoPagamento || '').toLowerCase();
    const currentPreset = QUICK_PAYMENT_PRESETS.find(
      (p) => p.conditionString.toLowerCase() === condLower || p.id === currentPrazo
    );

    if (currentPreset && currentPreset.daysOffsets && currentPreset.daysOffsets.length > 0) {
      detectedStart = currentPreset.daysOffsets[0];
      if (currentPreset.daysOffsets.length > 1) {
        detectedStep = currentPreset.daysOffsets[1] - currentPreset.daysOffsets[0];
      } else {
        detectedStep = currentPreset.daysOffsets[0];
      }
    } else if (condLower.startsWith('45') || condLower.includes('/45') || condLower.includes('45 a')) {
      detectedStart = 45;
      detectedStep = (condLower.includes('55') || condLower.includes('10d') || condLower.includes('10/10')) ? 10 : 15;
    } else if (condLower.includes('10/10') || condLower.includes('10d') || currentPrazo === '10') {
      detectedStart = 30;
      detectedStep = 10;
    } else if (condLower.includes('15/15') || condLower.includes('15d') || currentPrazo === '15') {
      detectedStart = 30;
      detectedStep = 15;
    } else if (condLower.includes('7/14') || condLower.includes('semanal') || currentPrazo === '7') {
      detectedStart = 7;
      detectedStep = 7;
    } else if (currentPrazo === '28') {
      detectedStart = 28;
      detectedStep = 7;
    } else if (currentPrazo === '21') {
      detectedStart = 21;
      detectedStep = 7;
    } else {
      detectedStart = 30;
      detectedStep = 30;
    }

    // Calcula os offsets para o número selecionado de parcelas
    let offsets: number[] = [];
    for (let i = 0; i < newParcelas; i++) {
      offsets.push(detectedStart + i * detectedStep);
    }

    // Verifica se os novos offsets batem perfeitamente com um preset pré-existente
    const matchingPreset = findMatchingPresetForParcelas(newParcelas, currentPrazo);
    const newPrazoId = matchingPreset ? matchingPreset.id : String(detectedStep);

    const newCondString = matchingPreset 
      ? matchingPreset.conditionString 
      : `${offsets.join('/')} Dias`;

    const newCustomDates: Record<string, string> = {};
    const finalOffsets = (matchingPreset && matchingPreset.daysOffsets) ? matchingPreset.daysOffsets : offsets;
    finalOffsets.forEach((days, idx) => {
      newCustomDates[String(idx + 1)] = addDaysToDate(baseDate, days);
    });

    onChange({
      ...header,
      parcelasCount: newParcelas,
      prazoDias: newPrazoId,
      condicaoPagamento: newCondString,
      datasVencimentoPersonalizadas: newCustomDates
    });
  };

  const handlePaymentPrazoChange = (newPrazo: string) => {
    if (newPrazo === 'deposito_e_boleto') {
      const pctBoleto = (header.percentualNota !== undefined && header.percentualNota > 0 && header.percentualNota < 100)
        ? header.percentualNota
        : 70;
      const pctDeposito = Math.max(0, 100 - pctBoleto);
      const initEntrada = valorBaseMercadoria > 0 ? Number((valorBaseMercadoria * (pctDeposito / 100)).toFixed(2)) : 0;
      const initDepParc = header.depositoParcelasCount || 2;
      const initDepPrazo = header.depositoPrazoDias || '30';
      const initSaldoParc = header.saldoParcelasCount || 2;
      const initSaldoPrazo = header.saldoPrazoDias || '30';
      const newCondString = formatPaymentConditionString(
        currentParcelas, 
        newPrazo, 
        initEntrada, 
        initSaldoParc, 
        initSaldoPrazo, 
        initDepParc, 
        initDepPrazo
      );
      onChange({
        ...header,
        formaPagamento: 'Boleto / Depósito',
        prazoDias: newPrazo,
        percentualEntrada: pctDeposito,
        isEntradaProporcional: true,
        valorEntradaAVista: initEntrada,
        depositoParcelasCount: initDepParc,
        depositoPrazoDias: initDepPrazo,
        saldoParcelasCount: initSaldoParc,
        saldoPrazoDias: initSaldoPrazo,
        condicaoPagamento: newCondString,
        datasVencimentoPersonalizadas: undefined
      });
      return;
    } 
    
    if (newPrazo === 'entrada_com_parcelamento') {
      const pctBoleto = (header.percentualNota !== undefined && header.percentualNota > 0 && header.percentualNota < 100)
        ? header.percentualNota
        : 70;
      const pctDeposito = Math.max(0, 100 - pctBoleto);
      const initEntrada = valorBaseMercadoria > 0 ? Number((valorBaseMercadoria * (pctDeposito / 100)).toFixed(2)) : 0;
      const initDepParc = 1;
      const initDepPrazo = 'vista';
      const initSaldoParc = header.saldoParcelasCount || 2;
      const initSaldoPrazo = header.saldoPrazoDias || '30';
      const newCondString = formatPaymentConditionString(
        currentParcelas, 
        newPrazo, 
        initEntrada, 
        initSaldoParc, 
        initSaldoPrazo, 
        initDepParc, 
        initDepPrazo
      );
      onChange({
        ...header,
        prazoDias: newPrazo,
        percentualEntrada: pctDeposito,
        isEntradaProporcional: true,
        valorEntradaAVista: initEntrada,
        depositoParcelasCount: initDepParc,
        depositoPrazoDias: initDepPrazo,
        saldoParcelasCount: initSaldoParc,
        saldoPrazoDias: initSaldoPrazo,
        condicaoPagamento: newCondString,
        datasVencimentoPersonalizadas: undefined
      });
      return;
    }

    if (newPrazo === '' || newPrazo === '0' || newPrazo.toLowerCase() === 'vista') {
      const newCondString = formatPaymentConditionString(1, 'vista');
      onChange({
        ...header,
        prazoDias: 'vista',
        condicaoPagamento: newCondString,
        datasVencimentoPersonalizadas: undefined
      });
      return;
    }

    if (newPrazo.includes('/')) {
      const parsed = parsePaymentConditionString(newPrazo);
      onChange({
        ...header,
        prazoDias: parsed.prazo,
        parcelasCount: parsed.parcelas,
        condicaoPagamento: newPrazo,
        datasVencimentoPersonalizadas: undefined
      });
      return;
    }

    const cleanNum = newPrazo.replace(/\D/g, '');
    const numDias = parseInt(cleanNum, 10);
    if (!isNaN(numDias) && numDias > 0) {
      const newCondString = formatPaymentConditionString(currentParcelas, numDias);
      onChange({
        ...header,
        prazoDias: String(numDias),
        condicaoPagamento: newCondString,
        datasVencimentoPersonalizadas: undefined
      });
    } else {
      onChange({
        ...header,
        prazoDias: cleanNum,
        datasVencimentoPersonalizadas: undefined
      });
    }
  };

  const handleEntradaChange = (val: number) => {
    const valFinal = valorBaseMercadoria > 0 ? Math.max(0, Math.min(valorBaseMercadoria, val)) : Math.max(0, val);
    const newCondString = formatPaymentConditionString(
      depositoParcelas + saldoParcelas, 
      'deposito_e_boleto', 
      valFinal, 
      saldoParcelas, 
      saldoPrazo, 
      depositoParcelas, 
      depositoPrazo,
      header.depositoFormaPagamento || 'Depósito',
      header.saldoFormaPagamento || 'Boleto'
    );
    onChange({
      ...header,
      prazoDias: 'deposito_e_boleto',
      valorEntradaAVista: valFinal,
      isEntradaProporcional: false,
      percentualEntrada: undefined,
      condicaoPagamento: newCondString
    });
  };

  const recalculateCombinedDates = (
    depParc: number,
    depPrazo: string,
    salParc: number,
    salPrazo: string
  ) => {
    const rawBase = header.dataEntregaPrevista || header.dataPedido || new Date().toISOString().split('T')[0];
    const baseDate = addDaysToDate(rawBase, 0);
    const rawOrderDate = header.dataPedido || new Date().toISOString().split('T')[0];
    const orderDate = addDaysToDate(rawOrderDate, 0);

    const newDates: Record<string, string> = {};

    // 1. Parcelas de Depósito / Entrada
    const matchedDepPreset = QUICK_PAYMENT_PRESETS.find(p => p.id === depPrazo || p.conditionString.toLowerCase() === depPrazo.toLowerCase());
    for (let d = 1; d <= depParc; d++) {
      if (depPrazo === 'vista') {
        newDates[String(d)] = addDaysToDate(orderDate, 0);
      } else if (matchedDepPreset && matchedDepPreset.daysOffsets && matchedDepPreset.daysOffsets[d - 1] !== undefined) {
        newDates[String(d)] = addDaysToDate(baseDate, matchedDepPreset.daysOffsets[d - 1]);
      } else {
        const interval = Number(depPrazo) || 30;
        newDates[String(d)] = addDaysToDate(baseDate, 10 + (d - 1) * interval);
      }
    }

    // 2. Parcelas do Saldo em Boleto
    const matchedSalPreset = QUICK_PAYMENT_PRESETS.find(p => p.id === salPrazo || p.conditionString.toLowerCase() === salPrazo.toLowerCase());
    for (let b = 1; b <= salParc; b++) {
      const numParcela = depParc + b;
      if (matchedSalPreset && matchedSalPreset.daysOffsets && matchedSalPreset.daysOffsets[b - 1] !== undefined) {
        newDates[String(numParcela)] = addDaysToDate(baseDate, matchedSalPreset.daysOffsets[b - 1]);
      } else {
        const interval = Number(salPrazo) || 30;
        if (depParc === 1 && depPrazo === 'vista') {
          newDates[String(numParcela)] = addDaysToDate(baseDate, 10 + (b - 1) * interval);
        } else if (depPrazo !== 'vista') {
          const lastDepDueDays = (matchedDepPreset && matchedDepPreset.daysOffsets && matchedDepPreset.daysOffsets.length > 0)
            ? matchedDepPreset.daysOffsets[matchedDepPreset.daysOffsets.length - 1]
            : (10 + (depParc - 1) * (Number(depPrazo) || 30));
          newDates[String(numParcela)] = addDaysToDate(baseDate, lastDepDueDays + b * interval);
        } else {
          newDates[String(numParcela)] = addDaysToDate(baseDate, 10 + (b - 1) * interval);
        }
      }
    }

    return newDates;
  };

  const handleDepositoParcelasChange = (newDepParc: number) => {
    let newPrazo = depositoPrazo;
    const matchingPreset = findMatchingPresetForParcelas(newDepParc, depositoPrazo);
    if (matchingPreset) {
      newPrazo = matchingPreset.id;
    } else if (depositoPrazo === 'vista' && newDepParc > 1) {
      newPrazo = '30';
    }

    const newDates = recalculateCombinedDates(newDepParc, newPrazo, saldoParcelas, saldoPrazo);
    const newCondString = formatPaymentConditionString(
      newDepParc + saldoParcelas, 
      'deposito_e_boleto', 
      valorEntrada, 
      saldoParcelas, 
      saldoPrazo, 
      newDepParc, 
      newPrazo,
      header.depositoFormaPagamento || 'Depósito',
      header.saldoFormaPagamento || 'Boleto'
    );
    onChange({
      ...header,
      prazoDias: 'deposito_e_boleto',
      depositoParcelasCount: newDepParc,
      depositoPrazoDias: newPrazo,
      parcelasCount: newDepParc + saldoParcelas,
      condicaoPagamento: newCondString,
      datasVencimentoPersonalizadas: newDates
    });
  };

  const handleDepositoPrazoChange = (newDepPrazo: string) => {
    let newParc = depositoParcelas;
    const preset = QUICK_PAYMENT_PRESETS.find(p => p.id === newDepPrazo || p.conditionString.toLowerCase() === newDepPrazo.toLowerCase());
    if (preset) {
      newParc = preset.parcelas;
    } else if (newDepPrazo === 'vista') {
      newParc = 1;
    } else {
      const matching = findMatchingPresetForParcelas(newParc, newDepPrazo);
      if (matching) {
        newDepPrazo = matching.id;
        newParc = matching.parcelas;
      }
    }

    const newDates = recalculateCombinedDates(newParc, newDepPrazo, saldoParcelas, saldoPrazo);
    const newCondString = formatPaymentConditionString(
      newParc + saldoParcelas, 
      'deposito_e_boleto', 
      valorEntrada, 
      saldoParcelas, 
      saldoPrazo, 
      newParc, 
      newDepPrazo,
      header.depositoFormaPagamento || 'Depósito',
      header.saldoFormaPagamento || 'Boleto'
    );
    onChange({
      ...header,
      prazoDias: 'deposito_e_boleto',
      depositoParcelasCount: newParc,
      depositoPrazoDias: newDepPrazo,
      parcelasCount: newParc + saldoParcelas,
      condicaoPagamento: newCondString,
      datasVencimentoPersonalizadas: newDates
    });
  };

  const handleSaldoParcelasChange = (newSaldoParc: number) => {
    let newPrazo = saldoPrazo;
    const matchingPreset = findMatchingPresetForParcelas(newSaldoParc, saldoPrazo);
    if (matchingPreset) {
      newPrazo = matchingPreset.id;
    } else if (saldoPrazo === 'vista' && newSaldoParc > 1) {
      newPrazo = '30';
    }

    const newDates = recalculateCombinedDates(depositoParcelas, depositoPrazo, newSaldoParc, newPrazo);
    const newCondString = formatPaymentConditionString(
      depositoParcelas + newSaldoParc, 
      'deposito_e_boleto', 
      valorEntrada, 
      newSaldoParc, 
      newPrazo, 
      depositoParcelas, 
      depositoPrazo,
      header.depositoFormaPagamento || 'Depósito',
      header.saldoFormaPagamento || 'Boleto'
    );
    onChange({
      ...header,
      prazoDias: 'deposito_e_boleto',
      saldoParcelasCount: newSaldoParc,
      saldoPrazoDias: newPrazo,
      parcelasCount: depositoParcelas + newSaldoParc,
      condicaoPagamento: newCondString,
      datasVencimentoPersonalizadas: newDates
    });
  };

  const handleSaldoPrazoChange = (newSaldoPrazo: string) => {
    let newParc = saldoParcelas;
    const preset = QUICK_PAYMENT_PRESETS.find(p => p.id === newSaldoPrazo || p.conditionString.toLowerCase() === newSaldoPrazo.toLowerCase());
    if (preset) {
      newParc = preset.parcelas;
    } else if (newSaldoPrazo === 'vista') {
      newParc = 1;
    } else {
      const matching = findMatchingPresetForParcelas(newParc, newSaldoPrazo);
      if (matching) {
        newSaldoPrazo = matching.id;
        newParc = matching.parcelas;
      }
    }

    const newDates = recalculateCombinedDates(depositoParcelas, depositoPrazo, newParc, newSaldoPrazo);
    const newCondString = formatPaymentConditionString(
      depositoParcelas + newParc, 
      'deposito_e_boleto', 
      valorEntrada, 
      newParc, 
      newSaldoPrazo, 
      depositoParcelas, 
      depositoPrazo,
      header.depositoFormaPagamento || 'Depósito',
      header.saldoFormaPagamento || 'Boleto'
    );
    onChange({
      ...header,
      prazoDias: 'deposito_e_boleto',
      saldoParcelasCount: newParc,
      saldoPrazoDias: newSaldoPrazo,
      parcelasCount: depositoParcelas + newParc,
      condicaoPagamento: newCondString,
      datasVencimentoPersonalizadas: newDates
    });
  };

  const renderPeriodoOptions = (selectedVal: string, allowSpecialDivided: boolean = true) => (
    <>
      <optgroup label="⚡ Semanal & Ciclos de 7 em 7 Dias">
        <option value="preset:7_28">7/14/21/28 (4x)</option>
        <option value="preset:14_56">14/21/28/35/42/49/56 (7x)</option>
        <option value="preset:28_42">28/35/42 (3x)</option>
        <option value="preset:28_56">28/35/42/49/56 (5x)</option>
      </optgroup>

      <optgroup label="⚡ Modelos de 30 em 30 / Clássicos">
        <option value="preset:30_30">30 Dias (1x)</option>
        <option value="preset:30_60">30/60 (2x)</option>
        <option value="preset:30_90">30/90 (2x)</option>
        <option value="preset:30_60_90">30/60/90 (3x)</option>
        <option value="preset:30_120">30/60/90/120 (4x)</option>
        <option value="preset:30_150">30/60/90/120/150 (5x)</option>
      </optgroup>

      <optgroup label="⚡ Modelos de 15 em 15 Dias (Iniciando em 30)">
        <option value="preset:30_60_15d">30/45/60 (3x)</option>
        <option value="preset:15_90">30/45/60/75/90 (5x)</option>
        <option value="preset:15_120">30/45/60/75/90/105/120 (7x)</option>
        <option value="preset:15_150">30/45/60/75/90/105/120/135/150 (9x)</option>
      </optgroup>

      <optgroup label="⚡ Modelos de 10 em 10 Dias (Iniciando em 30)">
        <option value="preset:10_60">30/40/50/60 (4x)</option>
        <option value="preset:10_90">30/40/50/60/70/80/90 (7x)</option>
        <option value="preset:10_120">30/40/50/60/70/80/90/100/110/120 (10x)</option>
        <option value="preset:10_150">30/40/50/60/70/80/90/100/110/120/130/140/150 (13x)</option>
      </optgroup>

      <optgroup label="⚡ Modelos de 15 em 15 Dias (Iniciando em 45)">
        <option value="preset:45_90">45/60/75/90 (4x)</option>
        <option value="preset:45_120">45/60/75/90/105/120 (6x)</option>
        <option value="preset:45_150">45/60/75/90/105/120/135/150 (8x)</option>
      </optgroup>

      <optgroup label="⚡ Modelos de 10 em 10 Dias (Iniciando em 45)">
        <option value="preset:45_115">45/55/65/75/85/95/105/115 (8x)</option>
        <option value="preset:45_155">45/55/65/75/85/95/105/115/125/135/145/155 (12x)</option>
      </optgroup>

      <optgroup label="📅 Intervalos Regulares Fixos">
        <option value="30">A cada 30 dias (30/60/90...)</option>
        <option value="28">A cada 28 dias (28/56/84...)</option>
        <option value="21">A cada 21 dias (21/42/63...)</option>
        <option value="15">A cada 15 dias (15/30/45...)</option>
        <option value="10">A cada 10 dias (10/20/30...)</option>
        <option value="7">A cada 7 dias (7/14/21...)</option>
      </optgroup>

      <optgroup label="💵 Modalidades">
        <option value="vista">100% À Vista Integral (TED / PIX)</option>
        {allowSpecialDivided && (
          <>
            <option value="deposito_e_boleto">🏦 Depósito Parcelado + 📄 Boleto Parcelado</option>
            <option value="entrada_com_parcelamento">Entrada À Vista + Saldo Parcelado</option>
          </>
        )}
      </optgroup>

      {!['30', '28', '21', '15', '10', '7', 'vista', 'deposito_e_boleto', 'entrada_com_parcelamento'].includes(selectedVal) &&
       !selectedVal.startsWith('preset:') && selectedVal !== '' && (
        <option value={selectedVal}>
          A cada {selectedVal} dias
        </option>
      )}
    </>
  );

  const getDepositoPeriodoDropdownValue = () => {
    if (depositoPrazo === 'vista' || depositoPrazo === '0') return 'vista';
    const cleanPrazo = depositoPrazo.trim().toLowerCase().replace(/\s*dias$/i, '');
    let matched = QUICK_PAYMENT_PRESETS.find(
      (p) => p.id === depositoPrazo || p.conditionString.trim().toLowerCase().replace(/\s*dias$/i, '') === cleanPrazo
    );
    if (!matched) {
      matched = findMatchingPresetForParcelas(depositoParcelas, depositoPrazo);
    }
    if (matched) return `preset:${matched.id}`;
    if (['30', '28', '21', '15', '10', '7'].includes(depositoPrazo)) return depositoPrazo;
    return depositoPrazo || 'vista';
  };

  const handleDepositoPeriodoSelect = (selectedVal: string) => {
    if (!selectedVal) return;
    if (selectedVal.startsWith('preset:')) {
      const presetId = selectedVal.replace('preset:', '');
      handleDepositoPrazoChange(presetId);
      return;
    }
    handleDepositoPrazoChange(selectedVal);
  };

  const getSaldoPeriodoDropdownValue = () => {
    if (saldoPrazo === 'vista' || saldoPrazo === '0') return 'vista';
    const cleanPrazo = saldoPrazo.trim().toLowerCase().replace(/\s*dias$/i, '');
    let matched = QUICK_PAYMENT_PRESETS.find(
      (p) => p.id === saldoPrazo || p.conditionString.trim().toLowerCase().replace(/\s*dias$/i, '') === cleanPrazo
    );
    if (!matched) {
      matched = findMatchingPresetForParcelas(saldoParcelas, saldoPrazo);
    }
    if (matched) return `preset:${matched.id}`;
    if (['30', '28', '21', '15', '10', '7'].includes(saldoPrazo)) return saldoPrazo;
    return saldoPrazo || '30';
  };

  const handleSaldoPeriodoSelect = (selectedVal: string) => {
    if (!selectedVal) return;
    if (selectedVal.startsWith('preset:')) {
      const presetId = selectedVal.replace('preset:', '');
      handleSaldoPrazoChange(presetId);
      return;
    }
    handleSaldoPrazoChange(selectedVal);
  };

  const getPeriodoDropdownValue = () => {
    if (isEntradaMista) return currentPrazo;
    if (isVistaIntegral) return 'vista';

    // 1. Procura se a condição de pagamento atual bate com algum dos modelos pré-definidos
    if (header.condicaoPagamento) {
      const cleanHeaderCond = header.condicaoPagamento.trim().toLowerCase().replace(/\s*dias$/i, '');
      const matchedPreset = QUICK_PAYMENT_PRESETS.find((p) => {
        const cleanPresetCond = p.conditionString.trim().toLowerCase().replace(/\s*dias$/i, '');
        return cleanPresetCond === cleanHeaderCond || p.id === header.condicaoPagamento;
      });
      if (matchedPreset) return `preset:${matchedPreset.id}`;
    }

    // 2. Procura pelo ID do preset salvo no prazo
    const matchedPresetById = QUICK_PAYMENT_PRESETS.find((p) => p.id === currentPrazo);
    if (matchedPresetById) return `preset:${matchedPresetById.id}`;

    // 3. Procura por correspondência da quantidade de parcelas e cadência
    const matchedByParc = findMatchingPresetForParcelas(currentParcelas, currentPrazo);
    if (matchedByParc) return `preset:${matchedByParc.id}`;

    // 4. Intervalos clássicos numéricos
    if (['30', '28', '21', '15', '10', '7'].includes(currentPrazo)) {
      return currentPrazo;
    }

    return currentPrazo || '30';
  };

  const handlePeriodoSelect = (selectedVal: string) => {
    if (!selectedVal) return;

    if (selectedVal.startsWith('preset:')) {
      const presetId = selectedVal.replace('preset:', '');
      const preset = QUICK_PAYMENT_PRESETS.find((p) => p.id === presetId);
      if (preset) {
        const baseDate = header.dataEntregaPrevista || header.dataPedido || new Date().toISOString().split('T')[0];
        const customDates: Record<string, string> = {};
        if (preset.daysOffsets) {
          preset.daysOffsets.forEach((days, idx) => {
            customDates[String(idx + 1)] = addDaysToDate(baseDate, days);
          });
        }

        onChange({
          ...header,
          condicaoPagamento: preset.conditionString,
          parcelasCount: preset.parcelas,
          prazoDias: preset.id,
          formaPagamento: preset.id === 'vista' ? 'Depósito' : (header.formaPagamento === 'Boleto / Depósito' ? 'Boleto' : (header.formaPagamento || 'Boleto')),
          valorEntradaAVista: undefined,
          depositoParcelasCount: undefined,
          depositoPrazoDias: undefined,
          saldoParcelasCount: undefined,
          saldoPrazoDias: undefined,
          datasVencimentoPersonalizadas: Object.keys(customDates).length > 0 ? customDates : undefined
        });
      }
      return;
    }

    if (selectedVal === 'vista') {
      handlePaymentPrazoChange('vista');
      return;
    }

    if (selectedVal === 'deposito_e_boleto' || selectedVal === 'entrada_com_parcelamento') {
      handlePaymentPrazoChange(selectedVal);
      return;
    }

    // Intervalos numéricos padrão (ex: 30, 28, 21, 15, 10, 7)
    const intervalNum = parseInt(selectedVal, 10);
    if (!isNaN(intervalNum) && intervalNum > 0) {
      const rawBase = header.dataEntregaPrevista || header.dataPedido || new Date().toISOString().split('T')[0];
      const baseDate = addDaysToDate(rawBase, 0);
      const count = Math.max(1, currentParcelas);
      const offsets: number[] = [];
      if (intervalNum === 10) {
        for (let i = 0; i < count; i++) offsets.push(30 + i * 10);
      } else if (intervalNum === 15) {
        for (let i = 0; i < count; i++) offsets.push(30 + i * 15);
      } else if (intervalNum === 7) {
        for (let i = 1; i <= count; i++) offsets.push(i * 7);
      } else {
        for (let i = 1; i <= count; i++) offsets.push(i * intervalNum);
      }

      const matchingPreset = QUICK_PAYMENT_PRESETS.find(
        (p) => p.parcelas === count &&
               p.daysOffsets.length === offsets.length &&
               p.daysOffsets.every((d, idx) => d === offsets[idx])
      );

      const newCondString = matchingPreset
        ? matchingPreset.conditionString
        : (count === 1 ? `${offsets[0]} Dias` : `${offsets.join('/')} Dias`);

      const customDates: Record<string, string> = {};
      offsets.forEach((days, idx) => {
        customDates[String(idx + 1)] = addDaysToDate(baseDate, days);
      });

      onChange({
        ...header,
        parcelasCount: count,
        prazoDias: selectedVal,
        condicaoPagamento: newCondString,
        datasVencimentoPersonalizadas: customDates
      });
      return;
    }

    handlePaymentPrazoChange(selectedVal);
  };

  const getSavedConditionDropdownValue = () => {
    if (header.condicaoPagamento) {
      const cleanHeaderCond = header.condicaoPagamento.trim().toLowerCase().replace(/\s*dias$/i, '');
      const matched = availableConditions.find((c) => {
        if (c.id === header.condicaoPagamento) return true;
        const cleanDesc = c.descricao.trim().toLowerCase().replace(/\s*dias$/i, '');
        return cleanDesc === cleanHeaderCond;
      });
      if (matched) return matched.id;
    }
    return '';
  };

  const handleApplySavedConditionById = (condId: string) => {
    if (!condId) return;
    const cond = availableConditions.find((c) => c.id === condId);
    if (cond) {
      handleApplyPaymentCondition(cond);
    }
  };

  const handleToggleSplitPayment = () => {
    if (isEntradaMista) {
      const fallbackPrazo = '30';
      const fallbackParc = 3;
      const newCondString = formatPaymentConditionString(fallbackParc, fallbackPrazo);
      onChange({
        ...header,
        formaPagamento: 'Boleto',
        prazoDias: fallbackPrazo,
        parcelasCount: fallbackParc,
        valorEntradaAVista: undefined,
        percentualEntrada: undefined,
        isEntradaProporcional: undefined,
        depositoFormaPagamento: undefined,
        depositoParcelasCount: undefined,
        depositoPrazoDias: undefined,
        saldoFormaPagamento: undefined,
        saldoParcelasCount: undefined,
        saldoPrazoDias: undefined,
        condicaoPagamento: newCondString,
        datasVencimentoPersonalizadas: undefined
      });
    } else {
      handlePaymentPrazoChange('deposito_e_boleto');
    }
  };

  // Percentual de OFF para cálculo e exibição
  const currentOffPct = (header.percentualNota !== undefined && header.percentualNota > 0 && header.percentualNota < 100)
    ? header.percentualNota
    : (header.percentualDescontoOff !== undefined && header.percentualDescontoOff > 0 && header.percentualDescontoOff < 100
        ? header.percentualDescontoOff
        : (header.percentualNota || 0));

  const handleSyncWithOff = (invertSplit: boolean = false) => {
    const rawOff = Math.max(0, Math.min(100, Number(currentOffPct) || 0));
    if (rawOff <= 0) return;
    // Padrão: Boleto = rawOff%, Depósito = (100 - rawOff)%
    // Invertido: Boleto = (100 - rawOff)%, Depósito = rawOff%
    const pctBoleto = invertSplit ? (100 - rawOff) : rawOff;
    const pctDeposito = 100 - pctBoleto;

    // Base de cálculo: usa estritamente o valor real das mercadorias do pedido (sem inventar base de 1.000)
    const baseParaCalculo = valorBaseMercadoria > 0 ? valorBaseMercadoria : 0;
    const newEntrada = baseParaCalculo > 0 ? Number((baseParaCalculo * (pctDeposito / 100)).toFixed(2)) : 0;
    const newSaldo = Math.max(0, Number((baseParaCalculo - newEntrada).toFixed(2)));

    // Recalcular cronograma completo de datas de vencimento
    const newCustomDates = recalculateCombinedDates(depositoParcelas, depositoPrazo, saldoParcelas, saldoPrazo);

    const newCondString = formatPaymentConditionString(
      depositoParcelas + saldoParcelas, 
      'deposito_e_boleto', 
      newEntrada, 
      saldoParcelas, 
      saldoPrazo, 
      depositoParcelas, 
      depositoPrazo,
      header.depositoFormaPagamento || 'Depósito',
      header.saldoFormaPagamento || 'Boleto'
    );

    onChange({
      ...header,
      prazoDias: 'deposito_e_boleto',
      percentualEntrada: pctDeposito,
      isEntradaProporcional: true,
      valorEntradaAVista: newEntrada,
      condicaoPagamento: newCondString,
      datasVencimentoPersonalizadas: newCustomDates
    });

    const successMsg = baseParaCalculo > 0
      ? `✨ Sincronizado: ${pctBoleto}% Boleto (R$ ${newSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) + ${pctDeposito}% Depósito (R$ ${newEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`
      : `✨ Proporção ajustada: ${pctBoleto}% Boleto + ${pctDeposito}% Depósito (Total do pedido zerado)`;
    setSyncFeedback({ message: successMsg, type: 'success' });
    showToast?.(successMsg, 'success');
    setTimeout(() => setSyncFeedback(null), 5000);
  };

  // Previsão dinâmica das datas das parcelas a partir da data de entrega da mercadoria
  const rawBase = header.dataEntregaPrevista || header.dataPedido || new Date().toISOString().split('T')[0];
  const baseDate = addDaysToDate(rawBase, 0);
  const rawOrderDate = header.dataPedido || new Date().toISOString().split('T')[0];
  const orderDate = addDaysToDate(rawOrderDate, 0);
  const customDates = header.datasVencimentoPersonalizadas;

  const previewInstallments = isEntradaMista
    ? [
        // 1. Parcelas de Depósito / PIX / 1ª Condição
        ...Array.from({ length: depositoParcelas }, (_, idx) => {
          const d = idx + 1;
          let defaultDate = '';
          const matchedPreset = QUICK_PAYMENT_PRESETS.find((p) => p.id === depositoPrazo || p.conditionString.toLowerCase() === depositoPrazo.toLowerCase());
          if (depositoPrazo === 'vista') {
            defaultDate = addDaysToDate(orderDate, 0);
          } else if (matchedPreset && matchedPreset.daysOffsets && matchedPreset.daysOffsets[idx] !== undefined) {
            defaultDate = addDaysToDate(baseDate, matchedPreset.daysOffsets[idx]);
          } else {
            const interval = Number(depositoPrazo) || 30;
            const dueDays = 10 + (d - 1) * interval;
            defaultDate = addDaysToDate(baseDate, dueDays);
          }
          const rawCustom = customDates?.[String(d)];
          const customDate = rawCustom ? addDaysToDate(rawCustom, 0) : undefined;
          const labelForma = header.depositoFormaPagamento || 'Depósito';
          return {
            numeroParcela: d,
            rotulo: (depositoParcelas === 1 && depositoPrazo === 'vista') 
              ? `Entrada (${labelForma})` 
              : `${d}º ${labelForma}`,
            dataVencimento: customDate || defaultDate,
            valor: valorPorParcelaDeposito,
            isEntrada: true,
            metodoPagamento: labelForma,
            isFrete: false
          };
        }),
        // 2. Parcelas do Saldo em Boleto / 2ª Condição
        ...Array.from({ length: saldoParcelas }, (_, idx) => {
          const b = idx + 1;
          const numeroParcela = depositoParcelas + b;
          let defaultDate = '';
          const matchedPreset = QUICK_PAYMENT_PRESETS.find((p) => p.id === saldoPrazo || p.conditionString.toLowerCase() === saldoPrazo.toLowerCase());
          if (matchedPreset && matchedPreset.daysOffsets && matchedPreset.daysOffsets[idx] !== undefined) {
            defaultDate = addDaysToDate(baseDate, matchedPreset.daysOffsets[idx]);
          } else {
            const interval = Number(saldoPrazo) || 30;
            if (depositoParcelas === 1 && depositoPrazo === 'vista') {
              defaultDate = addDaysToDate(baseDate, 10 + (b - 1) * interval);
            } else if (depositoPrazo !== 'vista') {
              const matchedDep = QUICK_PAYMENT_PRESETS.find((p) => p.id === depositoPrazo || p.conditionString.toLowerCase() === depositoPrazo.toLowerCase());
              const lastDepDueDays = (matchedDep && matchedDep.daysOffsets && matchedDep.daysOffsets.length > 0)
                ? matchedDep.daysOffsets[matchedDep.daysOffsets.length - 1]
                : (10 + (depositoParcelas - 1) * (Number(depositoPrazo) || 30));
              defaultDate = addDaysToDate(baseDate, lastDepDueDays + b * interval);
            } else {
              defaultDate = addDaysToDate(baseDate, 10 + (b - 1) * interval);
            }
          }
          const rawCustom = customDates?.[String(numeroParcela)];
          const customDate = rawCustom ? addDaysToDate(rawCustom, 0) : undefined;
          const labelForma = header.saldoFormaPagamento || 'Boleto';
          return {
            numeroParcela,
            rotulo: `${b}º ${labelForma} Saldo`,
            dataVencimento: customDate || defaultDate,
            valor: valorPorParcelaSaldo,
            isEntrada: false,
            metodoPagamento: labelForma,
            isFrete: false
          };
        })
      ]
    : Array.from({ length: currentParcelas }, (_, idx) => {
        const num = idx + 1;
        const interval = Number(currentPrazo) || 30;
        const matchedPreset = QUICK_PAYMENT_PRESETS.find(
          (p) => p.conditionString.toLowerCase() === (header.condicaoPagamento || '').toLowerCase() || p.id === currentPrazo
        );
        const defaultOffset = (matchedPreset && matchedPreset.daysOffsets && matchedPreset.daysOffsets[idx] !== undefined)
          ? matchedPreset.daysOffsets[idx]
          : (10 + (num - 1) * interval);
        const defaultDate = addDaysToDate(baseDate, defaultOffset);
        const rawCustom = customDates?.[String(num)];
        const customDate = rawCustom ? addDaysToDate(rawCustom, 0) : undefined;
        return {
          numeroParcela: num,
          rotulo: `${num}ª Parcela`,
          dataVencimento: customDate || defaultDate,
          valor: currentParcelas > 0 ? valorBaseMercadoria / currentParcelas : valorBaseMercadoria,
          isEntrada: false,
          metodoPagamento: header.formaPagamento || 'Boleto',
          isFrete: false
        };
      });

  // Previsão do Boleto de Frete (10 dias após a entrega)
  if (valorFreteNum > 0) {
    const defaultDateFrete = addDaysToDate(baseDate, 10);
    const freteNum = previewInstallments.length + 1;
    const rawFreteCustom = customDates?.['frete'] || customDates?.[String(freteNum)];
    const customDateFrete = rawFreteCustom ? addDaysToDate(rawFreteCustom, 0) : undefined;
    previewInstallments.push({
      numeroParcela: freteNum,
      rotulo: 'Boleto Frete (10d)',
      dataVencimento: customDateFrete || defaultDateFrete,
      valor: valorFreteNum,
      isEntrada: false,
      metodoPagamento: 'Boleto',
      isFrete: true
    });
  }

  const hasCustomDates = Boolean(customDates && Object.keys(customDates).length > 0);

  // Altera a data de uma parcela e recalcula automaticamente todas as parcelas subsequentes
  const handleInstallmentDateChange = (numeroParcela: number, newDate: string, isFrete: boolean) => {
    if (!newDate) return;

    const isoNewDate = toIsoDate(newDate);

    const currentMap: Record<string, string> = {};
    previewInstallments.forEach(item => {
      const key = item.isFrete ? 'frete' : String(item.numeroParcela);
      currentMap[key] = toIsoDate(item.dataVencimento);
    });

    const targetKey = isFrete ? 'frete' : String(numeroParcela);
    const oldDate = currentMap[targetKey];
    if (!oldDate || oldDate === isoNewDate) return;

    const diffDays = getDaysDifference(oldDate, isoNewDate);

    const updatedCustomDates: Record<string, string> = {
      ...(header.datasVencimentoPersonalizadas || {}),
      ...currentMap
    };

    updatedCustomDates[targetKey] = isoNewDate;

    // Se NÃO for frete, ajusta automaticamente todas as parcelas seguintes
    if (!isFrete) {
      previewInstallments.forEach(item => {
        if (!item.isFrete && item.numeroParcela > numeroParcela) {
          const key = String(item.numeroParcela);
          const curD = currentMap[key] || toIsoDate(item.dataVencimento);
          updatedCustomDates[key] = addDaysToDate(curD, diffDays);
        }
      });
    }

    onChange({
      ...header,
      datasVencimentoPersonalizadas: updatedCustomDates
    });
  };

  const handleResetDates = () => {
    onChange({
      ...header,
      datasVencimentoPersonalizadas: undefined
    });
  };

  // Quando o usuário seleciona um fornecedor no autocomplete
  const handleSelectSupplier = (supplier: Supplier) => {
    const supCond = supplier.condicaoPagamentoPadrao || header.condicaoPagamento;
    const supParsed = parsePaymentConditionString(supCond);

    onChange({
      ...header,
      fornecedor: supplier.razaoSocial,
      supplierId: supplier.id,
      vendedor: supplier.vendedorPadrao || header.vendedor,
      contatoVendedor: supplier.contatoVendedor || header.contatoVendedor,
      condicaoPagamento: supCond,
      parcelasCount: supParsed.parcelas,
      prazoDias: supParsed.prazo,
      aliquotaSt: supplier.aliquotaStPadrao || 0,
      percentualDescontoOff: 0,
      percentualNota: supplier.percentualNotaPadrao !== undefined ? supplier.percentualNotaPadrao : (header.percentualNota ?? 100),
      observacoesDescarga: header.observacoesDescarga || header.observacoes || '',
      observacoes: header.observacoes || header.observacoesDescarga || ''
    });
    setIsDropdownOpen(false);
  };

  // Filtrar fornecedores para a lista suspensa
  const filteredSuppliers = useMemo(() => {
    const query = supplierFilterText.trim().toLowerCase();
    if (!query) {
      // Se não há termo de busca no dropdown, lista todos os fornecedores com o selecionado em primeiro
      return [...suppliers].sort((a, b) => {
        if (a.id === header.supplierId) return -1;
        if (b.id === header.supplierId) return 1;
        return a.razaoSocial.localeCompare(b.razaoSocial);
      });
    }

    const cleanQuery = query.replace(/\D/g, '');
    return suppliers.filter(s =>
      s.razaoSocial.toLowerCase().includes(query) ||
      (s.nomeFantasia && s.nomeFantasia.toLowerCase().includes(query)) ||
      (cleanQuery && s.cnpj && s.cnpj.replace(/\D/g, '').includes(cleanQuery)) ||
      (s.vendedorPadrao && s.vendedorPadrao.toLowerCase().includes(query))
    );
  }, [suppliers, supplierFilterText, header.supplierId]);

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs mb-6 overflow-hidden transition-all">
      
      {/* Header bar: ÚNICO local onde a informação de ST é exibida */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-5 py-3.5 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between cursor-pointer select-none hover:bg-slate-100/50 dark:hover:bg-slate-700/30 transition"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-800 dark:text-white">
                {header.fornecedor || 'Fornecedor não informado'}
              </span>

              {/* Badge de Pedido Padrão se existir */}
              {hasSupplierTemplate && (
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onLoadSupplierTemplate) onLoadSupplierTemplate(currentSupplier?.id);
                  }}
                  className="text-xs px-2.5 py-0.5 rounded-full font-extrabold bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 shadow-xs flex items-center gap-1 cursor-pointer hover:bg-indigo-200 dark:hover:bg-indigo-900 transition"
                  title="Clique para carregar o Pedido Padrão deste fornecedor"
                >
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  Compra Padrão ({supplierTemplateItemsCount} itens)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-medium">
          <span>{isExpanded ? 'Recolher' : 'Expandir'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Formulário limpo e harmoniosamente distribuído */}
      {isExpanded && (
        <div className="p-5 space-y-4">
          
          {/* SEÇÃO 1: DADOS DO PEDIDO & FORNECEDOR (Grid de 4 colunas alinhadas) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            {/* 1. Nº Pedido */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  Nº Pedido / Cotação
                </label>
                {duplicateOrderConflict && (
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider animate-pulse">
                    ⚠️ Duplicado!
                  </span>
                )}
              </div>
              <input
                type="text"
                value={header.numeroPedido}
                onChange={(e) => handleFieldChange('numeroPedido', e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-slate-900 font-mono font-bold transition-colors outline-hidden ${
                  duplicateOrderConflict
                    ? 'border-rose-500 dark:border-rose-500 ring-2 ring-rose-500/20 text-rose-700 dark:text-rose-300 bg-rose-50/50 dark:bg-rose-950/20'
                    : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500'
                }`}
                placeholder="Ex: PED-0001"
              />
              {duplicateOrderConflict && (
                <p className="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-start gap-1 leading-tight">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
                  <span>Já existe no pedido de <b>{duplicateOrderConflict.header.fornecedor || 'outro fornecedor'}</b>. Números devem ser únicos!</span>
                </p>
              )}
            </div>

            {/* 2. Fornecedor (Ocupa 2 colunas) */}
            <div className="sm:col-span-2 relative" ref={dropdownRef}>
              <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                  Fornecedor (Razão Social / Nome)
                </label>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Botão Salvar como Pedido Padrão */}
                  {onSaveAsSupplierTemplate && currentSupplier && (
                    <button
                      type="button"
                      onClick={onSaveAsSupplierTemplate}
                      className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/80 dark:hover:bg-amber-900 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 transition flex items-center gap-1 cursor-pointer"
                      title="Salvar a lista atual de itens e negociação como a Compra Padrão deste fornecedor"
                    >
                      <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                      Salvar como Padrão
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={header.fornecedor}
                  onChange={(e) => {
                    handleFieldChange('fornecedor', e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setIsDropdownOpen(true);
                  }}
                  onClick={() => {
                    setIsDropdownOpen(true);
                  }}
                  className="w-full pl-3 pr-16 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
                  placeholder="Selecione ou digite o fornecedor..."
                />
                
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {header.fornecedor && (
                    <button
                      type="button"
                      onClick={() => {
                        onChange({
                          ...header,
                          fornecedor: '',
                          supplierId: undefined
                        });
                        setSupplierFilterText('');
                        setIsDropdownOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                      title="Limpar seleção do fornecedor"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(prev => !prev);
                      setSupplierFilterText('');
                    }}
                    className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded cursor-pointer transition"
                    title={isDropdownOpen ? "Fechar lista de fornecedores" : "Abrir lista de fornecedores"}
                  >
                    {isDropdownOpen ? <ChevronUp className="w-4 h-4 text-emerald-500" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Dropdown Suggestions List (Abre ao clicar ou focar) */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col">
                  {/* Barra de Pesquisa Dentro do Dropdown */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-100 dark:border-slate-700/60 sticky top-0 z-10 backdrop-blur-xs">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={supplierFilterText}
                        onChange={(e) => setSupplierFilterText(e.target.value)}
                        placeholder="Pesquisar fornecedor por nome, fantasia ou CNPJ..."
                        className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500 font-normal"
                        autoFocus
                      />
                      {supplierFilterText && (
                        <button
                          type="button"
                          onClick={() => setSupplierFilterText('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5 px-0.5">
                      <span>Fornecedores Cadastrados ({filteredSuppliers.length})</span>
                      {header.supplierId && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold lowercase">
                          selecionado no topo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lista com Rolagem */}
                  <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50 flex-1 max-h-60">
                    {filteredSuppliers.length > 0 ? (
                      filteredSuppliers.map(sup => {
                        const isSelected = currentSupplier?.id === sup.id || header.supplierId === sup.id;

                        return (
                          <div
                            key={sup.id}
                            onClick={() => {
                              handleSelectSupplier(sup);
                              setSupplierFilterText('');
                            }}
                            className={`px-3.5 py-2.5 hover:bg-emerald-50/80 dark:hover:bg-slate-700/70 cursor-pointer transition flex items-center justify-between gap-3 ${
                              isSelected ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-l-4 border-emerald-500' : ''
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  {sup.razaoSocial}
                                </span>
                                {sup.nomeFantasia && sup.nomeFantasia !== sup.razaoSocial && (
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                    ({sup.nomeFantasia})
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono flex-wrap">
                                {sup.cnpj && <span>CNPJ: {sup.cnpj}</span>}
                                {sup.vendedorPadrao && <span>• Vendedor: {sup.vendedorPadrao}</span>}
                                {sup.condicaoPagamentoPadrao && <span>• {sup.condicaoPagamentoPadrao}</span>}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">
                        Nenhum fornecedor encontrado para "{supplierFilterText}".
                      </div>
                    )}
                  </div>

                  {/* Rodapé: Botão Cadastrar Fornecedor */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 sticky bottom-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onOpenSupplierModal(null);
                      }}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1.5 cursor-pointer px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg border border-emerald-200 dark:border-emerald-800/80 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Cadastrar Novo Fornecedor
                    </button>
                    <span className="text-[10px] text-slate-400">Clique para selecionar</span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. OFF % */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                OFF %
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={header.percentualNota === 0 ? '' : (header.percentualNota !== undefined ? header.percentualNota : 100)}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleFieldChange('percentualNota', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold pr-8 font-mono"
                  placeholder="100"
                />
                <span className="absolute right-3 top-2 text-xs font-bold text-slate-400 pointer-events-none">
                  %
                </span>
              </div>
            </div>

            {/* 4. Vendedor */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Vendedor / Representante
              </label>
              <input
                type="text"
                value={header.vendedor}
                onChange={(e) => handleFieldChange('vendedor', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                placeholder="Roberto Lima"
              />
            </div>

            {/* 5. Contato Vendedor */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Telefone / WhatsApp / E-mail
              </label>
              <input
                type="text"
                value={header.contatoVendedor?.includes('@') ? header.contatoVendedor : maskPhone(header.contatoVendedor || '')}
                onChange={(e) => {
                  const val = e.target.value;
                  handleFieldChange('contatoVendedor', val.includes('@') ? val : maskPhone(val));
                }}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono"
              />
            </div>

            {/* 6. Data do Pedido */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Data do pedido
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={toBrDate(header.dataPedido || header.dataEmissao || new Date().toISOString().split('T')[0])}
                  onChange={(e) => handleFieldChange('dataPedido', maskDate(e.target.value))}
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  className="w-full px-3 py-2 pr-8 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono font-medium"
                />
                <input
                  type="date"
                  value={toIsoDate(header.dataPedido || header.dataEmissao || new Date().toISOString().split('T')[0])}
                  onChange={(e) => handleFieldChange('dataPedido', toBrDate(e.target.value))}
                  className="absolute right-1 w-7 h-7 opacity-0 cursor-pointer z-10"
                  tabIndex={-1}
                  title="Selecionar no calendário"
                />
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
              </div>
            </div>

            {/* 7. Data Entrega Prevista */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                Previsão de Entrega
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={toBrDate(header.dataEntregaPrevista)}
                  onChange={(e) => handleFieldChange('dataEntregaPrevista', maskDate(e.target.value))}
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  className="w-full px-3 py-2 pr-8 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono font-medium"
                />
                <input
                  type="date"
                  value={toIsoDate(header.dataEntregaPrevista)}
                  onChange={(e) => handleFieldChange('dataEntregaPrevista', toBrDate(e.target.value))}
                  className="absolute right-1 w-7 h-7 opacity-0 cursor-pointer z-10"
                  tabIndex={-1}
                  title="Selecionar no calendário"
                />
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
              </div>
            </div>

          </div>

          {/* SEÇÃO 2: CONDIÇÕES COMERCIAIS, PAGAMENTO & BOLETOS (Card Destacado com Validação de Limite) */}
          {(() => {
            const LIMITE_MAXIMO_BOLETO = 9999;
            const valorMaximoBoletoCalculado = isEntradaMista ? valorPorParcelaSaldo : (valorTotalPedido > 0 && currentParcelas > 0 ? (valorTotalPedido / currentParcelas) : 0);
            
            return (
              <div className={`p-4 rounded-2xl border transition-all ${
                (valorMaximoBoletoCalculado > LIMITE_MAXIMO_BOLETO) 
                  ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 shadow-xs' 
                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-700'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <CreditCard className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Condições Comerciais & Prazos de Pagamento
                    </span>
                  </div>

                  {/* Indicador de Limite de Boleto (R$ 9.999,00) & Botão de Gestão de Condições */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsPaymentCondModalOpen(true)}
                      className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800 shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                      title="Gerenciar Condições de Pagamento"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Condições de Pagamento</span>
                      {availableConditions.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold">
                          {availableConditions.length}
                        </span>
                      )}
                    </button>

                    {valorTotalPedido > 0 && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Boleto: R$ {valorMaximoBoletoCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (≤ R$ 9.999)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* BARRA: CONDIÇÃO SALVA NO BANCO DE DADOS */}
                <div className="p-2.5 mb-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="flex items-center gap-2 shrink-0">
                    <BookmarkCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      Condição Salva (BD):
                    </span>
                  </div>

                  <div className="flex-1 flex items-center gap-2">
                    <select
                      value={getSavedConditionDropdownValue()}
                      onChange={(e) => handleApplySavedConditionById(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer shadow-2xs"
                    >
                      <option value="">-- Selecione uma Condição Salva no Banco --</option>
                      {availableConditions.map((cond) => (
                        <option key={cond.id} value={cond.id}>
                          {cond.descricao} {cond.qtdParcelas ? `(${cond.qtdParcelas}x)` : ''} {cond.especie ? `• ${cond.especie}` : ''} {cond.banco ? `• ${cond.banco}` : ''} {cond.padrao ? '⭐ (Padrão)' : ''}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setIsPaymentCondModalOpen(true)}
                      className="px-2.5 py-1.5 text-xs rounded-lg font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                      title="Cadastrar ou Gerenciar Condições de Pagamento no Banco de Dados"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nova</span>
                    </button>
                  </div>
                </div>

                {/* CONFIGURAÇÃO DE PAGAMENTO: MODO ÚNICO OU DUAS LINHAS COMBINADAS */}
                {!isEntradaMista ? (
                  <>
                    {/* LINHA DE CONDIÇÃO ÚNICA DE PAGAMENTO */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-3.5">
                      {/* 1. Forma de Pagamento */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                          <span>1. Forma de Pagamento</span>
                        </label>
                        <select
                          value={header.formaPagamento || 'Boleto'}
                          onChange={(e) => handleFieldChange('formaPagamento', e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold cursor-pointer shadow-2xs"
                        >
                          {FORMA_PAGAMENTO_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 2. Coluna de Períodos (Modelos Pré-definidos & Intervalos) */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                          <span>2. Período / Prazos</span>
                          {header.condicaoPagamento && (
                            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 truncate max-w-[160px]">
                              {header.condicaoPagamento}
                            </span>
                          )}
                        </label>
                        <select
                          value={getPeriodoDropdownValue()}
                          onChange={(e) => handlePeriodoSelect(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold cursor-pointer shadow-2xs"
                        >
                          {renderPeriodoOptions(getPeriodoDropdownValue(), true)}
                        </select>
                      </div>

                      {/* 3. Quantidade de Parcelas */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                          <span>3. Qtd Parcelas</span>
                        </label>
                        <select
                          value={isVistaIntegral ? 1 : currentParcelas}
                          disabled={isVistaIntegral}
                          onChange={(e) => handlePaymentParcelasChange(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold cursor-pointer shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isVistaIntegral ? (
                            <option value="1">1x (À Vista ou 1 Parcela)</option>
                          ) : (
                            <>
                              {PARCELAS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                              {!PARCELAS_OPTIONS.some((o) => o.value === currentParcelas) && currentParcelas > 0 && (
                                <option key={currentParcelas} value={currentParcelas}>
                                  {currentParcelas}x Parcelas
                                </option>
                              )}
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* BOTÃO PARA ADICIONAR FORMA DE PAGAMENTO */}
                    <div className="flex items-center gap-2 mb-3.5">
                      <button
                        type="button"
                        onClick={handleToggleSplitPayment}
                        className="px-3 py-1.5 text-xs rounded-xl font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                        title="Adicionar forma de pagamento e desdobrar as condições"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Adicionar forma de pagamento</span>
                      </button>
                    </div>
                  </>
                ) : (
                  /* MODO DUAS CONDIÇÕES / LINHAS COMBINADAS */
                  <div className="mb-3.5 p-3 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-50/40 via-white to-emerald-50/30 dark:from-indigo-950/20 dark:via-slate-900/40 dark:to-emerald-950/10 space-y-3 shadow-xs">
                    {/* BARRA SUPERIOR DE SINCRONIZAÇÃO E CONTROLE */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-indigo-100 dark:border-indigo-900/40">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-lg bg-indigo-600 text-white shadow-xs">
                          <Sparkles className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Condições Combinadas (1ª e 2ª Forma de Pagamento)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleSyncWithOff(false)}
                          className="px-2.5 py-1 text-xs rounded-lg font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 cursor-pointer shadow-2xs flex items-center gap-1 transition-all"
                          title={`Calcular divisão do pedido aplicando ${currentOffPct}% para Boleto e ${100 - currentOffPct}% para Depósito`}
                        >
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>Sincronizar OFF ({currentOffPct}%)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSyncWithOff(true)}
                          className="px-2.5 py-1 text-xs rounded-lg font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer shadow-2xs flex items-center gap-1 transition-all"
                          title={`Inverter proporção: ${100 - currentOffPct}% para Boleto e ${currentOffPct}% para Depósito`}
                        >
                          <ArrowRightLeft className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                          <span>Inverter</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleToggleSplitPayment}
                          className="px-2.5 py-1 text-xs rounded-lg font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 cursor-pointer shadow-2xs flex items-center gap-1 transition-all"
                          title="Remover a 2ª forma de pagamento e voltar para forma única"
                        >
                          <span>Remover 2ª Forma</span>
                        </button>
                      </div>
                    </div>

                    {/* LINHA 1 (1ª FORMA / DEPÓSITO / ENTRADA) */}
                    <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs">
                      <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                          1ª Condição: Depósito / Entrada
                        </span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-900">
                          {isProporcional ? targetPctDeposito : (baseReferenciaPercentual > 0 ? ((valorEntrada / baseReferenciaPercentual) * 100).toFixed(0) : 0)}% do Pedido
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        {/* 1. Forma */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Forma de Pagamento
                          </label>
                          <select
                            value={header.depositoFormaPagamento || 'Depósito'}
                            onChange={(e) => handleFieldChange('depositoFormaPagamento', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold cursor-pointer"
                          >
                            <option value="Depósito">Depósito / PIX</option>
                            <option value="Boleto">Boleto</option>
                            <option value="Cheque">Cheque</option>
                          </select>
                        </div>

                        {/* 2. Período / Prazos */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Período / Prazos
                          </label>
                          <select
                            value={getDepositoPeriodoDropdownValue()}
                            onChange={(e) => handleDepositoPeriodoSelect(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold cursor-pointer"
                          >
                            {renderPeriodoOptions(getDepositoPeriodoDropdownValue(), false)}
                          </select>
                        </div>

                        {/* 3. Qtd Parcelas */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Qtd Parcelas
                          </label>
                          <select
                            value={depositoParcelas}
                            onChange={(e) => handleDepositoParcelasChange(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold cursor-pointer"
                          >
                            {PARCELAS_OPTIONS.filter((o) => o.value > 0).map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.value === 1 ? '1x (À Vista)' : `${opt.value}x`}
                              </option>
                            ))}
                            {!PARCELAS_OPTIONS.some((o) => o.value === depositoParcelas) && depositoParcelas > 0 && (
                              <option key={depositoParcelas} value={depositoParcelas}>
                                {depositoParcelas}x
                              </option>
                            )}
                          </select>
                        </div>

                        {/* 4. Valor (R$) */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Valor 1ª Condição (R$)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={valorEntrada > 0 ? formatCurrency(valorEntrada, false) : ''}
                            placeholder="0,00"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const { value } = handleCurrencyInput(e.target.value, true);
                              handleEntradaChange(value);
                            }}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* LINHA 2 (2ª FORMA / SALDO BOLETO) */}
                    <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs">
                      <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                          2ª Condição: Saldo Boleto
                        </span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
                          {isProporcional ? (100 - targetPctDeposito) : (baseReferenciaPercentual > 0 ? ((saldoRestante / baseReferenciaPercentual) * 100).toFixed(0) : 0)}% do Pedido
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        {/* 1. Forma */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Forma de Pagamento
                          </label>
                          <select
                            value={header.saldoFormaPagamento || 'Boleto'}
                            onChange={(e) => handleFieldChange('saldoFormaPagamento', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold cursor-pointer"
                          >
                            <option value="Boleto">Boleto</option>
                            <option value="Depósito">Depósito / PIX</option>
                            <option value="Cheque">Cheque</option>
                          </select>
                        </div>

                        {/* 2. Período / Prazos */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Período / Prazos
                          </label>
                          <select
                            value={getSaldoPeriodoDropdownValue()}
                            onChange={(e) => handleSaldoPeriodoSelect(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold cursor-pointer"
                          >
                            {renderPeriodoOptions(getSaldoPeriodoDropdownValue(), false)}
                          </select>
                        </div>

                        {/* 3. Qtd Parcelas */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Qtd Parcelas
                          </label>
                          <select
                            value={saldoParcelas}
                            onChange={(e) => handleSaldoParcelasChange(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold cursor-pointer"
                          >
                            {PARCELAS_OPTIONS.filter((o) => o.value > 0).map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.value}x
                              </option>
                            ))}
                            {!PARCELAS_OPTIONS.some((o) => o.value === saldoParcelas) && saldoParcelas > 0 && (
                              <option key={saldoParcelas} value={saldoParcelas}>
                                {saldoParcelas}x
                              </option>
                            )}
                          </select>
                        </div>

                        {/* 4. Saldo Restante (R$) */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Saldo Restante (R$)
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={`R$ ${saldoRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/80 text-emerald-700 dark:text-emerald-400 font-mono font-bold cursor-default"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* NOTIFICAÇÃO INLINE DE SINCRONIZAÇÃO */}
                {syncFeedback && (
                  <div className={`mb-3.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                    syncFeedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-sky-50 dark:bg-sky-950/50 border-sky-300 dark:border-sky-800 text-sky-800 dark:text-sky-200'
                  }`}>
                    {syncFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                    )}
                    <span>{syncFeedback.message}</span>
                  </div>
                )}

                {/* LINHA: FRETE E DESCONTOS COMERCIAIS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* 4. Tipo de Frete */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Modalidade Frete
                    </label>
                    <select
                      value={valorFreteNum > 0 && String(header.tipoFrete || 'CIF').toUpperCase().includes('CIF') ? 'FOB' : (header.tipoFrete || 'CIF')}
                      onChange={(e) => handleFieldChange('tipoFrete', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold cursor-pointer shadow-2xs"
                    >
                      {TIPO_FRETE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 5. Valor do Frete */}
                  <div>
                    {(() => {
                      const isCifModalidade = String(header.tipoFrete || (valorFreteNum > 0 ? 'FOB' : 'CIF')).toUpperCase().includes('CIF') && valorFreteNum <= 0;
                      return (
                        <>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                            <span>Valor Frete (R$)</span>
                            {isCifModalidade ? (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                Incluso (Fornecedor)
                              </span>
                            ) : (
                              valorFreteNum > 0 && valorBaseMercadoria > 0 && (
                                <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400">
                                  {((valorFreteNum / valorBaseMercadoria) * 100).toFixed(2)}% dos produtos
                                </span>
                              )
                            )}
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            disabled={isCifModalidade}
                            value={isCifModalidade ? '0,00' : (valorFreteNum > 0 ? formatCurrency(valorFreteNum, false) : (header.valorFrete !== undefined && header.valorFrete !== 0 ? formatCurrency(header.valorFrete, false) : ''))}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const { value } = handleCurrencyInput(e.target.value, true);
                              handleFieldChange('valorFrete', value);
                            }}
                            placeholder="0,00"
                            className={`w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 font-mono font-bold shadow-2xs ${
                              isCifModalidade
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden'
                            }`}
                          />
                          {!isCifModalidade && valorFreteNum > 0 && (
                            <p className="text-[10px] text-sky-600 dark:text-sky-400 font-medium mt-1 flex items-center gap-1">
                              <span>🚚 Boleto de frete gerado em {addDaysToDate(baseDate, 10).split('-').reverse().join('/')} (10d após entrega)</span>
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* 6. Desconto Comercial (%) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                      <span>Desconto comercial (%)</span>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">% OFF</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={header.percentualDescontoOff === 0 ? '' : (header.percentualDescontoOff ?? '')}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleFieldChange('percentualDescontoOff', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold text-emerald-600 dark:text-emerald-400 font-mono shadow-2xs pr-8"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-slate-400 pointer-events-none">
                        %
                      </span>
                    </div>
                  </div>

                  {/* 7. Desconto Comercial (R$) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                      <span>Desconto comercial (R$)</span>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">R$ OFF</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={header.descontoComercialTotal !== undefined && header.descontoComercialTotal !== 0 ? formatCurrency(header.descontoComercialTotal, false) : ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const { value } = handleCurrencyInput(e.target.value, true);
                        handleFieldChange('descontoComercialTotal', value);
                      }}
                      placeholder="0,00"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono font-bold text-emerald-600 dark:text-emerald-400 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Prévia dos Boletos e Parcelas */}
                {previewInstallments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Previsão de Vencimento dos Títulos ({previewInstallments.length}x):</span>
                      </div>
                      {hasCustomDates && (
                        <button
                          type="button"
                          onClick={handleResetDates}
                          className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer transition lowercase first-letter:uppercase"
                          title="Restaurar datas automáticas calculadas pelo intervalo selecionado"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Redefinir prazos padrão</span>
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {previewInstallments.map((inst) => {
                        const isFreteItem = (inst as any).isFrete;
                        const isEntradaItem = inst.isEntrada;
                        const metodo = (inst as any).metodoPagamento || (isEntradaItem ? 'Depósito' : isFreteItem ? 'Boleto' : 'Boleto');
                        const isDeposito = metodo === 'Depósito' || isEntradaItem;

                        return (
                          <div 
                            key={inst.numeroParcela}
                            className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 shadow-xs transition-all ${
                              isFreteItem
                                ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-200'
                                : isDeposito
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
                                : (inst.valor > LIMITE_MAXIMO_BOLETO)
                                ? 'bg-rose-50/90 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                            }`}
                          >
                            <span className="font-bold shrink-0 flex items-center gap-1">
                              <span>{isFreteItem ? '🚚' : isDeposito ? '🏦' : '📄'}</span>
                              <span className={isFreteItem ? 'text-sky-900 dark:text-sky-200' : isDeposito ? 'text-indigo-950 dark:text-indigo-200' : 'text-emerald-950 dark:text-emerald-200'}>
                                {inst.rotulo}:
                              </span>
                            </span>
                            {valorTotalPedido > 0 || isFreteItem ? (
                              <span className={`font-extrabold font-mono shrink-0 ${
                                isFreteItem
                                  ? 'text-sky-700 dark:text-sky-300'
                                  : isDeposito 
                                  ? 'text-indigo-700 dark:text-indigo-300' 
                                  : (inst.valor > LIMITE_MAXIMO_BOLETO) 
                                  ? 'text-rose-600 dark:text-rose-400' 
                                  : 'text-emerald-700 dark:text-emerald-300'
                              }`}>
                                R$ {inst.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : null}

                            {/* Data editável com ajuste automático em cascata */}
                            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition shadow-2xs">
                              <Calendar className="w-3 h-3 text-slate-400 shrink-0 pointer-events-none" />
                              <input
                                type="date"
                                value={toIsoDate(inst.dataVencimento)}
                                onChange={(e) => handleInstallmentDateChange(inst.numeroParcela, e.target.value, Boolean(isFreteItem))}
                                className="bg-transparent text-slate-800 dark:text-slate-200 font-mono text-[11px] font-bold outline-hidden cursor-pointer"
                                title="Clique para editar a data (as datas seguintes serão ajustadas automaticamente)"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* SEÇÃO 3: DESCRIÇÃO DO FORNECEDOR (ESPELHO) & DESCRIÇÃO DO PEDIDO */}
          <div className="space-y-3">
            {/* Espelho da Descrição do Cadastro do Fornecedor */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Descrição do Fornecedor (Cadastro)
                </span>
                <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/40 px-2 py-0.5 rounded-md">
                  Espelho do Cadastro
                </span>
              </label>
              <input
                type="text"
                readOnly
                value={currentSupplier?.observacoesDescarga || ''}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 outline-hidden font-medium cursor-default"
                placeholder="Nenhuma descrição cadastrada para este fornecedor"
              />
            </div>

            {/* Descrição / Observação do Pedido */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Descrição / Observação do Pedido
              </label>
              <input
                type="text"
                value={header.observacoes || header.observacoesDescarga || ''}
                onChange={(e) => {
                  handleFieldChange('observacoes', e.target.value);
                  handleFieldChange('observacoesDescarga', e.target.value);
                }}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                placeholder="Descrição ou observações específicas deste pedido..."
              />
            </div>
          </div>

        </div>
      )}

      {/* Modal de Gestão de Condições de Pagamento */}
      <PaymentConditionsModal
        isOpen={isPaymentCondModalOpen}
        onClose={() => {
          setIsPaymentCondModalOpen(false);
          refreshPaymentConditions();
        }}
        onSelectCondition={(cond) => {
          handleApplyPaymentCondition(cond);
          refreshPaymentConditions();
        }}
      />

    </div>
  );
};
