import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  Check,
  Building2,
  CreditCard,
  Calendar,
  Sparkles,
  ArrowLeft,
  Save,
  AlertCircle
} from 'lucide-react';
import { PaymentCondition } from '../shared/types';
import {
  loadPaymentConditions,
  savePaymentCondition,
  deletePaymentCondition
} from '../utils/paymentConditionStorage';

interface PaymentConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCondition?: (condition: PaymentCondition) => void;
}

const ESPECIES_OPTIONS = [
  'Boleto',
  'Dinheiro / PIX',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Cheque',
  'Depósito / Transferência',
  'Boleto / Depósito'
];

const BANCOS_SUGESTOES = [
  'Banco Santander',
  'Caixa Interno',
  'Banco do Brasil',
  'Bradesco',
  'Itaú',
  'Nubank / Cora'
];

export const PaymentConditionsModal: React.FC<PaymentConditionsModalProps> = ({
  isOpen,
  onClose,
  onSelectCondition
}) => {
  const [conditions, setConditions] = useState<PaymentCondition[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modo de exibição: listagem ('list') ou formulário ('form')
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingCondition, setEditingCondition] = useState<PaymentCondition | null>(null);

  // Campos do formulário
  const [formDescricao, setFormDescricao] = useState('');
  const [formQtdParcelas, setFormQtdParcelas] = useState<number>(3);
  const [formParcelasDias, setFormParcelasDias] = useState<number[]>([30, 60, 90]);
  const [formEspecie, setFormEspecie] = useState('Boleto');
  const [formBanco, setFormBanco] = useState('Banco Santander');
  const [formAtivo, setFormAtivo] = useState(true);
  const [formPadrao, setFormPadrao] = useState(false);
  const [formObservacao, setFormObservacao] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Carregar dados
  const fetchConditions = async () => {
    setLoading(true);
    try {
      const list = await loadPaymentConditions(false);
      setConditions(list);
    } catch (err) {
      console.error('Erro ao buscar condições:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConditions();
      setViewMode('list');
      setEditingCondition(null);
      setFormError(null);
    }
  }, [isOpen]);

  // Atualiza a quantidade de campos na grade "Configurar Parcelas"
  const handleQtdParcelasChange = (newQtd: number) => {
    const validQtd = Math.max(1, Math.min(24, newQtd));
    setFormQtdParcelas(validQtd);

    const updated = [...formParcelasDias];
    if (updated.length < validQtd) {
      while (updated.length < validQtd) {
        const last = updated.length > 0 ? updated[updated.length - 1] : 0;
        updated.push(last + 30);
      }
    } else if (updated.length > validQtd) {
      updated.splice(validQtd);
    }
    setFormParcelasDias(updated);
  };

  const handleDiaChange = (index: number, value: string) => {
    const num = Math.max(0, parseInt(value.replace(/\D/g, ''), 10) || 0);
    const updated = [...formParcelasDias];
    updated[index] = num;
    setFormParcelasDias(updated);
  };

  // Atalhos de preenchimento rápido dos dias
  const applyQuickInterval = (step: number, startsWithZero: boolean = false) => {
    const count = formQtdParcelas;
    const newDias: number[] = [];
    let current = startsWithZero ? 0 : step;
    for (let i = 0; i < count; i++) {
      newDias.push(current);
      current += step;
    }
    setFormParcelasDias(newDias);

    // Sugere descrição automática amigável se o usuário ainda não tiver customizado
    if (!formDescricao || formDescricao.includes('Dias') || formDescricao.includes('/')) {
      const descSuggested = startsWithZero
        ? `Entrada + ${newDias.slice(1).join('/')} Dias`
        : `${newDias.join('/')} Dias`;
      setFormDescricao(descSuggested);
    }
  };

  // Abrir tela para criar novo
  const handleOpenNew = () => {
    setEditingCondition(null);
    setFormDescricao('');
    setFormQtdParcelas(3);
    setFormParcelasDias([30, 60, 90]);
    setFormEspecie('Boleto');
    setFormBanco('Banco Santander');
    setFormAtivo(true);
    setFormPadrao(false);
    setFormObservacao('');
    setFormError(null);
    setViewMode('form');
  };

  // Abrir tela para editar
  const handleOpenEdit = (cond: PaymentCondition) => {
    setEditingCondition(cond);
    setFormDescricao(cond.descricao);
    setFormQtdParcelas(cond.qtdParcelas);
    setFormParcelasDias(cond.parcelasDias && cond.parcelasDias.length > 0 ? [...cond.parcelasDias] : [30]);
    setFormEspecie(cond.especie || 'Boleto');
    setFormBanco(cond.banco || '');
    setFormAtivo(cond.ativo);
    setFormPadrao(cond.padrao || false);
    setFormObservacao(cond.observacao || '');
    setFormError(null);
    setViewMode('form');
  };

  // Salvar registro
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formDescricao.trim()) {
      setFormError('Informe a descrição da condição de pagamento.');
      return;
    }

    if (formParcelasDias.some(d => isNaN(d) || d < 0)) {
      setFormError('Todos os dias das parcelas devem ser números válidos maiores ou iguais a 0.');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<PaymentCondition> = {
        id: editingCondition ? editingCondition.id : undefined,
        descricao: formDescricao.trim(),
        qtdParcelas: formQtdParcelas,
        parcelasDias: formParcelasDias,
        especie: formEspecie,
        banco: formBanco.trim(),
        ativo: formAtivo,
        padrao: formPadrao,
        observacao: formObservacao.trim()
      };

      const saved = await savePaymentCondition(payload);
      await fetchConditions();
      setViewMode('list');

      // Se for acionado diretamente para selecionar no pedido
      if (onSelectCondition && !editingCondition) {
        onSelectCondition(saved);
      }
    } catch (err: any) {
      setFormError(err?.message || 'Erro ao salvar condição de pagamento.');
    } finally {
      setSaving(false);
    }
  };

  // Excluir
  const handleDelete = async (cond: PaymentCondition) => {
    if (cond.padrao) {
      alert('A condição padrão não pode ser excluída.');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir a condição "${cond.descricao}"?`)) {
      return;
    }

    try {
      await deletePaymentCondition(cond.id);
      await fetchConditions();
    } catch (err: any) {
      alert(err?.message || 'Erro ao excluir condição.');
    }
  };

  // Filtros
  const filteredConditions = conditions.filter((c) => {
    const matchesSearch = c.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.especie && c.especie.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.banco && c.banco.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? c.ativo : !c.ativo;

    return matchesSearch && matchesStatus;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Cabeçalho do Box */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Condições de Pagamento
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {viewMode === 'list' 
                  ? 'Cadastre e gerencie os prazos de vencimento e regras de parcelas' 
                  : (editingCondition ? `Editando: ${editingCondition.descricao}` : 'Nova Condição de Pagamento')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Box */}
        <div className="flex-1 overflow-y-auto p-6">
          {viewMode === 'list' ? (
            <div className="space-y-4">
              
              {/* Barra de Filtros & Ação Superior */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex-1 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Pesquisar por descrição, espécie ou banco..."
                      className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium shadow-2xs"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e: any) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                  >
                    <option value="all">Todas as Situações</option>
                    <option value="active">Somente Ativas</option>
                    <option value="inactive">Somente Inativas</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenNew}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Nova Condição</span>
                  </button>
                </div>
              </div>

              {/* Tabela de Listagem */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3.5 w-10 text-center" title="Situação (Ativo/Inativo)">St</th>
                      <th className="py-3 px-3.5">Descrição</th>
                      <th className="py-3 px-3.5">Espécie</th>
                      <th className="py-3 px-3.5">Banco / Conta</th>
                      <th className="py-3 px-3.5">Qtd. Parcelas & Dias</th>
                      <th className="py-3 px-3.5 text-right w-28">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Carregando condições de pagamento...
                        </td>
                      </tr>
                    ) : filteredConditions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Nenhuma condição de pagamento encontrada.
                        </td>
                      </tr>
                    ) : (
                      filteredConditions.map((cond) => (
                        <tr
                          key={cond.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition group"
                        >
                          {/* Status Dot */}
                          <td className="py-3 px-3.5 text-center">
                            <span
                              className={`inline-block w-2.5 h-2.5 rounded-full ${
                                cond.ativo ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-slate-400'
                              }`}
                              title={cond.ativo ? 'Condição Ativa' : 'Condição Inativa'}
                            />
                          </td>

                          {/* Descrição */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {cond.descricao}
                              </span>
                              {cond.padrao && (
                                <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                  PADRÃO
                                </span>
                              )}
                            </div>
                            {cond.observacao && (
                              <p className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                                {cond.observacao}
                              </p>
                            )}
                          </td>

                          {/* Espécie */}
                          <td className="py-3 px-3.5">
                            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {cond.especie || 'Boleto'}
                            </span>
                          </td>

                          {/* Banco */}
                          <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300 font-medium">
                            {cond.banco || <span className="text-slate-400">—</span>}
                          </td>

                          {/* Qtd Parcelas & Dias */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {cond.qtdParcelas}x
                              </span>
                              <span className="text-slate-500 text-[11px] font-mono">
                                ({cond.parcelasDias?.map(d => `${d}d`).join(', ') || '30d'})
                              </span>
                            </div>
                          </td>

                          {/* Ações */}
                          <td className="py-3 px-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {onSelectCondition && cond.ativo && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectCondition(cond);
                                    onClose();
                                  }}
                                  className="px-2 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 rounded-md border border-emerald-300 dark:border-emerald-800 transition"
                                  title="Usar esta condição no pedido atual"
                                >
                                  Aplicar
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenEdit(cond)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                                title="Editar condição"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(cond)}
                                disabled={cond.padrao}
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                title={cond.padrao ? 'Condição padrão não pode ser excluída' : 'Excluir condição'}
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

              {/* Rodapé da listagem */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2">
                <span>
                  Total: <strong>{conditions.length}</strong> condições ({conditions.filter(c => c.ativo).length} ativas)
                </span>
                <span className="text-[11px]">
                  💡 Clique em <strong>Aplicar</strong> para vincular a condição diretamente ao pedido.
                </span>
              </div>
            </div>
          ) : (
            /* Formulário de Cadastro / Edição */
            <form onSubmit={handleSave} className="space-y-5">
              
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Grid Principal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* 1. Descrição */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Descrição da Condição <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formDescricao}
                    onChange={(e) => setFormDescricao(e.target.value)}
                    placeholder="Ex: 30/60/90 Dias, 28/56 Dias, À Vista"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>

                {/* 2. Quantidade de Parcelas */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Qtd. Parcelas <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={formQtdParcelas}
                    onChange={(e) => handleQtdParcelasChange(parseInt(e.target.value, 10) || 1)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold font-mono outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>

                {/* 3. Espécie (Meio) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Espécie / Meio
                  </label>
                  <select
                    value={formEspecie}
                    onChange={(e) => setFormEspecie(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                  >
                    {ESPECIES_OPTIONS.map((esp) => (
                      <option key={esp} value={esp}>
                        {esp}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Banco / Conta Vinculada */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Banco / Conta Padrão
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formBanco}
                      onChange={(e) => setFormBanco(e.target.value)}
                      placeholder="Ex: Banco Santander"
                      list="bancos-sugestoes"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    />
                    <datalist id="bancos-sugestoes">
                      {BANCOS_SUGESTOES.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* 5. Toggles de Status e Padrão */}
                <div className="flex items-center gap-6 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formAtivo}
                      onChange={(e) => setFormAtivo(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Condição Ativa
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formPadrao}
                      onChange={(e) => setFormPadrao(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Definir como Padrão
                    </span>
                  </label>
                </div>

              </div>

              {/* SEÇÃO DINÂMICA: CONFIGURAR PARCELAS */}
              <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Configurar Parcelas ({formQtdParcelas} {formQtdParcelas === 1 ? 'parcela' : 'parcelas'})
                    </span>
                  </div>

                  {/* Atalhos Rápidos de Prazos */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Preenchimento:</span>
                    <button
                      type="button"
                      onClick={() => applyQuickInterval(30, false)}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 transition"
                    >
                      30/60/90...
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickInterval(28, false)}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 transition"
                    >
                      28/56...
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickInterval(15, false)}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 transition"
                    >
                      15/30/45...
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickInterval(30, true)}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 transition"
                      title="Primeira parcela à vista (0 dias) e as demais a cada 30 dias"
                    >
                      Entrada + 30...
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  Informe a quantidade de dias para cada parcela a contar a partir da data-base do pedido (ex: hoje dia 15 + 30 dias = dia 15 do próximo mês).
                </p>

                {/* Grade dos campos de cada parcela */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {formParcelasDias.map((dias, index) => (
                    <div
                      key={index}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs"
                    >
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Qtd. Dias Parc. {index + 1}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={dias}
                          onChange={(e) => handleDiaChange(index, e.target.value)}
                          placeholder="0"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold outline-hidden focus:ring-2 focus:ring-emerald-500 pr-10"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                          dias
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Observações Adicionais (Opcional)
                </label>
                <textarea
                  value={formObservacao}
                  onChange={(e) => setFormObservacao(e.target.value)}
                  placeholder="Informações complementares sobre esta condição comercial..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
              </div>

              {/* Botões de Ação do Formulário */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar</span>
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Gravando...' : 'Gravar Condição'}</span>
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};
