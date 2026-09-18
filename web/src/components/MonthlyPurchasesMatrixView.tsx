import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  Calendar, 
  Building2, 
  Layers, 
  DollarSign, 
  Sparkles, 
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  Package
} from 'lucide-react';
import { PurchaseOrder } from '../shared/types';
import { 
  buildMonthlyMatrixData, 
  formatMonthName, 
  exportMonthlyMatrixPDF, 
  MonthlyMatrixRow 
} from '../utils/monthlyMatrixPdfExporter';

interface MonthlyPurchasesMatrixViewProps {
  orders: PurchaseOrder[];
  onSelectOrder: (order: PurchaseOrder) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const MonthlyPurchasesMatrixView: React.FC<MonthlyPurchasesMatrixViewProps> = ({
  orders,
  onSelectOrder,
  showToast
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Construir a matriz com base em todos os pedidos
  const matrixData = useMemo(() => {
    return buildMonthlyMatrixData(orders);
  }, [orders]);

  // Filtrar linhas por busca
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return matrixData.rows;
    const q = searchTerm.toLowerCase();
    return matrixData.rows.filter(r => 
      r.empresa.toLowerCase().includes(q) ||
      r.pedidosList.some(p => p.toLowerCase().includes(q)) ||
      r.prazo.toLowerCase().includes(q)
    );
  }, [matrixData.rows, searchTerm]);

  // Recalcular totais para as linhas filtradas
  const filteredTotals = useMemo(() => {
    let sumValorMenor = 0;
    let sumValor12 = 0;
    let sumPc12 = 0;
    const monthSums: Record<string, number> = {};
    matrixData.sortedMonths.forEach(m => { monthSums[m] = 0; });

    filteredRows.forEach(r => {
      sumValorMenor += r.valorMenor;
      sumValor12 += r.valor12;
      sumPc12 += r.pc12;
      matrixData.sortedMonths.forEach(m => {
        monthSums[m] += (r.monthlyAmounts[m] || 0);
      });
    });

    const media12 = sumPc12 > 0 ? (sumValor12 / sumPc12) : 0;

    return {
      sumValorMenor,
      sumValor12,
      sumPc12,
      media12,
      monthSums
    };
  }, [filteredRows, matrixData.sortedMonths]);

