import React, { useState, useRef, useEffect } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Send, 
  DollarSign, 
  Boxes, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle,
  FileSpreadsheet,
  Share2,
  Building2,
  ChevronDown,
  ChevronUp,
  Edit3,
  Copy,
  Search,
  Sparkles,
  SlidersHorizontal,
  Download,
  FileText,
  Save,
  Store,
  X,
  Package,
  Layers,
  Percent,
  Truck,
  RotateCcw
} from 'lucide-react';
import { PurchaseOrder, OrderItem, Supplier, Product, StoreConfig, FiscalConfig } from '../shared/types';
import { calculateItemFiscal } from '../shared/fiscalEngine';
import { calculateAutomaticSeparation } from '../shared/separationEngine';
import { handleCurrencyInput, formatCurrency } from '../utils/masks';

interface MobilePurchasesViewProps {
  order: PurchaseOrder;
  suppliers: Supplier[];
  products?: Product[];
  stores?: StoreConfig[];
  fiscalConfig?: FiscalConfig;
  onUpdateOrder: (order: PurchaseOrder) => void;
  onExportPDF: () => void;
  onExportExcel?: () => void;
  onSaveOrder?: () => void;
  onNewOrder?: () => void;
  onOpenSeparationModal?: (item: OrderItem) => void;
}

