import React, { useState, useMemo } from 'react';
import { 
  Warehouse, 
  Boxes, 
  Search, 
  Plus, 
  Minus, 
  PackageCheck, 
  ArrowRight, 
  TrendingUp, 
  Building2, 
  Sparkles, 
  Eye, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Send, 
  FileSpreadsheet, 
  Layers,
  X,
  PlusCircle
} from 'lucide-react';
import { CentralStockItem, StoreConfig, FiscalConfig, Product, Supplier } from '../shared/types';

interface CentralStockPageProps {
  stockItems: CentralStockItem[];
  products: Product[];
  suppliers: Supplier[];
  stores: StoreConfig[];
  fiscalConfig: FiscalConfig;
  onUpdateStockBalance: (stockId: string, deltaUnidades: number, newLocation?: string) => void;
  onSaveNewStockItem: (item: CentralStockItem) => void;
  onGenerateStockSeparation: (itemsToTransfer: Array<{ stockItem: CentralStockItem; caixasParaSeparar: number }>) => void;
  onNavigateToSeparation: () => void;
  onDeleteStockItem?: (stockId: string) => void;
}

export const CentralStockPage: React.FC<CentralStockPageProps> = ({
  stockItems = [],
  products = [],
  suppliers = [],
  stores = [],
  fiscalConfig,
  onUpdateStockBalance,
  onSaveNewStockItem,
  onGenerateStockSeparation,
  onNavigateToSeparation,
  onDeleteStockItem
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Itens selecionados para o Romaneio de Transferência: { [stockId]: unidadesAEnviar }
  const [selectedTransferItems, setSelectedTransferItems] = useState<Record<string, number>>({});
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  
  // Modal de Ajuste / Entrada de Estoque
  const [editingStockItem, setEditingStockItem] = useState<CentralStockItem | null>(null);
  const [adjustUnidadesDelta, setAdjustUnidadesDelta] = useState<string>('0');
  const [adjustLocation, setAdjustLocation] = useState<string>('');
  
  // Modal de Novo Item no CD
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');
  const [newSaldoUnidades, setNewSaldoUnidades] = useState<string>('0');
  const [newLocationGalpao, setNewLocationGalpao] = useState<string>('');

  // Modal de Zoom de Imagem
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);

  // Lista de Categorias
  const categories = useMemo(() => {
    const set = new Set<string>();
    (stockItems || []).forEach(it => {
      if (it?.categoria) set.add(it.categoria);
    });
    return Array.from(set);
  }, [stockItems]);

  // Itens Filtrados
  const filteredStock = useMemo(() => {
    return (stockItems || []).filter(item => {
      if (!item) return false;
      const s = (searchTerm || '').toLowerCase();
      const codInt = (item.codigoInterno || item.codigo || '').toLowerCase();
      const codForn = (item.codigoFornecedor || '').toLowerCase();
      const codBarras = (item.codigoBarras || '').toLowerCase();
      const desc = (item.descricao || '').toLowerCase();
      const forn = (item.fornecedorOrigem || '').toLowerCase();
      const loc = (item.localizacaoGalpao || '').toLowerCase();

      const matchSearch = !s || codInt.includes(s) || codForn.includes(s) || codBarras.includes(s) || desc.includes(s) || forn.includes(s) || loc.includes(s);
      const matchCat = selectedCategory === 'all' || item.categoria === selectedCategory;

      return matchSearch && matchCat;
    });
  }, [stockItems, searchTerm, selectedCategory]);

  // Métricas Consolidadas (KPIs)
  const metrics = useMemo(() => {
    const list = stockItems || [];
    const totalItens = list.length;
    const totalUnidades = list.reduce((sum, item) => sum + (Number(item?.saldoUnidades) || 0), 0);
    const valorPatrimonial = list.reduce((sum, item) => sum + ((Number(item?.saldoUnidades) || 0) * (Number(item?.precoUnitario) || 0)), 0);
    const valorTotalPdv = list.reduce((sum, item) => sum + ((Number(item?.saldoUnidades) || 0) * (Number(item?.pdvSugerido) || 0)), 0);
    const itensComSaldoBaixo = list.filter(item => (Number(item?.saldoUnidades) || 0) <= 60).length;

    return {
      totalItens,
      totalUnidades,
      totalPecas: totalUnidades,
      valorPatrimonial,
      valorTotalPdv,
      lucroPotencial: valorTotalPdv - valorPatrimonial,
      itensComSaldoBaixo
    };
  }, [stockItems]);

  // Total selecionado para transferência
  const selectedCount = Object.keys(selectedTransferItems).length;
  const totalUnidadesTransferencia = Object.values(selectedTransferItems).reduce((sum, val) => sum + (Number(val) || 0), 0);
  const [selectionWarning, setSelectionWarning] = useState<string | null>(null);

  // Itens com saldo positivo que podem ser selecionados
  const selectableItems = useMemo(() => {
    return filteredStock.filter(it => (it.saldoUnidades || 0) > 0);
  }, [filteredStock]);

  const allSelected = selectableItems.length > 0 && selectableItems.every(it => selectedTransferItems[it.id] !== undefined);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedTransferItems({});
      setSelectionWarning(null);
    } else {
      const next: Record<string, number> = {};
      selectableItems.forEach(it => {
        next[it.id] = Math.min(Math.max(1, it.saldoUnidades || 1), 50);
      });
      setSelectedTransferItems(next);
      setSelectionWarning(null);
    }
  };

  // Handlers de Seleção e Transferência
  const toggleItemSelection = (item: CentralStockItem) => {
    setSelectedTransferItems(prev => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = Math.min(Math.max(1, item.saldoUnidades), 100);
      }
      return next;
    });
    setSelectionWarning(null);
  };

  const handleOpenTransferModal = () => {
    if (selectedCount === 0) {
      setSelectionWarning('Selecione ao menos 1 produto na tabela (marcando o checkbox na linha ou clicando em "+ Romaneio") para transferir às lojas.');
      return;
    }
    setSelectionWarning(null);
    setIsTransferModalOpen(true);
  };

  const handleTransferUnitsChange = (stockId: string, units: number, maxUnits: number) => {
    const validUnits = Math.max(1, Math.min(units, maxUnits));
    setSelectedTransferItems(prev => ({
      ...prev,
      [stockId]: validUnits
    }));
  };

  const handleConfirmTransferOrder = () => {
    const itemsToTransfer: Array<{ stockItem: CentralStockItem; caixasParaSeparar: number }> = [];

    Object.entries(selectedTransferItems).forEach(([stockId, units]) => {
      const stockItem = stockItems.find(s => s.id === stockId);
      if (stockItem && units > 0) {
        itemsToTransfer.push({
          stockItem,
          caixasParaSeparar: units
        });
      }
    });

    if (itemsToTransfer.length === 0) return;

    onGenerateStockSeparation(itemsToTransfer);
    setIsTransferModalOpen(false);
    setSelectedTransferItems({});
  };

  const handleSaveStockAdjustment = () => {
    if (!editingStockItem) return;
    const delta = parseInt(adjustUnidadesDelta, 10) || 0;
    onUpdateStockBalance(editingStockItem.id, delta, adjustLocation.trim() || undefined);
    setEditingStockItem(null);
  };

  const handleAddNewItemToStock = () => {
    const prod = products.find(p => p.id === selectedProductToAdd);
    if (!prod) return;

    const unidades = parseInt(newSaldoUnidades, 10) || 0;
    const codInterno = prod.codigoInterno || prod.codigo || '';
    const newItem: CentralStockItem = {
      id: 'stock_' + Date.now(),
      productId: prod.id,
      codigo: codInterno,
      codigoInterno: codInterno,
      codigoFornecedor: prod.codigoFornecedor,
      codigoBarras: prod.codigoBarras || prod.eanBarcode,
      descricao: prod.descricao,
      categoria: prod.categoria || 'Geral',
      fotoUrl: prod.fotoUrl,
      saldoUnidades: unidades,
      precoUnitario: prod.precoUnitarioPadrao || 0,
      pdvSugerido: prod.pdvSugerido || 0,
      localizacaoGalpao: newLocationGalpao.trim() || 'Depósito Geral',
      fornecedorOrigem: prod.nomeFornecedor || '',
      dataUltimaEntrada: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString()
    };

    onSaveNewStockItem(newItem);
    setIsNewItemModalOpen(false);
    setSelectedProductToAdd('');
    setNewSaldoUnidades('0');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header do Módulo do Depósito Central */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Estoque Matriz
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsNewItemModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-emerald-500" />
            <span>+ Dar Entrada / Novo Item</span>
          </button>

          {/* Botão Gerar Romaneio de Transferência - Sempre visível */}
          <button
            onClick={handleOpenTransferModal}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              selectedCount > 0
                ? 'text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30 animate-pulse hover:scale-102'
                : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
            }`}
            title={selectedCount > 0 ? "Abrir conferência do romaneio para as 20 lojas" : "Clique para gerar romaneio dos produtos selecionados"}
          >
            <Send className="w-4 h-4" />
            <span>
              {selectedCount > 0
                ? `Gerar Romaneio (${selectedCount} itens • ${totalUnidadesTransferencia.toLocaleString('pt-BR')} un)`
                : 'Gerar Romaneio de Transferência'
              }
            </span>
          </button>

          {/* Botão Fila de Separação da Doca */}
          <button
            onClick={onNavigateToSeparation}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            title="Ir para a fila de separação da Doca"
          >
            <PackageCheck className="w-4 h-4 text-teal-500" />
            <span>Ver Fila de Separação Doca</span>
          </button>
        </div>
      </div>

      {/* Alerta contextual se o usuário tentar gerar sem itens selecionados */}
      {selectionWarning && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span><strong>Atenção:</strong> {selectionWarning}</span>
          </div>
          <button 
            type="button"
            onClick={toggleSelectAll} 
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition cursor-pointer shrink-0 shadow-xs"
          >
            Selecionar Todos ({selectableItems.length})
          </button>
        </div>
      )}

      {/* 2. Cards de Métricas de Patrimônio e Volume (Formato Horizontal Limpo Conforme Imagem 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Unidades */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">SALDO UNIDADES</span>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {metrics.totalUnidades.toLocaleString('pt-BR')}
            </div>
          </div>
        </div>

        {/* Total Peças */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-teal-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-teal-500" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">TOTAL DE PEÇAS</span>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {metrics.totalPecas.toLocaleString('pt-BR')}
            </div>
          </div>
        </div>

        {/* Valor Patrimonial */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">PATRIMÔNIO (CUSTO)</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              R$ {metrics.valorPatrimonial.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Alerta de Estoque Baixo */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">ATENÇÃO / SALDO BAIXO</span>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {metrics.itensComSaldoBaixo} itens
            </div>
          </div>
        </div>

      </div>

      {/* 3. Barra de Busca & Filtros */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative min-w-[260px] sm:min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por descrição..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden font-medium"
          />
        </div>

        {/* Filtro de Categoria em Pills Arredondadas */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Todas as Categorias
          </button>
          {(categories.length > 0 ? categories : [
            'Utilidades Térmicas',
            'Vidros & Cristais',
            'Aromaterapia & Casa',
            'Decoração & Iluminação',
            'Organizadores',
            'Panelas & Assadeiras'
          ]).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Tabela de Estoque Físico do Depósito Central */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-3.5 text-center w-12">
                  <input
                    type="checkbox"
                    title={allSelected ? "Desmarcar todos os produtos" : "Selecionar todos os produtos com saldo"}
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    disabled={selectableItems.length === 0}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-2 w-14 text-center">FOTO</th>
                <th className="py-3 px-3 min-w-[120px] whitespace-nowrap">CÓD. INTERNO</th>
                <th className="py-3 px-3 min-w-[130px] whitespace-nowrap">CÓD. BARRAS (EAN)</th>
                <th className="py-3 px-3 min-w-[220px]">DESCRIÇÃO DO PRODUTO</th>
                <th className="py-3 px-3 min-w-[140px]">ENDEREÇO / GALPÃO</th>
                <th className="py-3 px-3 text-right min-w-[120px] whitespace-nowrap bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-extrabold">
                  SALDO UNIDADES
                </th>
                <th className="py-3 px-3 text-right min-w-[110px] whitespace-nowrap">CUSTO UNIT.</th>
                <th className="py-3 px-3 text-right min-w-[130px] whitespace-nowrap font-bold">VALOR TOTAL</th>
                <th className="py-3 px-3 text-center min-w-[210px] whitespace-nowrap sticky right-0 bg-slate-100 dark:bg-slate-800 shadow-sm border-l border-slate-200 dark:border-slate-700 z-10">AÇÕES</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Nenhum produto em estoque encontrado com o filtro aplicado.
                  </td>
                </tr>
              ) : (
                filteredStock.map((item) => {
                  const isSelected = selectedTransferItems[item.id] !== undefined;
                  const valorTotalItem = (item.saldoUnidades || 0) * (item.precoUnitario || 0);
                  const matchedProd = products.find(p => p.id === item.productId || (p.codigoInterno && p.codigoInterno === item.codigo) || p.codigo === item.codigo);
                  const barcode = item.codigoBarras || matchedProd?.codigoBarras || matchedProd?.eanBarcode || '';

                  return (
                    <tr 
                      key={item.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition ${
                        isSelected ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                      }`}
                    >
                      {/* Checkbox de Seleção para Romaneio */}
                      <td className="py-3 px-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItemSelection(item)}
                          disabled={(item.saldoUnidades || 0) <= 0}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Foto / Imagem */}
                      <td className="py-3 px-2 text-center">
                        {item.fotoUrl ? (
                          <img
                            src={item.fotoUrl}
                            alt={item.descricao}
                            loading="lazy"
                            decoding="async"
                            onClick={() => setZoomedImage({ url: item.fotoUrl!, title: item.descricao })}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:scale-105 transition mx-auto"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto text-[10px] font-bold">
                            SEM FOTO
                          </div>
                        )}
                      </td>

                      {/* Código Interno */}
                      <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {item.codigoInterno || item.codigo}
                      </td>

                      {/* Código de Barras (EAN) */}
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap text-[11px]">
                        {barcode ? (
                          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {barcode}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Descrição & Fornecedor */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.descricao}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{item.categoria || 'Geral'}</span>
                          {item.fornecedorOrigem && (
                            <>
                              <span>•</span>
                              <span className="truncate">{item.fornecedorOrigem}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Localização no Galpão */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="font-mono text-[11px]">{item.localizacaoGalpao || 'Geral CD'}</span>
                        </div>
                      </td>

                      {/* Saldo em Unidades */}
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20 whitespace-nowrap text-sm">
                        {(item.saldoUnidades || 0).toLocaleString('pt-BR')} un
                      </td>

                      {/* Custo Unitário */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        R$ {(item.precoUnitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Valor Total */}
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                        R$ {valorTotalItem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Ações com coluna Sticky e botão de exclusão em destaque */}
                      <td className="py-3 px-3 text-center whitespace-nowrap sticky right-0 bg-white dark:bg-slate-900 shadow-sm border-l border-slate-200/80 dark:border-slate-800 z-10">
                        <div className="flex items-center justify-center gap-1.5">
                          {onDeleteStockItem && (
                            <button
                              onClick={() => {
                                const nome = item.descricao || item.codigo || item.codigoInterno || 'este item';
                                if (window.confirm(`⚠️ Deseja realmente excluir o item "${nome}" do estoque da matriz?`)) {
                                  onDeleteStockItem(item.id);
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-sm transition flex items-center gap-1 cursor-pointer"
                              title="Excluir este item do estoque"
                            >
                              <Trash2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Excluir</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setEditingStockItem(item);
                              setAdjustUnidadesDelta('0');
                              setAdjustLocation(item.localizacaoGalpao || '');
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1 cursor-pointer"
                            title="Ajustar saldo de unidades ou localização"
                          >
                            <Edit3 className="w-3.5 h-3.5 shrink-0" />
                            <span>Ajustar</span>
                          </button>

                          <button
                            onClick={() => toggleItemSelection(item)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                            }`}
                            title={isSelected ? 'Remover do romaneio' : 'Incluir no romaneio'}
                          >
                            {isSelected ? 'Remover' : '+ Romaneio'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barra de Ação Fixa quando há produtos selecionados para Romaneio */}
      {selectedCount > 0 && (
        <div className="sticky bottom-4 z-30 bg-slate-900/95 dark:bg-slate-950/95 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-md border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black">
                {selectedCount} {selectedCount === 1 ? 'produto selecionado' : 'produtos selecionados'} para transferência
              </div>
              <div className="text-[11px] text-slate-400">
                Volume total a ratear: <strong className="text-emerald-400 font-mono">{totalUnidadesTransferencia.toLocaleString('pt-BR')} unidades</strong> entre as 20 lojas
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedTransferItems({})}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Desmarcar Todos
            </button>
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30 transition flex items-center gap-1.5 cursor-pointer hover:scale-102"
            >
              <Send className="w-4 h-4" />
              <span>Conferir e Gerar Romaneio</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. MODAL DE CONFIRMAÇÃO DO ROMANEIO DE TRANSFERÊNCIA */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Gerar Romaneio de Transferência do Depósito
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina quantas unidades de cada item serão distribuídas proporcionalmente entre as 20 lojas
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Lista de Itens Selecionados */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Produtos Selecionados ({selectedCount})
              </div>

              {Object.entries(selectedTransferItems).map(([stockId, unidades]) => {
                const item = stockItems.find(s => s.id === stockId);
                if (!item) return null;

                return (
                  <div 
                    key={stockId}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {item.fotoUrl && (
                        <img
                          src={item.fotoUrl}
                          alt={item.descricao}
                          className="w-12 h-12 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                          {item.codigo}
                        </span>
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {item.descricao}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Saldo Disponível no CD: <strong className="text-slate-700 dark:text-slate-300">{(item.saldoUnidades || 0).toLocaleString('pt-BR')} un</strong>
                        </div>
                      </div>
                    </div>

                    {/* Controle de Unidades a Transferir */}
                    <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => handleTransferUnitsChange(stockId, unidades - 10, item.saldoUnidades)}
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={item.saldoUnidades}
                          value={unidades === 0 ? '' : unidades}
                          placeholder="0"
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleTransferUnitsChange(stockId, parseInt(e.target.value, 10) || 0, item.saldoUnidades)}
                          className="w-16 text-center font-mono font-bold text-xs bg-transparent text-slate-900 dark:text-white outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleTransferUnitsChange(stockId, unidades + 10, item.saldoUnidades)}
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right min-w-[70px]">
                        <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 block">
                          {unidades} un
                        </span>
                        <span className="text-[10px] text-slate-400">Rateio lojas</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Resumo do Romaneio:</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                  {totalUnidadesTransferencia.toLocaleString('pt-BR')} unidades totais para rateio entre 20 lojas
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTransferOrder}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30 transition flex items-center gap-2 cursor-pointer hover:scale-102"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Enviar para Separação na Doca</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 6. MODAL DE AJUSTE / ENTRADA DE ESTOQUE NO CD */}
      {editingStockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Ajustar Saldo no Depósito
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {editingStockItem.codigo} • {editingStockItem.descricao}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEditingStockItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-500">Saldo Atual no CD:</span>
                <strong className="text-slate-900 dark:text-white font-mono text-sm">{(editingStockItem.saldoUnidades || 0).toLocaleString('pt-BR')} un</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Adicionar (+) ou Remover (-) Unidades:
              </label>
              <input
                type="number"
                value={adjustUnidadesDelta}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setAdjustUnidadesDelta(e.target.value)}
                placeholder="Ex: +50 para entrada ou -20 para baixa"
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Novo saldo final resultante: <strong>{Math.max(0, (editingStockItem.saldoUnidades || 0) + (parseInt(adjustUnidadesDelta, 10) || 0))} un</strong>
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Endereçamento / Posição no Galpão:
              </label>
              <input
                type="text"
                value={adjustLocation}
                onChange={(e) => setAdjustLocation(e.target.value)}
                placeholder="Ex: Rua B - Palete 14"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {onDeleteStockItem && (
                <button
                  type="button"
                  onClick={() => {
                    const nome = editingStockItem.descricao || editingStockItem.codigo || 'este item';
                    if (window.confirm(`⚠️ Deseja realmente excluir permanentemente "${nome}" do estoque?`)) {
                      onDeleteStockItem(editingStockItem.id);
                      setEditingStockItem(null);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir do Estoque</span>
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setEditingStockItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveStockAdjustment}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition cursor-pointer"
                >
                  Salvar Ajuste
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL DE NOVO ITEM NO CD (VINCULADO AO CATÁLOGO) */}
      {isNewItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Dar Entrada de Produto no CD
                  </h3>
                  <p className="text-xs text-slate-400">Vincule um produto do catálogo ao galpão</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewItemModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Selecione o Produto do Catálogo:
              </label>
              <select
                value={selectedProductToAdd}
                onChange={(e) => setSelectedProductToAdd(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium cursor-pointer"
              >
                <option value="">Selecione um produto...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.codigoInterno || p.codigo} - {p.descricao}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Quantidade Inicial de Unidades:
              </label>
              <input
                type="number"
                min="1"
                value={newSaldoUnidades}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setNewSaldoUnidades(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Localização / Posição no Galpão:
              </label>
              <input
                type="text"
                value={newLocationGalpao}
                onChange={(e) => setNewLocationGalpao(e.target.value)}
                placeholder="Ex: Rua A - Palete 01"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewItemModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedProductToAdd}
                onClick={handleAddNewItemToStock}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-xs transition cursor-pointer"
              >
                Confirmar Entrada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL DE ZOOM DE IMAGEM */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 p-2" onClick={(e) => e.stopPropagation()}>
            <img 
              src={zoomedImage.url} 
              alt={zoomedImage.title} 
              className="max-h-[65vh] w-auto mx-auto object-contain rounded-2xl" 
            />
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                {zoomedImage.title}
              </span>
              <button
                onClick={() => setZoomedImage(null)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