  const handleExportPDF = () => {
    try {
      setIsExporting(true);
      exportMonthlyMatrixPDF(orders);
      showToast('Relatório PDF do Controle Mensal de Compras gerado!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao exportar PDF: ' + err.message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* 1. Header do Módulo com Título Oficial e Ação de Exportar PDF */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 flex items-center justify-center font-black text-sm shadow-2xs">
              📊
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">
              Controle Mensal de Compras
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Matriz consolidada de faturamento, volume de peças (12 Lojas) e projeção de fluxo de boletos mês a mês.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Campo de Busca Rápida */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por empresa..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          {/* Botão de Exportação para PDF */}
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-red-600 hover:bg-red-700 active:scale-98 shadow-xs transition flex items-center gap-2 cursor-pointer shrink-0"
            title="Exportar documento PDF em formato Paisagem"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Gerando...' : 'Exportar PDF'}</span>
          </button>
        </div>
      </div>

      {/* 2. Banner de Totais Executivos no Topo (Identico ao topo da planilha do cliente) */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-800">
        <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>Resumo Geral de Compras & Projeção Mensal</span>
        </div>

        {/* Grade de Cards de Totais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          
          {/* TO. MENOR (Verde) */}
          <div className="bg-emerald-950/70 border border-emerald-500/40 rounded-xl p-2.5">
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              TO. MENOR
            </div>
            <div className="text-sm sm:text-base font-black text-emerald-200 font-mono mt-0.5">
              R$ {filteredTotals.sumValorMenor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* TOTAL 12 (Amarelo) */}
          <div className="bg-amber-950/70 border border-amber-500/40 rounded-xl p-2.5">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              TOTAL 12
            </div>
            <div className="text-sm sm:text-base font-black text-amber-200 font-mono mt-0.5">
              R$ {filteredTotals.sumValor12.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* PC 12 (Peças) */}
          <div className="bg-amber-950/50 border border-amber-500/30 rounded-xl p-2.5">
            <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
              PC 12 (PEÇAS)
            </div>
            <div className="text-sm sm:text-base font-black text-white font-mono mt-0.5">
              {filteredTotals.sumPc12.toLocaleString('pt-BR')} un
            </div>
          </div>

          {/* MÉDIA 12 (Preço médio) */}
          <div className="bg-amber-950/50 border border-amber-500/30 rounded-xl p-2.5">
            <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
              MÉDIA 12
            </div>
            <div className="text-sm sm:text-base font-black text-amber-300 font-mono mt-0.5">
              R$ {filteredTotals.media12.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Colunas dos Meses */}
          {matrixData.sortedMonths.slice(0, 4).map(m => (
            <div key={m} className="bg-slate-800/90 border border-slate-700 rounded-xl p-2.5">
              <div className="text-[10px] font-bold text-slate-300 uppercase truncate">
                {formatMonthName(m)}
              </div>
              <div className="text-xs sm:text-sm font-black text-white font-mono mt-0.5">
                R$ {(filteredTotals.monthSums[m] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          ))}

        </div>
      </div>

      {/* 3. Tabela Matriz em Estilo Planilha com as Cores Autênticas */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              {/* Header Principal da Tabela */}
              <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-3.5 border-r border-slate-800 min-w-[200px]">EMPRESA</th>
                <th className="py-3 px-2.5 border-r border-slate-800 text-center w-20">NOTA</th>
                <th className="py-3 px-3 border-r border-slate-800 text-right min-w-[120px] bg-emerald-950 text-emerald-300">
                  VALOR MENOR
                </th>
                <th className="py-3 px-3 border-r border-slate-800 text-right min-w-[130px] bg-amber-950 text-amber-300">
                  VALOR 12
                </th>
                <th className="py-3 px-2.5 border-r border-slate-800 text-center min-w-[90px] bg-amber-900/60 text-amber-200">
                  PC 12
                </th>
                <th className="py-3 px-2 border-r border-slate-800 text-center w-16">ENTREGA</th>
                <th className="py-3 px-3 border-r border-slate-800 text-left min-w-[140px] bg-orange-950 text-orange-200">
                  PRAZO
                </th>
                {matrixData.sortedMonths.map(m => (
                  <th key={m} className="py-3 px-3 border-r border-slate-800 text-right min-w-[120px]">
                    {formatMonthName(m)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700 text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7 + matrixData.sortedMonths.length} className="py-12 text-center text-slate-400">
                    Nenhum pedido encontrado para o termo pesquisado.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const targetOrder = orders.find(o => row.orderIds.includes(o.header.id)) || orders[0];

                  return (
                    <tr 
                      key={row.supplierKey + '_' + idx}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition cursor-pointer group"
                      onClick={() => targetOrder && onSelectOrder(targetOrder)}
                      title="Clique para abrir detalhes do pedido deste fornecedor"
                    >
                      {/* Empresa */}
                      <td className="py-2.5 px-3.5 border-r border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 transition shrink-0" />
                          <span className="truncate">{row.empresa}</span>
                        </div>
                        {row.pedidosList.length > 1 ? (
                          <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-100 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 rounded shrink-0">
                            {row.pedidosList.length} pedidos
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                            {row.pedidosList[0] || 'S/N'}
                          </span>
                        )}
                      </td>

                      {/* NOTA (%) */}
                      <td className="py-2.5 px-2.5 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20">
                        {row.notaPercent}%
                      </td>

                      {/* VALOR MENOR (Fundo Verde Suave) */}
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100/60 dark:bg-emerald-950/40">
                        {row.valorMenor > 0 
                          ? `R$ ${row.valorMenor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                          : '-'}
                      </td>

                      {/* VALOR 12 (Fundo Amarelo Suave) */}
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-bold text-amber-900 dark:text-amber-200 bg-amber-100/70 dark:bg-amber-950/40">
                        R$ {row.valor12.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* PC 12 (Fundo Amarelo Claro) */}
                      <td className="py-2.5 px-2.5 border-r border-slate-200 dark:border-slate-700 text-center font-mono font-semibold text-slate-800 dark:text-amber-100 bg-amber-50/60 dark:bg-amber-950/20">
                        {row.pc12.toLocaleString('pt-BR')}
                      </td>

                      {/* ENTREGA */}
                      <td className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-700 text-center font-mono font-bold text-slate-600 dark:text-slate-300">
                        {row.entrega}
                      </td>

                      {/* PRAZO (Fundo Salmão / Laranja Suave) */}
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-left font-medium text-orange-950 dark:text-orange-200 bg-orange-100/60 dark:bg-orange-950/30 truncate">
                        {row.prazo}
                      </td>

                      {/* Colunas Mensais */}
                      {matrixData.sortedMonths.map(m => {
                        const val = row.monthlyAmounts[m];
                        return (
                          <td 
                            key={m} 
                            className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-slate-800 dark:text-slate-200"
                          >
                            {val && val > 0 ? (
                              <span className="font-bold text-slate-900 dark:text-white">
                                R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Linha de Totais no Rodapé */}
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                <td className="py-3 px-3.5 border-r border-slate-200 dark:border-slate-700 font-black">
                  TOTAIS GERAIS ({filteredRows.length} FORNECEDORES)
                </td>
                <td className="py-3 px-2.5 border-r border-slate-200 dark:border-slate-700 text-center">
                  -
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-black text-emerald-700 dark:text-emerald-300 bg-emerald-200/50 dark:bg-emerald-950/60">
                  R$ {filteredTotals.sumValorMenor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-black text-amber-800 dark:text-amber-300 bg-amber-200/60 dark:bg-amber-950/60">
                  R$ {filteredTotals.sumValor12.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-2.5 border-r border-slate-200 dark:border-slate-700 text-center font-mono font-black text-amber-900 dark:text-amber-200 bg-amber-100/60 dark:bg-amber-950/40">
                  {filteredTotals.sumPc12.toLocaleString('pt-BR')}
                </td>
                <td className="py-3 px-2 border-r border-slate-200 dark:border-slate-700 text-center">
                  -
                </td>
                <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-left bg-orange-200/40 dark:bg-orange-950/40 font-mono text-[11px]">
                  Média: R$ {filteredTotals.media12.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / un
                </td>
                {matrixData.sortedMonths.map(m => (
                  <td 
                    key={m} 
                    className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-right font-mono font-black text-slate-900 dark:text-white"
                  >
                    R$ {(filteredTotals.monthSums[m] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
};