export const MobilePurchasesView: React.FC<MobilePurchasesViewProps> = ({
  order,
  suppliers = [],
  products = [],
  stores = [],
  fiscalConfig,
  onUpdateOrder,
  onExportPDF,
  onExportExcel,
  onSaveOrder,
  onNewOrder,
  onOpenSeparationModal
}) => {
  // Estado de controle de seções expansíveis
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [supplierSearchOpen, setSupplierSearchOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);

  // Estado do item que está sendo adicionado ou editado
  const [novoItem, setNovoItem] = useState<Partial<OrderItem>>({
    codigoInterno: '',
    codigoFornecedor: '',
    codigo: '',
    descricao: '',
    qtdTotalUnidades: 0,
    precoUnitario: 0,
    percentualDesconto: 0,
    pdvAlvo: 0,
    fotoUrl: ''
  });

  // Cálculos fiscais instantâneos do formulário
  const totalUnidadesNovo = Number(novoItem.qtdTotalUnidades) || 0;
  const precoNovo = Number(novoItem.precoUnitario) || 0;
  const descPctNovo = Number(novoItem.percentualDesconto) || 0;
  const totalBrutoNovo = totalUnidadesNovo * precoNovo;
  const totalDescNovo = totalBrutoNovo * (descPctNovo / 100);
  const totalLiquidoNovo = totalBrutoNovo - totalDescNovo;
  const precoEfetivoNovo = precoNovo * (1 - descPctNovo / 100);
  const fiscalNovo = calculateItemFiscal(
    precoEfetivoNovo, 
    Number(novoItem.pdvAlvo) || 0, 
    order.fiscalConfig
  );

  // Resumo financeiro executivo da carga completa (desconsiderando itens em ruptura)
  const activeItems = order.items.filter(i => !i.ruptura);
  const totalCaixas = activeItems.reduce((acc, i) => acc + (i.qtdPacotes || 0), 0);
  const totalUnidades = activeItems.reduce((acc, i) => acc + (i.qtdTotalUnidades || 0), 0);
  const totalBrutoCompra = activeItems.reduce((acc, i) => acc + (i.valorTotalBruto || (i.qtdTotalUnidades * i.precoUnitario) || 0), 0);
  
  const hasItemDiscounts = activeItems.some(it => (it.percentualDesconto && it.percentualDesconto > 0) || (it.valorTotalLiquido !== undefined && it.valorTotalLiquido < (it.valorTotalBruto || 0)));
  let valorDesconto = 0;
  let subtotalAposDesconto = 0;

  if (hasItemDiscounts) {
    valorDesconto = activeItems.reduce((acc, it) => {
      const b = it.valorTotalBruto || (it.qtdTotalUnidades * it.precoUnitario) || 0;
      const d = it.valorDescontoItem !== undefined ? it.valorDescontoItem : (b * ((it.percentualDesconto || 0) / 100));
      return acc + d;
    }, 0);
    subtotalAposDesconto = Math.max(0, totalBrutoCompra - valorDesconto);
  } else {
    subtotalAposDesconto = totalBrutoCompra;
  }

  const valorSt = (subtotalAposDesconto * (order.header.aliquotaSt || 0)) / 100;
  const totalCompraLiquido = subtotalAposDesconto + valorSt + (order.header.valorFreteGlobal || 0);

  const faturamentoPdvProjetado = activeItems.reduce((acc, i) => acc + (i.qtdTotalUnidades * (i.pdvAlvo || 0)), 0);
  const custoRealEfetivoTotal = activeItems.reduce((acc, i) => acc + (i.qtdTotalUnidades * (i.custoRealEfetivo || 0)), 0);
  const totalMargemBrutaReais = faturamentoPdvProjetado - custoRealEfetivoTotal - valorSt;
  const margemMediaPercentual = faturamentoPdvProjetado > 0 ? (totalMargemBrutaReais / faturamentoPdvProjetado) * 100 : 0;

  // Autocomplete de fornecedor
  const handleSelectSupplier = (sup: Supplier) => {
    onUpdateOrder({
      ...order,
      header: {
        ...order.header,
        fornecedor: sup.razaoSocial,
        supplierId: sup.id,
        vendedor: sup.vendedorPadrao || order.header.vendedor,
        contatoVendedor: sup.contatoVendedor || order.header.contatoVendedor,
        condicaoPagamento: sup.condicaoPagamentoPadrao || order.header.condicaoPagamento,
        aliquotaSt: sup.aliquotaStPadrao !== undefined ? sup.aliquotaStPadrao : order.header.aliquotaSt,
        percentualDescontoOff: 0,
        // A descrição do pedido é independente do fornecedor
        observacoesDescarga: order.header.observacoesDescarga || order.header.observacoes || '',
        observacoes: order.header.observacoes || order.header.observacoesDescarga || ''
      }
    });
    setSupplierSearchOpen(false);
  };

  // Autocomplete de produto do catálogo
  const handleSelectProduct = (prod: Product) => {
    const codInterno = prod.codigoInterno || prod.codigo || '';
    setNovoItem(prev => ({
      ...prev,
      codigoInterno: codInterno,
      codigoFornecedor: prod.codigoFornecedor || prev.codigoFornecedor,
      codigo: codInterno,
      descricao: prod.descricao,
      precoUnitario: prod.precoUnitarioPadrao || prev.precoUnitario || 0,
      pdvAlvo: prod.pdvSugerido || prev.pdvAlvo || 0,
      fotoUrl: prod.fotoUrl || prev.fotoUrl
    }));
    setShowProductSuggestions(false);
    setProductSearchTerm('');
  };

  // Produtos filtrados pela busca
  const filteredProducts = productSearchTerm.trim().length > 0 
    ? products.filter(p => {
        const s = productSearchTerm.toLowerCase();
        const desc = p.descricao.toLowerCase();
        const codInt = (p.codigoInterno || p.codigo || '').toLowerCase();
        const codForn = (p.codigoFornecedor || '').toLowerCase();
        return desc.includes(s) || codInt.includes(s) || codForn.includes(s);
      }).slice(0, 6)
    : [];

  // Salvar ou Adicionar Item
  const handleSubmitItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoItem.descricao?.trim()) return;

    const qtdTotal = Number(novoItem.qtdTotalUnidades) || 0;
    const preco = Number(novoItem.precoUnitario) || 0;
    const descPct = Number(novoItem.percentualDesconto) || 0;
    const valorBruto = qtdTotal * preco;
    const valorDesc = valorBruto * (descPct / 100);
    const valorLiquido = valorBruto - valorDesc;
    const precoEfetivo = preco * (1 - descPct / 100);
    const itemPdv = Number(novoItem.pdvAlvo) || 0;

    if (editingItemId) {
      // Atualizar item existente
      const updatedItems = order.items.map(item => {
        if (item.id !== editingItemId) return item;
        const fiscal = calculateItemFiscal(precoEfetivo, itemPdv || item.pdvAlvo || 0, order.fiscalConfig);
        
        // Recalcular separação se não for manual
        let separacao = item.separacaoLojas;
        if (!item.separacaoManual && stores.length > 0) {
          const sepRes = calculateAutomaticSeparation(qtdTotal, stores, item.qtdReservaEstoque || 0);
          separacao = sepRes.allocations;
        }

        return {
          ...item,
          codigoInterno: novoItem.codigoInterno || item.codigoInterno || novoItem.codigo || item.codigo,
          codigoFornecedor: novoItem.codigoFornecedor !== undefined ? novoItem.codigoFornecedor : item.codigoFornecedor,
          codigo: novoItem.codigoInterno || item.codigoInterno || novoItem.codigo || item.codigo,
          descricao: novoItem.descricao || item.descricao,
          fotoUrl: novoItem.fotoUrl || item.fotoUrl,
          qtdTotalUnidades: qtdTotal,
          precoUnitario: preco,
          valorTotalBruto: valorBruto,
          percentualDesconto: descPct,
          valorDescontoItem: valorDesc,
          valorTotalLiquido: valorLiquido,
          pdvAlvo: itemPdv || item.pdvAlvo || 0,
          despesasPdvUnit: fiscal.despesasPdvUnit,
          creditoIcmsUnit: fiscal.creditoIcmsUnit,
          custoRealEfetivo: fiscal.custoRealEfetivo,
          margemRealUnit: fiscal.margemRealUnit,
          margemPercentual: fiscal.margemPercentual,
          separacaoLojas: separacao
        };
      });

      onUpdateOrder({ ...order, items: updatedItems });
      setEditingItemId(null);
    } else {
      // Criar novo item
      const sepRes = stores.length > 0 ? calculateAutomaticSeparation(qtdTotal, stores, 0) : null;
      const separacao = sepRes ? sepRes.allocations : {};

      const itemFinal: OrderItem = {
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        codigo: novoItem.codigo || `PROD-${order.items.length + 1}`,
        codigoInterno: novoItem.codigoInterno || novoItem.codigo || `PROD-${order.items.length + 1}`,
        codigoFornecedor: novoItem.codigoFornecedor,
        descricao: novoItem.descricao,
        fotoUrl: novoItem.fotoUrl,
        qtdTotalUnidades: qtdTotal,
        precoUnitario: preco,
        valorTotalBruto: valorBruto,
        percentualDesconto: descPct,
        valorDescontoItem: valorDesc,
        valorTotalLiquido: valorLiquido,
        pdvAlvo: itemPdv,
        despesasPdvUnit: fiscalNovo.despesasPdvUnit,
        creditoIcmsUnit: fiscalNovo.creditoIcmsUnit,
        custoRealEfetivo: fiscalNovo.custoRealEfetivo,
        margemRealUnit: fiscalNovo.margemRealUnit,
        margemPercentual: fiscalNovo.margemPercentual,
        separacaoLojas: separacao
      };

      onUpdateOrder({
        ...order,
        items: [...order.items, itemFinal]
      });
    }

    // Resetar formulário
    setNovoItem({
      codigo: '',
      descricao: '',
      qtdTotalUnidades: 0,
      precoUnitario: 0,
      percentualDesconto: 0,
      pdvAlvo: 0,
      fotoUrl: ''
    });
  };

  // Iniciar edição de um item existente
  const handleStartEditItem = (item: OrderItem) => {
    setEditingItemId(item.id);
    setNovoItem({
      codigo: item.codigo,
      codigoInterno: item.codigoInterno,
      codigoFornecedor: item.codigoFornecedor,
      descricao: item.descricao,
      qtdTotalUnidades: item.qtdTotalUnidades,
      precoUnitario: item.precoUnitario,
      percentualDesconto: item.percentualDesconto || 0,
      pdvAlvo: item.pdvAlvo,
      fotoUrl: item.fotoUrl
    });
    window.scrollTo({ top: 250, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setNovoItem({
      codigo: '',
      descricao: '',
      qtdTotalUnidades: 120,
      precoUnitario: 5.0,
      percentualDesconto: 0,
      pdvAlvo: 12.0,
      fotoUrl: ''
    });
  };

  // Ajuste rápido de Caixas (+ / -) direto no card do item
  const handleQuickAdjustBoxes = (item: OrderItem, delta: number) => {
    const pacotes = item.qtdPacotes ?? 1;
    const porPacote = item.qtdPorPacote ?? 1;
    const novasCaixas = Math.max(1, pacotes + delta);
    if (novasCaixas === pacotes) return;

    const novasUnidades = novasCaixas * porPacote;
    const novoBruto = novasUnidades * item.precoUnitario;
    
    let separacao = item.separacaoLojas;
    if (!item.separacaoManual && stores.length > 0) {
      const sepRes = calculateAutomaticSeparation(novasUnidades, stores, item.qtdReservaEstoque || 0);
      separacao = sepRes.allocations;
    }

    const updatedItems = order.items.map(i => {
      if (i.id !== item.id) return i;
      return {
        ...i,
        qtdPacotes: novasCaixas,
        qtdTotalUnidades: novasUnidades,
        valorTotalBruto: novoBruto,
        separacaoLojas: separacao
      };
    });

    onUpdateOrder({ ...order, items: updatedItems });
  };

  const handleToggleRuptura = (itemId: string, ruptura: boolean) => {
    const updatedItems = order.items.map(i => i.id === itemId ? { ...i, ruptura } : i);
    onUpdateOrder({ ...order, items: updatedItems });
  };

  // Duplicar Item
  const handleDuplicateItem = (item: OrderItem) => {
    const duplicated: OrderItem = {
      ...item,
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      codigo: item.codigo,
      descricao: item.descricao
    };
    onUpdateOrder({
      ...order,
      items: [...order.items, duplicated]
    });
  };

  // Excluir Item
  const handleRemoveItem = (id: string) => {
    onUpdateOrder({
      ...order,
      items: order.items.filter(i => i.id !== id)
    });
    if (editingItemId === id) handleCancelEdit();
  };

  // Compartilhar via WhatsApp
  const handleShareWhatsApp = () => {
    const text = `*PEDIDO DE COMPRA - Jóia ERP*\n\n` +
      `*Nº Cotação:* ${order.header.numeroPedido}\n` +
      `*Fornecedor:* ${order.header.fornecedor || 'Não Informado'}\n` +
      `*Vendedor:* ${order.header.vendedor || 'N/A'} (${order.header.contatoVendedor || ''})\n` +
      `*Prazo:* ${order.header.condicaoPagamento || 'A Combinar'}\n` +
      `*Condição Comercial:* ${order.header.percentualDescontoOff || 0}% OFF | ST: ${order.header.aliquotaSt || 0}%\n\n` +
      `📦 *RESUMO DA CARGA:*\n` +
      `• Total de Produtos: ${order.items.length}\n` +
      `• Total de Unidades: ${totalUnidades.toLocaleString('pt-BR')} un\n` +
      `• Investimento Total: R$ ${totalCompraLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `• Margem Média Carga: ${margemMediaPercentual.toFixed(1)}%\n\n` +
      `📋 *PRODUTOS:* \n` +
      order.items.map((i, idx) => 
        `${idx + 1}. *${i.descricao}*\n` +
        `   └ ${i.qtdTotalUnidades.toLocaleString('pt-BR')} un | R$ ${i.precoUnitario.toFixed(2)}/un | Total: R$ ${i.valorTotalBruto.toFixed(2)} | PDV Alvo: R$ ${i.pdvAlvo.toFixed(2)}`
      ).join('\n\n') +
      `\n\n_Gerado pelo App Jóia ERP Mobile Compras_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-16 animate-in fade-in duration-200">
      
      {/* 1. Header Mobile com KPIs e Identidade Visual Jóia ERP */}
      <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white rounded-3xl p-5 shadow-xl space-y-4 relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

        {/* Topo do Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-white/10 text-emerald-300 backdrop-blur-xs">
              <ShoppingBag className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-200">
              Cotação Mobile • Feiras & Viagens
            </span>
          </div>
          <span className="text-xs font-mono font-bold bg-white/20 px-2.5 py-1 rounded-full text-white backdrop-blur-xs">
            {order.header.numeroPedido || 'PED-NOVO'}
          </span>
        </div>

        {/* Informações Comerciais Principais */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight text-white line-clamp-1">
              {order.header.fornecedor || 'Fornecedor não selecionado'}
            </h2>
            <button
              onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-200 transition cursor-pointer text-xs flex items-center gap-1"
            >
              <span>{isHeaderExpanded ? 'Recolher' : 'Editar Dados'}</span>
              {isHeaderExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="text-xs text-emerald-100 flex items-center gap-2 flex-wrap font-medium">
            {/* Badge de Status Oficial */}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-xs ${
              order.header.status === 'Finalizado'
                ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                : order.header.status === 'Em Separação'
                ? 'bg-purple-300 text-purple-950 border-purple-200'
                : order.header.status === 'Aprovado'
                ? 'bg-blue-300 text-blue-950 border-blue-200'
                : 'bg-amber-300 text-amber-950 border-amber-200'
            }`}>
              {order.header.status || 'Em Cotação'}
            </span>

            {order.header.status === 'Em Cotação' && (
              <button
                type="button"
                onClick={() => onUpdateOrder({ ...order, header: { ...order.header, status: 'Aprovado' } })}
                className="px-2 py-0.5 rounded-full bg-blue-500 hover:bg-blue-400 text-white font-extrabold text-[10px] shadow-xs transition cursor-pointer"
              >
                Aprovar Compra
              </button>
            )}

            {order.header.status === 'Aprovado' && (
              <button
                type="button"
                onClick={() => onUpdateOrder({ ...order, header: { ...order.header, status: 'Em Separação' } })}
                className="px-2 py-0.5 rounded-full bg-purple-500 hover:bg-purple-400 text-white font-extrabold text-[10px] shadow-xs transition cursor-pointer"
              >
                Enviar p/ Separação
              </button>
            )}

            <span className="px-2 py-0.5 rounded-md bg-white/10">
              ST: {order.header.aliquotaSt || 0}%
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/10">
              Desc: {order.header.percentualDescontoOff || 0}% OFF
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/10">
              Prazo: {order.header.condicaoPagamento || 'N/A'}
            </span>
          </div>
        </div>

        {/* Painel Expansível de Edição do Cabeçalho Comercial */}
        {isHeaderExpanded && (
          <div className="pt-3 border-t border-white/15 space-y-3 animate-in slide-in-from-top-2 duration-150">
            {/* Seletor de Fornecedores */}
            <div>
              <label className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider block mb-1">
                Fornecedor Cadastrado
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSupplierSearchOpen(!supplierSearchOpen)}
                  className="w-full p-2.5 bg-black/30 border border-white/20 rounded-xl text-left text-xs font-bold text-white flex items-center justify-between cursor-pointer"
                >
                  <span className="truncate">{order.header.fornecedor || 'Selecionar da Lista...'}</span>
                  <ChevronDown className="w-4 h-4 text-emerald-300" />
                </button>

                {supplierSearchOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl max-h-52 overflow-y-auto space-y-1">
                    {suppliers.map(sup => (
                      <button
                        key={sup.id}
                        type="button"
                        onClick={() => handleSelectSupplier(sup)}
                        className="w-full text-left p-2 rounded-xl text-xs hover:bg-emerald-600/30 text-slate-200 hover:text-white transition flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold">{sup.razaoSocial}</div>
                          <div className="text-[10px] text-slate-400">ST: {sup.aliquotaStPadrao || 0}% • {sup.condicaoPagamentoPadrao || '30/60d'}</div>
                        </div>
                        {sup.descontoOffPadrao ? (
                          <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                            {sup.descontoOffPadrao}% OFF
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Inputs rápidos de Condição e Desconto */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-emerald-200">Condição / Prazo</label>
                <input
                  type="text"
                  value={order.header.condicaoPagamento || ''}
                  onChange={(e) => onUpdateOrder({
                    ...order,
                    header: { ...order.header, condicaoPagamento: e.target.value }
                  })}
                  placeholder="ex: 30/60/90 Dias"
                  className="w-full mt-1 p-2 bg-black/30 border border-white/20 rounded-xl text-white font-medium text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-emerald-200">Desconto Comercial</label>
                <div className="w-full mt-1 p-2 bg-black/30 border border-white/20 rounded-xl text-emerald-300 font-bold text-xs flex items-center justify-between">
                  <span>Por Item</span>
                  <span className="text-[10px] text-emerald-400">Ver itens ↓</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-emerald-200">Vendedor / Representante</label>
                <input
                  type="text"
                  value={order.header.vendedor || ''}
                  onChange={(e) => onUpdateOrder({
                    ...order,
                    header: { ...order.header, vendedor: e.target.value }
                  })}
                  placeholder="Nome do vendedor"
                  className="w-full mt-1 p-2 bg-black/30 border border-white/20 rounded-xl text-white font-medium text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-emerald-200">WhatsApp Vendedor</label>
                <input
                  type="text"
                  value={order.header.contatoVendedor || ''}
                  onChange={(e) => onUpdateOrder({
                    ...order,
                    header: { ...order.header, contatoVendedor: e.target.value }
                  })}
                  placeholder="(00) 00000-0000"
                  className="w-full mt-1 p-2 bg-black/30 border border-white/20 rounded-xl text-white font-medium text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* 4 Cards de Resumo Executivo (KPIs em Tempo Real) */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/15">
          <div className="p-2.5 rounded-2xl bg-black/25 backdrop-blur-xs border border-white/10">
            <div className="text-[10px] text-emerald-300 uppercase font-bold flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Total Pedido
            </div>
            <div className="text-base font-black font-mono text-white mt-0.5">
              R$ {totalCompraLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-black/25 backdrop-blur-xs border border-white/10">
            <div className="text-[10px] text-emerald-300 uppercase font-bold flex items-center gap-1">
              <Boxes className="w-3 h-3" /> Volume Total
            </div>
            <div className="text-base font-black font-mono text-white mt-0.5">
              {totalUnidades.toLocaleString('pt-BR')} <span className="text-xs font-normal text-emerald-200">un</span>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-black/25 backdrop-blur-xs border border-white/10">
            <div className="text-[10px] text-emerald-300 uppercase font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Lucro Projetado
            </div>
            <div className="text-base font-black font-mono text-emerald-300 mt-0.5">
              R$ {totalMargemBrutaReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-black/25 backdrop-blur-xs border border-white/10 flex flex-col justify-between">
            <div className="text-[10px] text-emerald-300 uppercase font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Margem Média
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`px-2 py-0.5 rounded-lg text-xs font-black font-mono ${
                margemMediaPercentual >= 20 
                  ? 'bg-emerald-400 text-slate-950' 
                  : margemMediaPercentual > 0 
                  ? 'bg-amber-400 text-slate-950' 
                  : 'bg-rose-500 text-white'
              }`}>
                {margemMediaPercentual.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Ações Rápidas do Header */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          <button
            onClick={handleShareWhatsApp}
            className="py-2.5 px-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] rounded-xl shadow-md transition flex items-center justify-center gap-1 cursor-pointer"
            title="WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Whats</span>
          </button>

          <button
            onClick={onExportPDF}
            className="py-2.5 px-2 bg-white/20 hover:bg-white/30 text-white font-extrabold text-[11px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer backdrop-blur-xs"
            title="Baixar Romaneio PDF"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-200" />
            <span>PDF</span>
          </button>

          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="py-2.5 px-2 bg-white/20 hover:bg-white/30 text-white font-extrabold text-[11px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer backdrop-blur-xs"
              title="Baixar Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span>Excel</span>
            </button>
          )}

          {onSaveOrder && (
            <button
              onClick={onSaveOrder}
              className="py-2.5 px-2 bg-teal-500/80 hover:bg-teal-400 text-slate-950 font-extrabold text-[11px] rounded-xl shadow-md transition flex items-center justify-center gap-1 cursor-pointer"
              title="Salvar no SQLite"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Formulário Inteligente de Lançamento / Edição de Produto */}
      <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
            {editingItemId ? (
              <>
                <Edit3 className="w-4 h-4 text-amber-500" />
                <span>Editando Produto na Cotação</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-emerald-500" />
                <span>Lançar Produto na Cotação</span>
              </>
            )}
          </h3>

          {editingItemId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Cancelar
            </button>
          )}
        </div>

        {/* Busca Rápida no Catálogo de Produtos da Rede */}
        {!editingItemId && products.length > 0 && (
          <div className="relative">
            <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl">
              <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              <input
                type="text"
                value={productSearchTerm}
                onChange={(e) => {
                  setProductSearchTerm(e.target.value);
                  setShowProductSuggestions(true);
                }}
                onFocus={() => setShowProductSuggestions(true)}
                placeholder="Buscar no Catálogo Jóia ERP (descrição ou código)..."
                className="w-full text-xs bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden font-medium"
              />
              {productSearchTerm && (
                <button 
                  onClick={() => { setProductSearchTerm(''); setShowProductSuggestions(false); }}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Sugestões do Catálogo */}
            {showProductSuggestions && filteredProducts.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 shadow-xl space-y-1">
                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase">
                  Produtos Encontrados no Catálogo
                </div>
                {filteredProducts.map(prod => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleSelectProduct(prod)}
                    className="w-full text-left p-2 rounded-xl text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-800 dark:text-slate-200 transition flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-bold text-slate-900 dark:text-white truncate">{prod.descricao}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                        <span>Cód: <strong>{prod.codigo}</strong></span>
                        <span>•</span>
                        <span>Emb: <strong>{prod.qtdPorPacote} un/cx</strong></span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                        R$ {prod.precoUnitarioPadrao.toFixed(2)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmitItem} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300">Descrição do Produto</label>
            <input
              type="text"
              value={novoItem.descricao || ''}
              onChange={(e) => setNovoItem(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="ex: Pote Hermético Quadrado 1.5L"
              className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300">Quantidade Total (Unidades)</label>
            <input
              type="number"
              value={novoItem.qtdTotalUnidades === 0 ? '' : (novoItem.qtdTotalUnidades || '')}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setNovoItem(prev => ({ ...prev, qtdTotalUnidades: Number(e.target.value) }))}
              placeholder="ex: 120"
              className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Compra (R$)</label>
              <input
                type="text"
                inputMode="numeric"
                value={novoItem.precoUnitario ? formatCurrency(novoItem.precoUnitario, false) : ''}
                placeholder="0,00"
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const { value } = handleCurrencyInput(e.target.value, true);
                  setNovoItem(prev => ({ ...prev, precoUnitario: value }));
                }}
                className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Desc. (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="0"
                value={novoItem.percentualDesconto === 0 ? '' : (novoItem.percentualDesconto || '')}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setNovoItem(prev => ({ ...prev, percentualDesconto: Number(e.target.value) || 0 }))}
                className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">PDV Alvo</label>
              <div className="w-full mt-1 p-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-800 dark:text-emerald-300 font-mono font-black text-xs flex items-center justify-center shadow-2xs">
                <span>R$ 12,00</span>
              </div>
            </div>
          </div>

          {/* Termômetro de Margem Instantâneo da Linha */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 font-mono">
                Total: <b>{totalUnidadesNovo} un</b> • Custo Real: <b>R$ {fiscalNovo.custoRealEfetivo.toFixed(2)}</b>
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">
                Margem Líquida no PDV Alvo
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-black font-mono ${
              fiscalNovo.margemPercentual >= 20 
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                : fiscalNovo.margemPercentual > 0 
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' 
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
            }`}>
              {fiscalNovo.margemPercentual.toFixed(1)}%
            </span>
          </div>

          <button
            type="submit"
            className={`w-full py-3 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
              editingItemId 
                ? 'bg-amber-600 hover:bg-amber-500' 
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {editingItemId ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Alterações no Produto</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Adicionar à Cotação</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* 3. Lista de Produtos Adicionados com Ações Touch */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-emerald-500" />
            Produtos na Cotação ({order.items.length})
          </h3>
          {onNewOrder && (
            <button
              onClick={onNewOrder}
              className="text-[11px] font-bold text-slate-400 hover:text-rose-500 flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" /> Limpar / Novo
            </button>
          )}
        </div>

        {order.items.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-800/60 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 space-y-2">
            <ShoppingBag className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <div className="text-xs font-bold">Nenhum produto adicionado ainda</div>
            <div className="text-[11px]">Use o formulário acima para lançar itens na mesa do fornecedor</div>
          </div>
        ) : (
          order.items.map((item, idx) => (
            <div 
              key={item.id}
              className={`p-4 rounded-3xl border transition shadow-xs space-y-3 ${
                item.ruptura 
                  ? 'bg-rose-50/50 dark:bg-rose-950/25 border-rose-300 dark:border-rose-900' 
                  : editingItemId === item.id 
                  ? 'bg-white dark:bg-slate-800/90 border-amber-400 ring-2 ring-amber-400/20' 
                  : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700'
              }`}
            >
              {/* Linha 1: Título e Badges */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`font-extrabold text-xs line-clamp-2 ${item.ruptura ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                      {idx + 1}. {item.descricao}
                    </div>
                    {item.ruptura && (
                      <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950/90 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded shrink-0 select-none">
                        RUPTURA
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-800" title="Código Interno">
                      {item.codigoInterno || item.codigo || 'S/ CÓD'}
                    </span>
                    {item.codigoFornecedor && (
                      <span className="text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800" title="Código do Fornecedor">
                        Ref: {item.codigoFornecedor}
                      </span>
                    )}
                  </div>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black font-mono shrink-0 ${
                  (item.margemPercentual || 0) >= 20 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                    : (item.margemPercentual || 0) > 0 
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' 
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                  {(item.margemPercentual || 0).toFixed(1)}%
                </span>
              </div>

              {/* Linha 2: Indicadores de Peças, Preço e Subtotal */}
              <div className="grid grid-cols-3 gap-2 p-2 rounded-2xl bg-slate-50 dark:bg-slate-900 text-center font-mono text-xs">
                <div>
                  <div className="text-[9px] text-slate-400 uppercase font-sans">Embalagem</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{item.qtdPorPacote} un/cx</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 uppercase font-sans">Preço Compra</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">
                    R$ {item.precoUnitario.toFixed(2)}
                    {(item.percentualDesconto || 0) > 0 && (
                      <span className="text-[9px] block text-emerald-700 font-normal">(-{item.percentualDesconto}%)</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 uppercase font-sans">PDV Alvo</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">R$ {item.pdvAlvo.toFixed(2)}</div>
                </div>
              </div>

              {/* Linha 3: Ajuste Rápido de Caixas (+ / - Touch) e Subtotal */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Caixas:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickAdjustBoxes(item, -1)}
                    className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-black text-slate-700 dark:text-white flex items-center justify-center transition cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-black font-mono text-xs text-slate-900 dark:text-white">
                    {item.qtdPacotes}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuickAdjustBoxes(item, 1)}
                    className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-black text-slate-700 dark:text-white flex items-center justify-center transition cursor-pointer"
                  >
                    +
                  </button>
                  <span className="text-[11px] font-mono text-slate-400 ml-1">
                    ({item.qtdTotalUnidades} un)
                  </span>
                </div>

                <div className="text-right">
                  <div className="text-[9px] text-slate-400 uppercase">Subtotal Líquido</div>
                  <div className="text-xs font-black font-mono text-slate-900 dark:text-white">
                    R$ {(item.valorTotalLiquido !== undefined ? item.valorTotalLiquido : (item.valorTotalBruto * (1 - (item.percentualDesconto || 0) / 100))).toFixed(2)}
                  </div>
                  {(item.percentualDesconto || 0) > 0 && (
                    <div className="text-[9px] line-through text-slate-400 font-mono">
                      R$ {item.valorTotalBruto.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Linha 4: Barra de Botões Touch do Card */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs gap-2">
                <div className="flex items-center gap-2">
                  {/* Botão para Matriz de Separação das 20 Lojas */}
                  {onOpenSeparationModal && (
                    <button
                      type="button"
                      onClick={() => onOpenSeparationModal(item)}
                      className="px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>20 Lojas</span>
                    </button>
                  )}

                  {/* Toggle de Ruptura */}
                  <label 
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition select-none ${
                      item.ruptura
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                    }`}
                    title="Marcar produto em ruptura (descontado do total do pedido)"
                  >
                    <input
                      type="checkbox"
                      checked={!!item.ruptura}
                      onChange={(e) => handleToggleRuptura(item.id, e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-rose-600 focus:ring-rose-500 accent-rose-600 cursor-pointer"
                    />
                    <span>Ruptura</span>
                  </label>
                </div>

                <div className="flex items-center gap-1 ml-auto">
                  <button
                    type="button"
                    onClick={() => handleStartEditItem(item)}
                    className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition cursor-pointer"
                    title="Editar produto"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDuplicateItem(item)}
                    className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer"
                    title="Duplicar produto"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                    title="Excluir produto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
