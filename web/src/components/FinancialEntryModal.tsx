import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Save,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  CreditCard,
  Layers,
  Sparkles,
  AlertCircle,
  Clock,
  Repeat,
  Store,
  Tag,
  Check,
  ArrowRight
} from 'lucide-react';
import { FinancialCategory, FinancialPaymentMethod, Supplier, StoreConfig } from '../shared/types';
import { toBrDate } from '../utils/masks';

interface FinancialEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  suppliers: Supplier[];
  stores: StoreConfig[];
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onSaveEntry: (entryData: any) => Promise<any>;
}

const CATEGORIAS_CONFIG: { key: FinancialCategory; label: string; color: string }[] = [
  { key: 'FIXO', label: 'Despesa Fixa (Água/Luz/Aluguel)', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-800' },
  { key: 'OPERACIONAL', label: 'Operacional Loja', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800' },
  { key: 'PRODUTOS', label: 'Produtos / Mercadorias', color: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800' },
  { key: 'RH', label: 'RH & Retiradas', color: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800' },
  { key: 'IMPOSTOS', label: 'Impostos & Tributos', color: 'bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800' },
  { key: 'INVESTIMENTOS', label: 'Investimentos & Reformas', color: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800' },
  { key: 'OUTROS', label: 'Outras Despesas', color: 'bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-800' }
];

const FORMAS_PAGAMENTO: FinancialPaymentMethod[] = [
  'BOLETO',
  'DINHEIRO',
  'PIX',
  'DEPÓSITO',
  'CARTAO',
  'CHEQUE'
];

const BANCOS_SUGESTOES = [
  'Banco Santander',
  'Caixa Interno Loja',
  'Banco do Brasil',
  'Bradesco',
  'Itaú',
  'Nubank / Cora'
];

export const FinancialEntryModal: React.FC<FinancialEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  suppliers,
  stores,
  showToast,
  onSaveEntry
}) => {
  const [descricao, setDescricao] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [categoria, setCategoria] = useState<FinancialCategory>('FIXO');
  const [lojaSelecionada, setLojaSelecionada] = useState<string>('ALS');
  const [empresa, setEmpresa] = useState<'ALS' | 'CONECTA' | 'Matriz Central'>('ALS');
  const [formaPagamento, setFormaPagamento] = useState<FinancialPaymentMethod>('BOLETO');
  const [bancoConta, setBancoConta] = useState('Banco Santander');
  const [documentoRef, setDocumentoRef] = useState('');
  const [observacao, setObservacao] = useState('');
  
  // Valores e Parcelamento (Padrão ERP)
  const [modoParcelamento, setModoParcelamento] = useState<'a_vista' | 'parcelado'>('a_vista');
  const [valorTotalStr, setValorTotalStr] = useState<string>('');
  const [dataBase, setDataBase] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [parcelasCount, setParcelasCount] = useState<number>(3);
  const [intervaloDias, setIntervaloDias] = useState<number>(30);
  const [datasCustomizadas, setDatasCustomizadas] = useState<string[]>([]);
  const [isRecorrente, setIsRecorrente] = useState<boolean>(false);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Limpar formulário ao abrir
  useEffect(() => {
    if (isOpen) {
      setDescricao('');
      setFornecedor('');
      setCategoria('FIXO');
      setLojaSelecionada('ALS');
      setEmpresa('ALS');
      setFormaPagamento('BOLETO');
      setBancoConta('Banco Santander');
      setDocumentoRef('');
      setObservacao('');
      setModoParcelamento('a_vista');
      setValorTotalStr('');
      setDataBase(new Date().toISOString().substring(0, 10));
      setParcelasCount(3);
      setIntervaloDias(30);
      setDatasCustomizadas([]);
      setIsRecorrente(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  // Recalcular datas customizadas quando altera a data base, parcelas ou intervalo
  useEffect(() => {
    if (modoParcelamento === 'parcelado') {
      const dates: string[] = [];
      const base = new Date(dataBase + 'T12:00:00Z');
      for (let i = 0; i < parcelasCount; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() + (i * intervaloDias));
        dates.push(d.toISOString().substring(0, 10));
      }
      setDatasCustomizadas(dates);
    }
  }, [dataBase, parcelasCount, intervaloDias, modoParcelamento]);

  // Valor numérico parseado
  const valorTotalNum = useMemo(() => {
    if (!valorTotalStr) return 0;
    const clean = valorTotalStr.replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  }, [valorTotalStr]);

  // Grade de parcelas calculadas para preview em tempo real
  const previewParcelas = useMemo(() => {
    if (modoParcelamento === 'a_vista' || parcelasCount <= 1 || valorTotalNum <= 0) {
      return [];
    }
    const valBase = Math.floor((valorTotalNum / parcelasCount) * 100) / 100;
    const diff = Math.round((valorTotalNum - (valBase * parcelasCount)) * 100) / 100;

    return Array.from({ length: parcelasCount }, (_, i) => {
      const val = (i === 0) ? (valBase + diff) : valBase;
      const due = datasCustomizadas[i] || dataBase;
      return {
        num: i + 1,
        total: parcelasCount,
        label: `${i + 1}/${parcelasCount}`,
        valor: val,
        vencimento: due
      };
    });
  }, [modoParcelamento, parcelasCount, valorTotalNum, datasCustomizadas, dataBase]);

  const handleCustomDateChange = (index: number, newDate: string) => {
    const updated = [...datasCustomizadas];
    updated[index] = newDate;
    setDatasCustomizadas(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!descricao.trim()) {
      setErrorMsg('Informe a descrição do lançamento (ex: Luz Ivaí, Aluguel, Fornecedor Fatex).');
      return;
    }

    if (valorTotalNum <= 0) {
      setErrorMsg('Informe um valor válido maior que zero.');
      return;
    }

    if (!dataBase) {
      setErrorMsg('Informe a data de vencimento.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        descricao: descricao.trim(),
        fornecedor: fornecedor.trim(),
        categoria,
        storeId: lojaSelecionada.toLowerCase(),
        lojaNome: lojaSelecionada,
        empresa,
        formaPagamento,
        bancoConta,
        documentoRef: documentoRef.trim(),
        observacao: observacao.trim(),
        tipo: categoria === 'PRODUTOS' ? 'pedido_parcela' : 'despesa',
        valorTotal: valorTotalNum,
        valor: valorTotalNum,
        parcelasCount: modoParcelamento === 'parcelado' ? parcelasCount : 1,
        intervaloDias: modoParcelamento === 'parcelado' ? intervaloDias : 30,
        primeiroVencimento: dataBase,
        dataVencimento: dataBase,
        datasCustomizadas: modoParcelamento === 'parcelado' ? datasCustomizadas : [dataBase],
        recorrente: isRecorrente
      };

      await onSaveEntry(payload);
      showToast('Lançamento registrado com sucesso no Financeiro!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar lançamento:', err);
      setErrorMsg(err.message || 'Erro ao registrar lançamento.');
      showToast(err.message || 'Erro ao salvar lançamento.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        
        {/* Topo / Header ERP */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Novo Lançamento Financeiro ERP
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                  Contas a Pagar
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lançamento corporativo unificado de despesas de lojas, despesas fixas e parcelas de compras
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Classificação / Categoria da Despesa */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Classificação Financeira / Categoria
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIAS_CONFIG.map(cat => {
                const isSelected = categoria === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategoria(cat.key)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all ${
                      isSelected
                        ? `${cat.color} font-bold ring-2 ring-amber-500/50 shadow-xs`
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{cat.key}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                    </div>
                    <span className="text-[10px] block opacity-80 mt-0.5 truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Descrição, Fornecedor e Loja */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            
            {/* Descrição */}
            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Descrição do Compromisso / Despesa <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Copel Luz Ivaí, Aluguel Rebouças, Sanepar Água..."
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            {/* Favorecido / Fornecedor */}
            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fornecedor / Favorecido
              </label>
              <input
                type="text"
                list="suppliers-suggestions"
                placeholder="Ex: Copel, Sanepar, Fatex, ZD Alimentos..."
                value={fornecedor}
                onChange={e => setFornecedor(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <datalist id="suppliers-suggestions">
                {suppliers.map(s => (
                  <option key={s.id} value={s.razaoSocial} />
                ))}
              </datalist>
            </div>

            {/* Loja / Centro de Custo */}
            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Loja / Unidade Destino
              </label>
              <select
                value={lojaSelecionada}
                onChange={e => setLojaSelecionada(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                <optgroup label="Empresas de Faturamento">
                  <option value="ALS">ALS (Matriz / Geral)</option>
                  <option value="CONECTA">CONECTA</option>
                  <option value="Matriz Central">Matriz Central</option>
                </optgroup>
                <optgroup label="Lojas Físicas da Jóia ERP">
                  {stores.map(st => (
                    <option key={st.id} value={st.name}>
                      Loja {st.name} ({st.id})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Empresa Faturada */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Empresa Pagadora
              </label>
              <select
                value={empresa}
                onChange={e => setEmpresa(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                <option value="ALS">ALS</option>
                <option value="CONECTA">CONECTA</option>
                <option value="Matriz Central">Matriz Central</option>
              </select>
            </div>

            {/* Número NF / Documento */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                NF / Documento
              </label>
              <input
                type="text"
                placeholder="Ex: 254010, 706..."
                value={documentoRef}
                onChange={e => setDocumentoRef(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

          </div>

          {/* 3. Modo de Condição de Pagamento (Padrão ERP) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-amber-500" />
                Estrutura de Pagamento & Parcelas (ERP)
              </span>

              {/* Toggle À Vista vs Parcelado */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setModoParcelamento('a_vista')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    modoParcelamento === 'a_vista'
                      ? 'bg-amber-500 text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  À Vista / Parcela Única
                </button>
                <button
                  type="button"
                  onClick={() => setModoParcelamento('parcelado')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    modoParcelamento === 'parcelado'
                      ? 'bg-amber-500 text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Parcelado em N vezes
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              {/* Valor Total */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Valor Total do Lançamento (R$) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
                    value={valorTotalStr}
                    onChange={e => setValorTotalStr(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-base focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Data de Vencimento Base / 1ª Parcela */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {modoParcelamento === 'parcelado' ? '1º Vencimento' : 'Data de Vencimento'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={dataBase}
                  onChange={e => setDataBase(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              {/* Se for parcelado: Quantidade e Intervalo */}
              {modoParcelamento === 'parcelado' ? (
                <>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Parcelas
                    </label>
                    <select
                      value={parcelasCount}
                      onChange={e => setParcelasCount(Math.max(2, parseInt(e.target.value, 10) || 2))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    >
                      {Array.from({ length: 23 }, (_, i) => i + 2).map(n => (
                        <option key={n} value={n}>{n}x</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Intervalo (Dias)
                    </label>
                    <select
                      value={intervaloDias}
                      onChange={e => setIntervaloDias(parseInt(e.target.value, 10) || 30)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    >
                      <option value={15}>15 dias</option>
                      <option value={21}>21 dias</option>
                      <option value={28}>28 dias</option>
                      <option value={30}>30 dias (Mensal)</option>
                      <option value={45}>45 dias</option>
                      <option value={60}>60 dias</option>
                    </select>
                  </div>
                </>
              ) : (
                <div className="sm:col-span-4 flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRecorrente}
                      onChange={e => setIsRecorrente(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      Despesa Fixa Recorrente (renova mensalmente)
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Grade de Preview das Parcelas Calculadas */}
            {modoParcelamento === 'parcelado' && previewParcelas.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                  Pré-visualização das Parcelas Geradas (datas editáveis):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {previewParcelas.map((p, idx) => (
                    <div
                      key={p.num}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-amber-600 dark:text-amber-400">Parcela {p.label}</span>
                        <p className="text-[13px] font-bold text-slate-900 dark:text-white">
                          R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <input
                        type="date"
                        value={datasCustomizadas[idx] || ''}
                        onChange={e => handleCustomDateChange(idx, e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* 4. Forma de Pagamento e Banco */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Forma de Pagamento
              </label>
              <select
                value={formaPagamento}
                onChange={e => setFormaPagamento(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                {FORMAS_PAGAMENTO.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Conta / Caixa de Pagamento
              </label>
              <input
                type="text"
                list="bancos-list"
                value={bancoConta}
                onChange={e => setBancoConta(e.target.value)}
                placeholder="Ex: Banco Santander, Caixa Loja..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <datalist id="bancos-list">
                {BANCOS_SUGESTOES.map(b => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div className="sm:col-span-12">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Observações
              </label>
              <textarea
                rows={2}
                placeholder="Observações complementares, contrato, chave PIX ou detalhes da despesa..."
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Rodapé / Botões */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-sm shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : modoParcelamento === 'parcelado' ? `Gerar ${parcelasCount} Parcelas` : 'Salvar Lançamento'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
