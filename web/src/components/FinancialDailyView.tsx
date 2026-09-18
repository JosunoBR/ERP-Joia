import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Building2,
  CreditCard,
  FileText,
  Check,
  ArrowRight,
  Sparkles,
  Store,
  Layers,
  Search,
  Filter
} from 'lucide-react';
import { FinancialEntry, FinancialStatus, FinancialCategory } from '../shared/types';
import { toBrDate } from '../utils/masks';

interface FinancialDailyViewProps {
  entries: FinancialEntry[];
  selectedYear: string;
  selectedMonth: string;
  onPayEntry: (id: string) => void;
  onSelectEntry: (entry: FinancialEntry) => void;
  onDeleteEntry: (id: string) => void;
}

const CATEGORIA_BADGES: Record<FinancialCategory | string, { label: string; bg: string; text: string }> = {
  FIXO: { label: 'Fixo', bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400' },
  OPERACIONAL: { label: 'Operacional', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400' },
  PRODUTOS: { label: 'Produtos', bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400' },
  RH: { label: 'RH & Retiradas', bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400' },
  IMPOSTOS: { label: 'Impostos', bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400' },
  INVESTIMENTOS: { label: 'Investimentos', bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400' },
  OUTROS: { label: 'Outros', bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400' }
};

export const FinancialDailyView: React.FC<FinancialDailyViewProps> = ({
  entries,
  selectedYear,
  selectedMonth,
  onPayEntry,
  onSelectEntry,
  onDeleteEntry
}) => {
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  // Identificar o dia atual para destaque
  const today = new Date();
  const currentDayNum = today.getDate();
  const currentMonthStr = String(today.getMonth() + 1).padStart(2, '0');
  const currentYearStr = String(today.getFullYear());
  const todayIso = today.toISOString().substring(0, 10);
  const isCurrentMonth = selectedYear === currentYearStr && selectedMonth === currentMonthStr;

  // Agrupar entradas por Dia do Mês ou por Data Completa
  const dailyGroups = useMemo(() => {
    const groups: Record<string, {
      key: string;
      dia: number;
      dateIso: string;
      entries: FinancialEntry[];
      totalDia: number;
      pagoDia: number;
      abertoDia: number;
    }> = {};

    entries.forEach(entry => {
      const due = (entry.dataVencimento || '').substring(0, 10);
      const diaNum = due ? parseInt(due.split('-')[2], 10) : 1;
      const groupKey = selectedMonth === 'all' ? (due || 'sem_data') : String(diaNum);

      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          dia: diaNum,
          dateIso: due,
          entries: [],
          totalDia: 0,
          pagoDia: 0,
          abertoDia: 0
        };
      }

      const val = Number(entry.valor) || 0;
      groups[groupKey].entries.push(entry);
      groups[groupKey].totalDia += val;

      if (entry.status === 'Pago') {
        groups[groupKey].pagoDia += val;
      } else {
        groups[groupKey].abertoDia += val;
      }
    });

    return Object.values(groups).sort((a, b) => {
      if (selectedMonth === 'all') {
        return (a.dateIso || '').localeCompare(b.dateIso || '');
      }
      return a.dia - b.dia;
    });
  }, [entries, selectedMonth]);

  const toggleDay = (key: string) => {
    setCollapsedDays(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => setCollapsedDays({});
  const collapseAll = () => {
    const all: Record<string, boolean> = {};
    dailyGroups.forEach(g => { all[g.key] = true; });
    setCollapsedDays(all);
  };

  if (dailyGroups.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
        <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">
          Nenhum lançamento para o período selecionado
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Utilize o botão "+ Novo Lançamento ERP" ou clique em "Importar Planilha do Cliente" para carregar os dados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra de Ações Rápidas da Visão Diária */}
      <div className="flex items-center justify-between px-1">
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Mostrando <span className="font-bold text-slate-800 dark:text-slate-200">{dailyGroups.length} dias</span> com compromissos ({entries.length} lançamentos totais)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          >
            Expandir Todos
          </button>
          <button
            onClick={collapseAll}
            className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          >
            Recolher Todos
          </button>
        </div>
      </div>

      {/* Lista de Dias (Estilo Planilha de Pagamentos) */}
      <div className="space-y-3">
        {dailyGroups.map(group => {
          const isCollapsed = Boolean(collapsedDays[group.key]);
          const isToday = selectedMonth === 'all'
            ? group.dateIso === todayIso
            : (isCurrentMonth && group.dia === currentDayNum);
          const percentPago = group.totalDia > 0 ? Math.round((group.pagoDia / group.totalDia) * 100) : 0;
          const isTotalmentePago = group.abertoDia === 0 && group.totalDia > 0;

          return (
            <div
              key={group.key}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isToday
                  ? 'bg-amber-50/20 dark:bg-amber-950/20 border-amber-400/80 dark:border-amber-600 shadow-md shadow-amber-500/5'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs'
              }`}
            >
              {/* Header do Dia (Subtotal do Dia, igual na planilha do cliente) */}
              <div
                onClick={() => toggleDay(group.key)}
                className="p-3.5 sm:p-4 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold ${
                    isToday
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                      : isTotalmentePago
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                  }`}>
                    <span className="text-[10px] uppercase font-semibold leading-none opacity-80">Dia</span>
                    <span className="text-base leading-none mt-0.5">{group.dia}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {toBrDate(group.dateIso)}
                      </span>
                      {isToday && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                          HOJE
                        </span>
                      )}
                      {isTotalmentePago && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Quitado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {group.entries.length} {group.entries.length === 1 ? 'conta / parcela' : 'contas / parcelas'}
                    </p>
                  </div>
                </div>

                {/* Subtotais do Dia */}
                <div className="flex items-center gap-4 pl-12 sm:pl-0">
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Subtotal Previsto do Dia
                    </span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                      R$ {group.totalDia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {group.pagoDia > 0 && (
                    <div className="hidden md:block text-right border-l border-slate-200 dark:border-slate-700 pl-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                        Pago: R$ {group.pagoDia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {percentPago}% liquidado
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabela de Lançamentos do Dia */}
              {!isCollapsed && (
                <div className="border-t border-slate-100 dark:border-slate-700/60 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/60 dark:bg-slate-800/60 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-100 dark:border-slate-700/60">
                        <th className="py-2.5 px-4">Fornecedor / Despesa</th>
                        <th className="py-2.5 px-3">Categoria</th>
                        <th className="py-2.5 px-3">Loja / Unidade</th>
                        <th className="py-2.5 px-3">Forma Pgto</th>
                        <th className="py-2.5 px-3">NF / Doc</th>
                        <th className="py-2.5 px-3">Parcela</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-4 text-right">Valor</th>
                        <th className="py-2.5 px-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                      {group.entries.map(item => {
                        const catBadge = CATEGORIA_BADGES[item.categoria] || CATEGORIA_BADGES.OUTROS;
                        const isPaid = item.status === 'Pago';

                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors ${
                              isPaid ? 'opacity-60 bg-slate-50/30 dark:bg-slate-800/30' : ''
                            }`}
                          >
                            {/* Descrição / Favorecido */}
                            <td className="py-2.5 px-4">
                              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span className={isPaid ? 'line-through text-slate-400' : ''}>
                                  {item.descricao}
                                </span>
                              </div>
                              {item.observacao && (
                                <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                                  {item.observacao}
                                </span>
                              )}
                            </td>

                            {/* Categoria */}
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${catBadge.bg} ${catBadge.text}`}>
                                {catBadge.label}
                              </span>
                            </td>

                            {/* Loja */}
                            <td className="py-2.5 px-3">
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {item.lojaNome || item.empresa || 'ALS'}
                              </span>
                            </td>

                            {/* Forma de Pagamento */}
                            <td className="py-2.5 px-3">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-mono uppercase font-medium">
                                {item.formaPagamento}
                              </span>
                            </td>

                            {/* NF / Doc */}
                            <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                              {item.documentoRef || '—'}
                            </td>

                            {/* Parcela */}
                            <td className="py-2.5 px-3 font-mono font-medium text-amber-600 dark:text-amber-400">
                              {item.parcelaDesc || 'Única'}
                            </td>

                            {/* Status */}
                            <td className="py-2.5 px-3">
                              {isPaid ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" /> Pago
                                </span>
                              ) : item.status === 'Vence Hoje' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" /> Vence Hoje
                                </span>
                              ) : item.status === 'Em Atraso' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 inline-flex items-center gap-1">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Em Atraso
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                  A Vencer
                                </span>
                              )}
                            </td>

                            {/* Valor */}
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                              R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            {/* Ações */}
                            <td className="py-2.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {!isPaid && (
                                  <button
                                    type="button"
                                    title="Baixar / Quitar Pagamento"
                                    onClick={() => onPayEntry(item.id)}
                                    className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white transition-all"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
};
