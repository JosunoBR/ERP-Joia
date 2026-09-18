import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Save, 
  Sparkles, 
  FileSpreadsheet, 
  HelpCircle,
  TrendingUp,
  AlertCircle,
  Image as ImageIcon,
  Upload,
  Eye,
  X,
  Search,
  Package,
  Building2,
  Check,
  Zap,
  ChevronDown,
  PackagePlus,
  PackageCheck,
  Link as LinkIcon,
  UploadCloud,
  CheckCircle2,
  Trash,
  SlidersHorizontal,
  RotateCcw,
  Calculator,
  Loader2
} from 'lucide-react';
import { optimizeImageFile } from '../utils/imageUtils';
import { OrderItem, OrderHeader, FiscalConfig, StoreConfig, Product, Supplier } from '../shared/types';
import { calculateItemFiscal, normalizeRateToDecimal } from '../shared/fiscalEngine';
import { calculateOrderTotals } from '../shared/orderCalculationEngine';
import { calculateAutomaticSeparation } from '../shared/separationEngine';
import { isOrderItemBlank, generateNextProductCode } from '../utils/orderItemUtils';
import { handleCurrencyInput, formatCurrency } from '../utils/masks';

interface OrderItemsTableProps {
  items: OrderItem[];
  globalFiscal: FiscalConfig;
  stores: StoreConfig[];
  products?: Product[];
  suppliers?: Supplier[];
  currentSupplierName?: string;
  currentSupplierId?: string;
  percentualDescontoOff?: number;
  orderHeader?: Partial<OrderHeader>;
  onUpdateItem: (itemId: string, updatedFields: Partial<OrderItem>) => void;
  onAddItem: (customItem?: OrderItem) => void;
  onDuplicateItem: (item: OrderItem) => void;
  onDeleteItem: (itemId: string) => void;
  onSaveProduct?: (product: Product, silent?: boolean) => void;
  onOpenFiscalModal?: (item: OrderItem) => void;
}

export type ColumnKey =
  | 'ruptura'
  | 'foto'
  | 'codigoInterno'
  | 'codigoBarras'
  | 'codigoFornecedor'
  | 'descricao'
  | 'qtdNoPacote'
  | 'qtdPacotes'
  | 'qtdTotalUnidades'
  | 'aliquotaIpi'
  | 'precoUnitario'
  | 'valorTotalLiquido'
  | 'pdvAlvo'
  | 'custoLoja'
  | 'custoFornecedor'
  | 'custoReal'
  | 'margem'
  | 'acoes';

export interface ColumnMeta {
  key: ColumnKey;
  label: string;
  thClass: string;
  title?: string;
  defaultWidth: number; // Largura padrão em pixels
  minWidth: number; // Largura mínima em pixels
}

const ALL_COLUMNS: ColumnMeta[] = [
  { key: 'ruptura', label: 'RUPTURA', thClass: 'text-center', title: 'Marcar item como Ruptura (item mantido, mas não influencia nos cálculos do pedido)', defaultWidth: 72, minWidth: 60 },
  { key: 'foto', label: 'FOTO', thClass: 'text-center', defaultWidth: 50, minWidth: 46 },
  { key: 'codigoInterno', label: 'CÓD. INTERNO', thClass: 'text-center', defaultWidth: 115, minWidth: 70 },
  { key: 'codigoBarras', label: 'CÓD. BARRAS', thClass: 'text-center', title: 'Código de Barras EAN-13', defaultWidth: 125, minWidth: 75 },
  { key: 'codigoFornecedor', label: 'REF. FÁBRICA', thClass: 'text-center', title: 'Referência de Fábrica / Cód. Fornecedor', defaultWidth: 115, minWidth: 70 },
  { key: 'descricao', label: 'DESCRIÇÃO DO ITEM', thClass: 'text-left', defaultWidth: 320, minWidth: 120 },
  { key: 'qtdNoPacote', label: 'QTD NO PAC', thClass: 'text-center', title: 'Quantidade por Embalagem (Caixa, Fardo, Display)', defaultWidth: 100, minWidth: 60 },
  { key: 'qtdPacotes', label: 'QTD DE PAC', thClass: 'text-center', title: 'Quantidade de Pacotes ou Caixas Compradas', defaultWidth: 100, minWidth: 60 },
  { key: 'qtdTotalUnidades', label: 'TOTAL PEÇAS', thClass: 'text-center', title: 'Quantidade Total de Peças (Qtd no Pac × Qtd de Pac)', defaultWidth: 110, minWidth: 65 },
  { key: 'aliquotaIpi', label: 'IPI (%)', thClass: 'text-center', title: 'Alíquota de IPI (%) informada para o item', defaultWidth: 80, minWidth: 55 },
  { key: 'precoUnitario', label: 'VALOR', thClass: 'text-right', title: 'Valor unitário do produto (R$)', defaultWidth: 95, minWidth: 60 },
  { key: 'valorTotalLiquido', label: 'TOTAL (R$)', thClass: 'text-right', defaultWidth: 115, minWidth: 65 },
  { key: 'pdvAlvo', label: 'PDV', thClass: 'text-center', defaultWidth: 75, minWidth: 48 },
  { key: 'custoLoja', label: 'CUSTO LOJA', thClass: 'text-right', title: 'Custo Total da Loja (conforme modelo da planilha)', defaultWidth: 110, minWidth: 65 },
  { key: 'custoFornecedor', label: 'CUSTO FORN.', thClass: 'text-right', title: 'Custo Real Fornecedor (Produto com Desconto Comercial + IPI + ST + Frete)', defaultWidth: 115, minWidth: 65 },
  { key: 'margem', label: 'MARGEM', thClass: 'text-center', defaultWidth: 105, minWidth: 65 },
  { key: 'acoes', label: 'AÇÕES', thClass: 'text-center', defaultWidth: 90, minWidth: 60 },
];

const ALL_COLUMNS_MAP = new Map<ColumnKey, ColumnMeta>(ALL_COLUMNS.map(c => [c.key, c]));

const EDITABLE_EXCEL_FIELDS: ColumnKey[] = [
  'codigoInterno',
  'codigoBarras',
  'codigoFornecedor',
  'descricao',
  'qtdNoPacote',
  'qtdPacotes',
  'qtdTotalUnidades',
  'aliquotaIpi',
  'precoUnitario',
  'pdvAlvo'
];

// Helper para destacar os caracteres digitados no texto
function highlightMatch(text: string, query: string) {
  if (!query || !text || query.trim().length === 0) return text;
  const cleanQ = query.trim();
  const regex = new RegExp(`(${cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === cleanQ.toLowerCase() ? (
          <mark key={i} className="bg-emerald-200 dark:bg-emerald-900/70 text-emerald-950 dark:text-emerald-200 font-extrabold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

/**
 * Normaliza uma string para comparação robusta:
 * remove acentos, converte para minúsculo e elimina sufixos jurídicos comuns.
 */
function normalizeSupplierName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(ltda|s\.?a\.?|s\/a|eireli|epp|me|ss|cia|industria|comercio|ind|com)\b\.?/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Verifica se um produto pertence ao fornecedor informado no pedido.
 * Compara por ID direto (prioritário) e por nome normalizado.
 */
function isProductFromSupplier(
  product: Product,
  targetSupplierId?: string,
  targetSupplierName?: string,
  suppliersList: Supplier[] = []
): boolean {
  const cleanTargetId = (targetSupplierId || '').trim().toLowerCase();
  const normTargetName = normalizeSupplierName(targetSupplierName || '');

  // Se nenhum fornecedor informado no pedido, exibe todos
  if (!cleanTargetId && !normTargetName) return true;

  // 1. Correspondência por supplierId (mais confiável)
  const prodSupId = (product.supplierId || '').trim().toLowerCase();
  if (cleanTargetId && prodSupId && prodSupId === cleanTargetId) return true;

  // Resolver ID alternativo via lista de fornecedores cadastrados
  if (cleanTargetId && suppliersList.length > 0) {
    const matched = suppliersList.find(s => (s.id || '').trim().toLowerCase() === cleanTargetId);
    if (matched) {
      // Checar se o produto está vinculado pelo ID ou pelos nomes cadastrados
      const matchedRazao = normalizeSupplierName(matched.razaoSocial || '');
      const matchedFantasia = normalizeSupplierName(matched.nomeFantasia || '');
      const prodNorm = normalizeSupplierName(product.nomeFornecedor || '');
      if (prodNorm && (prodNorm === matchedRazao || prodNorm === matchedFantasia)) return true;
      if (matchedRazao && prodNorm.includes(matchedRazao)) return true;
      if (matchedFantasia && prodNorm.includes(matchedFantasia)) return true;
    }
  }

  // 2. Correspondência por nome normalizado do fornecedor no produto
  if (normTargetName) {
    const prodNorm = normalizeSupplierName(product.nomeFornecedor || '');
    if (prodNorm && (prodNorm === normTargetName || prodNorm.includes(normTargetName) || normTargetName.includes(prodNorm))) return true;
  }

  return false;
}

export const OrderItemsTable: React.FC<OrderItemsTableProps> = ({
  items,
  globalFiscal,
  stores,
  products = [],
  suppliers = [],
  currentSupplierName,
  currentSupplierId,
  percentualDescontoOff = 0,
  orderHeader,
  onUpdateItem,
  onAddItem,
  onDuplicateItem,
  onDeleteItem,
  onSaveProduct,
  onOpenFiscalModal
}) => {
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);
  const [isCatalogPickerOpen, setIsCatalogPickerOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  
  // Estado do Modal Especializado de Foto
  const [photoModalItem, setPhotoModalItem] = useState<OrderItem | null>(null);
  const [photoTab, setPhotoTab] = useState<'upload' | 'url'>('upload');
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  // Estado do Filtro Inteligente / Autocomplete nas Linhas da Tabela
  const [activeAutocompleteItemId, setActiveAutocompleteItemId] = useState<string | null>(null);
  const [activeAutocompleteField, setActiveAutocompleteField] = useState<'descricao' | 'codigoInterno' | 'codigoFornecedor' | null>(null);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number; width: number; isFlipped: boolean } | null>(null);

  // Estado da Barra de Inclusão Rápida Superior
  const [quickSearchText, setQuickSearchText] = useState('');
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const quickSearchInputRef = useRef<HTMLInputElement>(null);

  // Estado para controlar digitação da coluna de preço garantindo sempre 2 casas decimais (R$)
  const [editingPriceMap, setEditingPriceMap] = useState<Record<string, string>>({});
  // Estado para digitação livre do campo PDV com limpeza ao focar
  const [editingPdvMap, setEditingPdvMap] = useState<Record<string, string>>({});

  // Estado para visibilidade e ordem das colunas (Personalização do Usuário)
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(() => {
    try {
      const saved = localStorage.getItem('mega12_order_columns_order');
      if (saved) {
        const parsed: ColumnKey[] = JSON.parse(saved);
        const validKeys = ALL_COLUMNS.map(c => c.key);
        const filtered = parsed.filter(k => validKeys.includes(k));
        validKeys.forEach(k => {
          if (!filtered.includes(k)) filtered.push(k);
        });
        // Garantir que a coluna de Ruptura fique no início visível da tabela
        const rIdx = filtered.indexOf('ruptura');
        if (rIdx > 1) {
          filtered.splice(rIdx, 1);
          filtered.unshift('ruptura');
        } else if (rIdx === -1) {
          filtered.unshift('ruptura');
        }
        // Garantir que a coluna de IPI fique logo antes do VALOR (precoUnitario)
        const ipiPos = filtered.indexOf('aliquotaIpi');
        const precoPos = filtered.indexOf('precoUnitario');
        if (precoPos !== -1) {
          if (ipiPos === -1) {
            filtered.splice(precoPos, 0, 'aliquotaIpi');
          } else if (ipiPos !== precoPos - 1) {
            filtered.splice(ipiPos, 1);
            const newPrecoPos = filtered.indexOf('precoUnitario');
            filtered.splice(newPrecoPos, 0, 'aliquotaIpi');
          }
        }
        return filtered;
      }
    } catch (e) {}
    return ALL_COLUMNS.map(c => c.key);
  });

  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem('mega12_order_columns_visibility');
      if (saved) {
        const parsed = JSON.parse(saved);
        ALL_COLUMNS.forEach(c => {
          if (parsed[c.key] === undefined) parsed[c.key] = true;
        });
        return parsed;
      }
    } catch (e) {}
    const initial: Record<string, boolean> = {};
    ALL_COLUMNS.forEach(c => { initial[c.key] = true; });
    return initial as Record<ColumnKey, boolean>;
  });

  // Estado para larguras das colunas (Redimensionamento individual)
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(() => {
    try {
      const saved = localStorage.getItem('mega12_order_columns_widths');
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged: Record<string, number> = {};
        ALL_COLUMNS.forEach(c => {
          const loaded = typeof parsed[c.key] === 'number' ? parsed[c.key] : c.defaultWidth;
          merged[c.key] = Math.max(c.minWidth || 60, loaded);
        });
        return merged as Record<ColumnKey, number>;
      }
    } catch (e) {}
    const initial: Record<string, number> = {};
    ALL_COLUMNS.forEach(c => { initial[c.key] = c.defaultWidth; });
    return initial as Record<ColumnKey, number>;
  });

  // Referência para redimensionamento de coluna
  const resizingColumnRef = useRef<{
    key: ColumnKey;
    startX: number;
    startWidth: number;
    minWidth: number;
  } | null>(null);

  const [resizingColKey, setResizingColKey] = useState<ColumnKey | null>(null);
  const [isHoveringResize, setIsHoveringResize] = useState(false);

  const [isColumnsDropdownOpen, setIsColumnsDropdownOpen] = useState(false);
  const [columnsCoords, setColumnsCoords] = useState<{ top: number; left: number } | null>(null);
  const columnsDropdownRef = useRef<HTMLDivElement>(null);
  const columnsButtonRef = useRef<HTMLButtonElement>(null);

  const updateColumnsPosition = () => {
    if (!columnsButtonRef.current) return;
    const rect = columnsButtonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const isFlipped = spaceBelow < 320 && rect.top > 320;
    setColumnsCoords({
      top: isFlipped ? Math.max(10, rect.top - 330) : rect.bottom + 6,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 280))
    });
  };

  // Drag and drop states
  const [draggedColumn, setDraggedColumn] = useState<ColumnKey | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnKey | null>(null);
  const isDraggingRef = useRef(false);

  const fileInputRef = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const activeInputRef = useRef<HTMLInputElement | null>(null);
  const autocompletePortalRef = useRef<HTMLDivElement | null>(null);

  const updateDropdownPosition = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const isFlipped = spaceBelow < 280 && rect.top > 280;
    setDropdownCoords({
      top: isFlipped ? rect.top - 6 : rect.bottom + 6,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 460)),
      width: Math.max(400, rect.width),
      isFlipped
    });
  };

  // Fechar dropdowns ao clicar fora e reposicionar no scroll/resize
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        autocompletePortalRef.current &&
        !autocompletePortalRef.current.contains(target) &&
        activeInputRef.current &&
        !activeInputRef.current.contains(target)
      ) {
        setActiveAutocompleteItemId(null);
      }

      if (
        columnsDropdownRef.current &&
        !columnsDropdownRef.current.contains(target) &&
        columnsButtonRef.current &&
        !columnsButtonRef.current.contains(target)
      ) {
        setIsColumnsDropdownOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      if (activeInputRef.current && activeAutocompleteItemId) {
        updateDropdownPosition(activeInputRef.current);
      }
      if (isColumnsDropdownOpen) {
        updateColumnsPosition();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activeAutocompleteItemId, isColumnsDropdownOpen]);

  // Produtos filtrados para o autocomplete ativo na linha (apenas do fornecedor do pedido)
  const matchingProductsForRow = useMemo(() => {
    if (!autocompleteQuery || autocompleteQuery.trim().length === 0) return [];
    const q = autocompleteQuery.trim().toLowerCase();

    // Filtra estritamente pelo fornecedor informado no pedido
    const supplierProducts = products.filter(p => 
      isProductFromSupplier(p, currentSupplierId, currentSupplierName, suppliers)
    );

    return supplierProducts.filter(p => {
      const desc = (p.descricao || '').toLowerCase();
      const codInt = (p.codigoInterno || p.codigo || '').toLowerCase();
      const codForn = (p.codigoFornecedor || '').toLowerCase();
      const ean = (p.codigoBarras || p.eanBarcode || '').toLowerCase();
      const cat = (p.categoria || '').toLowerCase();
      return desc.includes(q) || codInt.includes(q) || codForn.includes(q) || ean.includes(q) || cat.includes(q);
    }).slice(0, 8);
  }, [products, autocompleteQuery, currentSupplierId, currentSupplierName, suppliers]);

  // Produtos filtrados para a Barra de Inclusão Rápida Superior (apenas do fornecedor do pedido)
  const matchingProductsForQuickBar = useMemo(() => {
    if (!quickSearchText || quickSearchText.trim().length === 0) return [];
    const q = quickSearchText.trim().toLowerCase();

    // Filtra estritamente pelo fornecedor informado no pedido
    const supplierProducts = products.filter(p => 
      isProductFromSupplier(p, currentSupplierId, currentSupplierName, suppliers)
    );

    return supplierProducts.filter(p => {
      const desc = (p.descricao || '').toLowerCase();
      const codInt = (p.codigoInterno || p.codigo || '').toLowerCase();
      const codForn = (p.codigoFornecedor || '').toLowerCase();
      const ean = (p.codigoBarras || p.eanBarcode || '').toLowerCase();
      const cat = (p.categoria || '').toLowerCase();
      return desc.includes(q) || codInt.includes(q) || codForn.includes(q) || ean.includes(q) || cat.includes(q);
    }).slice(0, 8);
  }, [products, quickSearchText, currentSupplierId, currentSupplierName, suppliers]);

  // Inserir novo produto selecionado do catálogo
  const handleSelectProductForNewItem = (prod: Product) => {
    const codInterno = prod.codigoInterno || prod.codigo || '';
    const codFornecedor = prod.codigoFornecedor || '';
    const preco = prod.precoUnitarioPadrao || 0;
    const qtdTotal = 100;
    const totalBruto = qtdTotal * preco;
    const descPct = Math.max(0, Math.min(100, percentualDescontoOff || 0));
    const valorDesc = Number((totalBruto * (descPct / 100)).toFixed(2));
    const valorLiquido = Number((totalBruto - valorDesc).toFixed(2));
    const precoEfetivo = preco * (1 - descPct / 100);
    const defaultGlobalIpiPct = normalizeRateToDecimal(globalFiscal?.ipiAliquota) * 100;
    const ipiPct = (prod as any).aliquotaIpi !== undefined && (prod as any).aliquotaIpi !== null
      ? Number((prod as any).aliquotaIpi)
      : ((prod as any).ipi !== undefined && (prod as any).ipi !== null ? Number((prod as any).ipi) : defaultGlobalIpiPct);
    const valorIpi = Number((valorLiquido * (ipiPct / 100)).toFixed(2));
    const ipiUnit = qtdTotal > 0 ? Number((valorIpi / qtdTotal).toFixed(4)) : 0;

    const defaultItem: OrderItem = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      codigoInterno: codInterno,
      codigoFornecedor: codFornecedor,
      codigoBarras: prod.codigoBarras || prod.eanBarcode || '',
      codigo: codInterno,
      descricao: prod.descricao,
      fotoUrl: prod.fotoUrl || '',
      qtdTotalUnidades: qtdTotal,
      aliquotaIpi: ipiPct,
      valorIpi: valorIpi,
      ipiUnitario: ipiUnit,
      precoUnitario: preco,
      valorTotalBruto: totalBruto,
      percentualDesconto: descPct,
      valorDescontoItem: valorDesc,
      valorTotalLiquido: valorLiquido,
      pdvAlvo: 12.00
    };

    const fiscal = calculateItemFiscal(precoEfetivo, 12.00, globalFiscal);
    const separation = calculateAutomaticSeparation(defaultItem.qtdTotalUnidades, stores);

    const fullItem: OrderItem = {
      ...defaultItem,
      custoLoja: fiscal.custoLoja,
      custoFornecedor: fiscal.custoFornecedor,
      despesasPdvUnit: fiscal.despesasPdvUnit,
      creditoIcmsUnit: fiscal.creditoIcmsUnit,
      custoRealEfetivo: fiscal.custoRealEfetivo,
      margemRealUnit: fiscal.margemRealUnit,
      margemPercentual: fiscal.margemPercentual,
      separacaoLojas: separation.allocations,
      qtdReservaEstoque: separation.reserveStock
    };

    onAddItem(fullItem);
    // Permite que o catálogo continue aberto para ir adicionando outros itens sem fechar
    setQuickSearchText('');
    setIsQuickSearchOpen(false);
  };

  // Preencher linha existente com o produto selecionado no autocomplete inteligente
  const handleSelectProductForExistingItem = (item: OrderItem, prod: Product) => {
    const codInterno = prod.codigoInterno || prod.codigo || item.codigoInterno || item.codigo || '';
    const codFornecedor = prod.codigoFornecedor || item.codigoFornecedor || '';
    const preco = prod.precoUnitarioPadrao || item.precoUnitario || 0;
    const pdv = prod.pdvSugerido || item.pdvAlvo || 0;
    const qtdTotal = item.qtdTotalUnidades || 0;
    const descPct = (item.percentualDesconto !== undefined && item.percentualDesconto > 0) 
      ? item.percentualDesconto 
      : Math.max(0, Math.min(100, percentualDescontoOff || 0));
    const totalBruto = qtdTotal * preco;
    const valorDesc = Number((totalBruto * (descPct / 100)).toFixed(2));
    const totalLiquido = Number((totalBruto - valorDesc).toFixed(2));
    const precoEfetivo = preco * (1 - descPct / 100);
    const defaultGlobalIpiPct = normalizeRateToDecimal(globalFiscal?.ipiAliquota) * 100;

    const ipiPct = (item.aliquotaIpi !== undefined && item.aliquotaIpi !== null && item.aliquotaIpi > 0)
      ? item.aliquotaIpi
      : ((prod as any).aliquotaIpi !== undefined && (prod as any).aliquotaIpi !== null
          ? Number((prod as any).aliquotaIpi)
          : ((prod as any).ipi !== undefined && (prod as any).ipi !== null
              ? Number((prod as any).ipi)
              : defaultGlobalIpiPct));
    const valorIpi = Number((totalLiquido * (ipiPct / 100)).toFixed(2));
    const ipiUnit = qtdTotal > 0 ? Number((valorIpi / qtdTotal).toFixed(4)) : 0;

    const fiscal = calculateItemFiscal(precoEfetivo, pdv, globalFiscal, item.fiscalOverride);
    const separation = !item.separacaoManual 
      ? calculateAutomaticSeparation(qtdTotal, stores, item.qtdReservaEstoque || 0)
      : null;

    const updatedItem: OrderItem = {
      ...item,
      codigoInterno: codInterno,
      codigoFornecedor: codFornecedor,
      codigoBarras: prod.codigoBarras || prod.eanBarcode || item.codigoBarras || '',
      codigo: codInterno,
      descricao: prod.descricao,
      fotoUrl: prod.fotoUrl || item.fotoUrl || '',
      qtdTotalUnidades: qtdTotal,
      aliquotaIpi: ipiPct,
      valorIpi: valorIpi,
      ipiUnitario: ipiUnit,
      precoUnitario: preco,
      valorTotalBruto: totalBruto,
      percentualDesconto: descPct,
      valorDescontoItem: valorDesc,
      valorTotalLiquido: totalLiquido,
      pdvAlvo: pdv,
      custoLoja: fiscal.custoLoja,
      custoFornecedor: fiscal.custoFornecedor,
      despesasPdvUnit: fiscal.despesasPdvUnit,
      creditoIcmsUnit: fiscal.creditoIcmsUnit,
      custoRealEfetivo: fiscal.custoRealEfetivo,
      margemRealUnit: fiscal.margemRealUnit,
      margemPercentual: fiscal.margemPercentual,
      ...(separation ? { separacaoLojas: separation.allocations, qtdReservaEstoque: separation.reserveStock } : {})
    };

    onUpdateItem(item.id, updatedItem);
    setActiveAutocompleteItemId(null);
    setActiveAutocompleteField(null);
    setAutocompleteQuery('');
  };

  // Mapa indexado de produtos para busca instantânea O(1) em vez de varredura O(N*M)
  const catalogLookup = useMemo(() => {
    const byCode = new Map<string, Product>();
    const byDesc = new Map<string, Product>();
    if (!products || products.length === 0) return { byCode, byDesc };
    for (const p of products) {
      const cInt = (p.codigoInterno || '').trim().toLowerCase();
      if (cInt) byCode.set(cInt, p);
      const c = (p.codigo || '').trim().toLowerCase();
      if (c) byCode.set(c, p);
      const cForn = (p.codigoFornecedor || '').trim().toLowerCase();
      if (cForn) byCode.set(cForn, p);
      const desc = (p.descricao || '').trim().toLowerCase();
      if (desc) byDesc.set(desc, p);
    }
    return { byCode, byDesc };
  }, [products]);

  // Encontra produto no catálogo correspondente ao item em O(1)
  const findCatalogProduct = (item: OrderItem): Product | undefined => {
    const codInt = (item.codigoInterno || item.codigo || '').trim().toLowerCase();
    if (codInt && catalogLookup.byCode.has(codInt)) return catalogLookup.byCode.get(codInt);
    const codForn = (item.codigoFornecedor || '').trim().toLowerCase();
    if (codForn && catalogLookup.byCode.has(codForn)) return catalogLookup.byCode.get(codForn);
    const desc = (item.descricao || '').trim().toLowerCase();
    if (desc && catalogLookup.byDesc.has(desc)) return catalogLookup.byDesc.get(desc);
    return undefined;
  };

  // Cadastro rápido do produto no catálogo direto da linha do pedido
  const handleQuickRegisterProduct = (item: OrderItem, silent: boolean = false) => {
    if (!item.descricao || item.descricao.trim().length === 0) {
      return;
    }
    if (!onSaveProduct) return;

    const existing = findCatalogProduct(item);
    const codInterno = item.codigoInterno || item.codigo || existing?.codigoInterno || generateNextProductCode(products, items);

    const prodToSave: Product = {
      id: existing?.id || ('prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
      codigoInterno: codInterno,
      codigo: codInterno,
      codigoFornecedor: item.codigoFornecedor || existing?.codigoFornecedor || '',
      codigoBarras: existing?.codigoBarras || '',
      eanBarcode: existing?.codigoBarras || '',
      descricao: item.descricao.trim(),
      categoria: existing?.categoria || 'Geral',
      fotoUrl: item.fotoUrl || existing?.fotoUrl || '',
      qtdPorPacote: item.qtdNoPacote || item.qtdPorPacote || existing?.qtdPorPacote || 1,
      precoUnitarioPadrao: item.precoUnitario > 0 ? item.precoUnitario : (existing?.precoUnitarioPadrao || 0),
      pdvSugerido: item.pdvAlvo || existing?.pdvSugerido || 0,
      ncm: existing?.ncm || '',
      supplierId: currentSupplierId || existing?.supplierId || '',
      nomeFornecedor: currentSupplierName || existing?.nomeFornecedor || '',
      ativo: true,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveProduct(prodToSave, silent);

    // Se o item não tinha código interno, atualiza o item com o código gerado
    if (!item.codigoInterno || !item.codigo) {
      onUpdateItem(item.id, {
        ...item,
        codigoInterno: codInterno,
        codigo: codInterno
      });
    }
  };

  // Abrir Modal Especializado de Foto
  const handleOpenPhotoModal = (item: OrderItem) => {
    setPhotoModalItem(item);
    setPhotoPreview(item.fotoUrl || null);
    setPhotoUrlInput(item.fotoUrl && item.fotoUrl.startsWith('http') ? item.fotoUrl : '');
    setPhotoTab('upload');
  };

  // Salvar foto do modal no item do pedido e sincronizar com o Catálogo de Produtos
  const handleSavePhotoFromModal = () => {
    if (!photoModalItem) return;
    const finalPhoto = photoPreview || '';

    // Atualiza na linha do pedido
    onUpdateItem(photoModalItem.id, {
      ...photoModalItem,
      fotoUrl: finalPhoto || undefined
    });

    // Se houver onSaveProduct e descrição preenchida, sincroniza no Catálogo de Produtos
    if (onSaveProduct && photoModalItem.descricao && photoModalItem.descricao.trim().length > 0) {
      const existing = findCatalogProduct(photoModalItem);
      const codInterno = photoModalItem.codigoInterno || photoModalItem.codigo || existing?.codigoInterno || `PROD-${Date.now().toString().slice(-4)}`;

      const prodToSave: Product = {
        id: existing?.id || ('prod_' + Date.now()),
        codigoInterno: codInterno,
        codigo: codInterno,
        codigoFornecedor: photoModalItem.codigoFornecedor || existing?.codigoFornecedor || '',
        codigoBarras: existing?.codigoBarras || '',
        eanBarcode: existing?.codigoBarras || '',
        descricao: photoModalItem.descricao.trim(),
        categoria: existing?.categoria || 'Geral',
        fotoUrl: finalPhoto,
        qtdPorPacote: photoModalItem.qtdNoPacote || photoModalItem.qtdPorPacote || existing?.qtdPorPacote || 1,
        precoUnitarioPadrao: photoModalItem.precoUnitario > 0 ? photoModalItem.precoUnitario : (existing?.precoUnitarioPadrao || 0),
        pdvSugerido: photoModalItem.pdvAlvo || existing?.pdvSugerido || 0,
        ncm: existing?.ncm || '',
        supplierId: currentSupplierId || existing?.supplierId || '',
        nomeFornecedor: currentSupplierName || existing?.nomeFornecedor || '',
        ativo: true,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      onSaveProduct(prodToSave);
    }

    setPhotoModalItem(null);
  };

  // Remover foto no modal
  const handleRemovePhotoFromModal = () => {
    setPhotoPreview(null);
    setPhotoUrlInput('');
  };

  // Processamento e otimização de arquivo de imagem (redimensiona fotos mantendo alta qualidade e peso leve)
  const processImageFile = async (file: File) => {
    if (!file) return;
    setIsProcessingPhoto(true);
    try {
      const optimizedBase64 = await optimizeImageFile(file, 1200, 1200, 0.88);
      if (optimizedBase64) {
        setPhotoPreview(optimizedBase64);
        setPhotoTab('upload');
      }
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  // Upload de arquivo dentro do modal (via seletor de arquivo)
  const handleFileSelectedInModal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
    e.target.value = '';
  };

  // Handlers de arrastar e soltar (Drag & Drop)
  const handlePhotoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    setIsDraggingPhoto(true);
  };

  const handlePhotoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingPhoto(false);
  };

  const handlePhotoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(false);

    // 1. Arquivo de imagem arrastado direto do computador / explorador de arquivos
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(file.name)) {
        processImageFile(file);
        return;
      }
    }

    // 2. Link / URL de imagem arrastado da web ou texto
    const textData = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text');
    if (textData && textData.trim().length > 0) {
      const trimmed = textData.trim();
      setPhotoUrlInput(trimmed);
      setPhotoPreview(trimmed);
      setPhotoTab('url');
    }
  };

  const handleFieldChange = (item: OrderItem, field: keyof OrderItem, rawValue: any) => {
    let value = rawValue;
    if (['qtdNoPacote', 'qtdPacotes', 'qtdTotalUnidades', 'precoUnitario', 'percentualDesconto', 'pdvAlvo', 'aliquotaIpi'].includes(field as string)) {
      const sanitized = typeof rawValue === 'string' ? rawValue.replace(',', '.') : rawValue;
      value = parseFloat(sanitized) || 0;
      if (field === 'percentualDesconto' || field === 'aliquotaIpi') {
        value = Math.max(0, Math.min(100, value));
      }
    }

    const updatedItem = { ...item, [field]: value };

    // Auto-cálculo de embalagem e peças totais:
    if (field === 'qtdNoPacote' || field === 'qtdPacotes') {
      const pacNo = field === 'qtdNoPacote' ? Number(value) : (updatedItem.qtdNoPacote !== undefined ? updatedItem.qtdNoPacote : (updatedItem.qtdPorPacote || 1));
      const pacQtd = field === 'qtdPacotes' ? Number(value) : (updatedItem.qtdPacotes || 0);
      updatedItem.qtdTotalUnidades = pacNo * pacQtd;
    } else if (field === 'qtdTotalUnidades') {
      const total = Number(value);
      const pacNo = updatedItem.qtdNoPacote || updatedItem.qtdPorPacote || 1;
      if (pacNo > 1) {
        updatedItem.qtdPacotes = Math.floor(total / pacNo);
      } else {
        updatedItem.qtdPacotes = total;
      }
    }

    const qtd = updatedItem.qtdTotalUnidades || 0;
    const precoBruto = field === 'precoUnitario' ? Number(value) : (updatedItem.precoUnitario || 0);
    const descPct = field === 'percentualDesconto' 
      ? Number(value) 
      : ((updatedItem.percentualDesconto !== undefined && updatedItem.percentualDesconto > 0) 
          ? updatedItem.percentualDesconto 
          : Math.max(0, Math.min(100, percentualDescontoOff || 0)));

    const valorBruto = qtd * precoBruto;
    const valorDesc = Number((valorBruto * (descPct / 100)).toFixed(2));
    const valorLiquido = Number((valorBruto - valorDesc).toFixed(2));

    updatedItem.valorTotalBruto = valorBruto;
    updatedItem.percentualDesconto = descPct;
    updatedItem.valorDescontoItem = valorDesc;
    updatedItem.valorTotalLiquido = valorLiquido;

    // Cálculo do IPI do item respeitando a alíquota global do pedido
    const defaultGlobalIpiPct = normalizeRateToDecimal(globalFiscal?.ipiAliquota) * 100;
    const ipiPct = field === 'aliquotaIpi' 
      ? Number(value) 
      : (updatedItem.aliquotaIpi !== undefined && updatedItem.aliquotaIpi !== null && updatedItem.aliquotaIpi > 0
          ? updatedItem.aliquotaIpi 
          : (updatedItem.fiscalOverride?.useCustomFiscal && updatedItem.fiscalOverride?.ipiAliquota !== undefined
              ? updatedItem.fiscalOverride.ipiAliquota 
              : defaultGlobalIpiPct));
    const valorIpi = Number((valorLiquido * (ipiPct / 100)).toFixed(2));
    const ipiUnit = qtd > 0 ? Number((valorIpi / qtd).toFixed(4)) : 0;
    updatedItem.aliquotaIpi = ipiPct;
    updatedItem.valorIpi = valorIpi;
    updatedItem.ipiUnitario = ipiUnit;

    // Recalcula o rateio das lojas se a quantidade mudar
    if (['qtdTotalUnidades', 'qtdNoPacote', 'qtdPacotes'].includes(field as string)) {
      const newTotal = Number(updatedItem.qtdTotalUnidades) || 0;
      if (!updatedItem.separacaoManual) {
        const autoSep = calculateAutomaticSeparation(newTotal, stores, updatedItem.qtdReservaEstoque || 0);
        updatedItem.separacaoLojas = autoSep.allocations;
        updatedItem.qtdReservaEstoque = autoSep.reserveStock;
      } else if (updatedItem.separacaoLojas) {
        // Se a separação for manual mas o novo total for menor que o alocado,
        // ajusta proporcionalmente para nunca ultrapassar a quantidade real comprada
        const currentSum = Object.values(updatedItem.separacaoLojas).reduce((a, b) => a + (Number(b) || 0), 0);
        if (currentSum > newTotal && newTotal >= 0) {
          const adjustedAllocations: Record<string, number> = {};
          let allocatedSoFar = 0;
          const storeIds = Object.keys(updatedItem.separacaoLojas);
          storeIds.forEach((sId, idx) => {
            const currentVal = Number(updatedItem.separacaoLojas![sId]) || 0;
            if (idx === storeIds.length - 1) {
              adjustedAllocations[sId] = Math.max(0, newTotal - allocatedSoFar);
            } else {
              const share = currentSum > 0 ? Math.floor((currentVal / currentSum) * newTotal) : 0;
              adjustedAllocations[sId] = share;
              allocatedSoFar += share;
            }
          });
          updatedItem.separacaoLojas = adjustedAllocations;
          updatedItem.qtdReservaEstoque = 0;
        } else {
          updatedItem.qtdReservaEstoque = Math.max(0, newTotal - currentSum);
        }
      }
    }

    // Auto-cálculo do limite de preço e custo real efetivo com preço efetivo com desconto
    const precoCompraEfetivo = precoBruto * (1 - descPct / 100);
    const pdvNumber = field === 'pdvAlvo' ? Number(value) : (Number(updatedItem.pdvAlvo) || 0);
    const pdv = pdvNumber > 0 ? pdvNumber : 0;
    const fiscal = calculateItemFiscal(precoCompraEfetivo, pdv, globalFiscal, updatedItem.fiscalOverride);

    updatedItem.pdvAlvo = pdv;
    updatedItem.custoLoja = fiscal.custoLoja;
    updatedItem.custoFornecedor = fiscal.custoFornecedor;
    updatedItem.despesasPdvUnit = fiscal.despesasPdvUnit;
    updatedItem.creditoIcmsUnit = fiscal.creditoIcmsUnit;
    updatedItem.custoRealEfetivo = fiscal.custoRealEfetivo;
    updatedItem.margemRealUnit = fiscal.margemRealUnit;
    updatedItem.margemPercentual = fiscal.margemPercentual;

    // Se a descrição for preenchida e o código estiver vazio, gera o código sequencial PRD automaticamente
    if (field === 'descricao' && typeof value === 'string' && value.trim().length > 0) {
      if (!updatedItem.codigoInterno && !updatedItem.codigo) {
        const nextCode = generateNextProductCode(products, items);
        updatedItem.codigoInterno = nextCode;
        updatedItem.codigo = nextCode;
      }
    }

    onUpdateItem(item.id, updatedItem);
  };


  const validItemsCount = useMemo(() => items.filter(it => !isOrderItemBlank(it)).length, [items]);

  const totals = useMemo(() => {
    const res = calculateOrderTotals(items, orderHeader, globalFiscal);
    return {
      bruto: res.valorBruto,
      desconto: res.valorDescontoTotal,
      descontoPercentualMedio: res.descontoPercentualMedio,
      liquido: res.valorLiquido,
      totalIpi: res.totalIpi,
      totalSt: res.totalSt,
      valorFrete: res.valorFrete,
      totalGeral: res.totalGeral,
      pecas: res.totalPecas,
      precoMedio: res.precoMedio,
      precoMedioComImpostos: res.precoMedioComImpostos,
      margemMediaPercentual: res.margemMediaPercentual,
      margemMediaValor: res.margemMediaValor,
      rupturasCount: res.rupturasCount
    };
  }, [items, orderHeader, globalFiscal]);

  // Navegação completa por teclado estilo planilha Excel (Setas Cima, Baixo, Esquerda, Direita e Enter)
  const handleExcelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, field: string) => {
    const isDown = e.key === 'ArrowDown' || e.key === 'Down';
    const isUp = e.key === 'ArrowUp' || e.key === 'Up';
    const isRight = e.key === 'ArrowRight' || e.key === 'Right';
    const isLeft = e.key === 'ArrowLeft' || e.key === 'Left';
    const isEnter = e.key === 'Enter';

    if (e.key === 'Escape' && activeAutocompleteItemId) {
      setActiveAutocompleteItemId(null);
      return;
    }

    // Se for uma das teclas de navegação, fecha o autocomplete para liberar a navegação entre células
    if (isDown || isUp || isRight || isLeft || isEnter) {
      if (activeAutocompleteItemId) {
        setActiveAutocompleteItemId(null);
      }
    }

    // Identifica lista ordenada de colunas editáveis atualmente visíveis na tabela
    const visibleEditableCols = orderedVisibleColumns
      .map(c => c.key)
      .filter(k => EDITABLE_EXCEL_FIELDS.includes(k));
    
    const currentColIdx = visibleEditableCols.indexOf(field as ColumnKey);

    const focusCell = (targetRow: number, targetColField: string): boolean => {
      const nextInput = document.querySelector<HTMLInputElement>(
        `input[data-excel-row="${targetRow}"][data-excel-field="${targetColField}"]`
      );
      if (nextInput) {
        nextInput.focus();
        try {
          nextInput.select();
        } catch (_) {}
        return true;
      }
      return false;
    };

    // Detecção segura de posição do cursor / seleção de texto no input
    let isAtStart = true;
    let isAtEnd = true;
    let isAllSelected = true;

    try {
      const input = e.currentTarget;
      // Para campos numéricos ou códigos, a navegação horizontal com setas é imediata
      const isNumericOrCode = input.type === 'number' || ['qtdNoPacote', 'qtdPacotes', 'qtdTotalUnidades', 'precoUnitario', 'pdvAlvo', 'codigoBarras'].includes(field);
      if (isNumericOrCode) {
        isAtStart = true;
        isAtEnd = true;
        isAllSelected = true;
      } else {
        const valLen = input.value.length;
        const selStart = input.selectionStart ?? 0;
        const selEnd = input.selectionEnd ?? 0;
        isAllSelected = (selStart === 0 && selEnd === valLen) || valLen === 0;
        isAtStart = isAllSelected || selStart === 0;
        isAtEnd = isAllSelected || selEnd === valLen;
      }
    } catch {
      isAtStart = true;
      isAtEnd = true;
      isAllSelected = true;
    }

    // 1. SETA PARA BAIXO (↓)
    if (isDown && !e.altKey) {
      e.preventDefault();
      focusCell(rowIndex + 1, field);
      return;
    }

    // 2. SETA PARA CIMA (↑)
    if (isUp && !e.altKey && rowIndex > 0) {
      e.preventDefault();
      focusCell(rowIndex - 1, field);
      return;
    }

    // 3. SETA PARA DIREITA (→)
    if (isRight && !e.altKey && isAtEnd) {
      e.preventDefault();
      if (currentColIdx >= 0 && currentColIdx < visibleEditableCols.length - 1) {
        // Próxima coluna na mesma linha
        focusCell(rowIndex, visibleEditableCols[currentColIdx + 1]);
      } else if (rowIndex < items.length - 1) {
        // Primeira coluna da próxima linha
        focusCell(rowIndex + 1, visibleEditableCols[0]);
      }
      return;
    }

    // 4. SETA PARA ESQUERDA (←)
    if (isLeft && !e.altKey && isAtStart) {
      e.preventDefault();
      if (currentColIdx > 0) {
        // Coluna anterior na mesma linha
        focusCell(rowIndex, visibleEditableCols[currentColIdx - 1]);
      } else if (rowIndex > 0) {
        // Última coluna da linha anterior
        focusCell(rowIndex - 1, visibleEditableCols[visibleEditableCols.length - 1]);
      }
      return;
    }

    // 5. ENTER
    if (isEnter) {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift+Enter sobe de linha
        focusCell(rowIndex - 1, field);
      } else {
        // Enter desce de linha
        const moved = focusCell(rowIndex + 1, field);
        if (!moved && rowIndex === items.length - 1 && onAddItem) {
          onAddItem();
          setTimeout(() => {
            focusCell(rowIndex + 1, field);
          }, 60);
        }
      }
      return;
    }
  };

  // Manipulação de ordem e visibilidade de colunas
  const handleColumnReorder = (draggedKey: ColumnKey, targetKey: ColumnKey) => {
    if (!draggedKey || !targetKey || draggedKey === targetKey) return;
    setColumnOrder(prevOrder => {
      const newOrder = [...prevOrder];
      const draggedIdx = newOrder.indexOf(draggedKey);
      const targetIdx = newOrder.indexOf(targetKey);
      if (draggedIdx === -1 || targetIdx === -1) return prevOrder;
      newOrder.splice(draggedIdx, 1);
      newOrder.splice(targetIdx, 0, draggedKey);
      try {
        localStorage.setItem('mega12_order_columns_order', JSON.stringify(newOrder));
      } catch (e) {}
      return newOrder;
    });
  };

  const handleDragStart = (e: React.DragEvent, key: ColumnKey) => {
    if (resizingColumnRef.current || isHoveringResize || resizingColKey) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    isDraggingRef.current = true;
    setDraggedColumn(key);
    e.dataTransfer.setData('text/plain', key);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, key: ColumnKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== key) {
      setDragOverColumn(key);
    }
  };

  const handleDragLeave = (key: ColumnKey) => {
    if (dragOverColumn === key) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetKey: ColumnKey) => {
    e.preventDefault();
    if (draggedColumn) {
      handleColumnReorder(draggedColumn, targetKey);
    }
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 120);
  };

  const toggleColumnVisibility = (key: ColumnKey) => {
    setVisibleColumns(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('mega12_order_columns_visibility', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const showAllColumns = () => {
    const next: Record<string, boolean> = {};
    ALL_COLUMNS.forEach(c => { next[c.key] = true; });
    setVisibleColumns(next as Record<ColumnKey, boolean>);
    try {
      localStorage.setItem('mega12_order_columns_visibility', JSON.stringify(next));
    } catch (e) {}
  };

  // Redimensionamento de Colunas (Drag to Resize)
  const handleResizeStart = (e: React.MouseEvent, key: ColumnKey, minWidth: number = 60) => {
    e.preventDefault();
    e.stopPropagation(); // Evitar ordenação ou drag da coluna

    // Cancela qualquer drag de coluna em andamento
    setDraggedColumn(null);
    setDragOverColumn(null);
    isDraggingRef.current = false;

    const currentWidth = columnWidths[key] || ALL_COLUMNS.find(c => c.key === key)?.defaultWidth || 100;
    resizingColumnRef.current = {
      key,
      startX: e.clientX,
      startWidth: currentWidth,
      minWidth
    };
    setResizingColKey(key);

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingColumnRef.current) return;
      const deltaX = moveEvent.clientX - resizingColumnRef.current.startX;
      const newWidth = Math.max(resizingColumnRef.current.minWidth, resizingColumnRef.current.startWidth + deltaX);
      
      setColumnWidths(prev => ({
        ...prev,
        [key]: Math.round(newWidth)
      }));
    };

    const handleMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setResizingColKey(null);
      setIsHoveringResize(false);
      resizingColumnRef.current = null;

      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      setColumnWidths(current => {
        try {
          localStorage.setItem('mega12_order_columns_widths', JSON.stringify(current));
        } catch (err) {}
        return current;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const resetColumns = () => {
    const defaultOrder = ALL_COLUMNS.map(c => c.key);
    const defaultVis: Record<string, boolean> = {};
    const defaultWidths: Record<string, number> = {};
    ALL_COLUMNS.forEach(c => {
      defaultVis[c.key] = true;
      defaultWidths[c.key] = c.defaultWidth || 100;
    });
    setColumnOrder(defaultOrder);
    setVisibleColumns(defaultVis as Record<ColumnKey, boolean>);
    setColumnWidths(defaultWidths as Record<ColumnKey, number>);
    try {
      localStorage.removeItem('mega12_order_columns_order');
      localStorage.removeItem('mega12_order_columns_visibility');
      localStorage.removeItem('mega12_order_columns_widths');
    } catch (e) {}
  };

  const orderedVisibleColumns = useMemo(() => {
    return columnOrder
      .filter(k => visibleColumns[k] !== false)
      .map(k => ALL_COLUMNS_MAP.get(k) || ALL_COLUMNS.find(c => c.key === k)!)
      .filter(Boolean);
  }, [columnOrder, visibleColumns]);

  const totalTableWidth = useMemo(() => {
    const indexColWidth = 48; // Coluna #
    const colsWidth = orderedVisibleColumns.reduce((acc, col) => {
      return acc + (columnWidths[col.key] || col.defaultWidth);
    }, 0);
    return indexColWidth + colsWidth;
  }, [orderedVisibleColumns, columnWidths]);

  // Renderizador dinâmico de células da tabela
  const renderTableCell = (
    colKey: ColumnKey,
    item: OrderItem,
    index: number,
    fiscal: any
  ) => {
    const colMeta = ALL_COLUMNS_MAP.get(colKey);
    const colWidth = columnWidths[colKey] || colMeta?.defaultWidth || 100;
    const minWidth = colMeta?.minWidth || 60;
    const cellStyle: React.CSSProperties = {
      width: `${colWidth}px`,
      minWidth: `${minWidth}px`,
      maxWidth: `${colWidth}px`,
      boxSizing: 'border-box'
    };

    switch (colKey) {
      case 'ruptura':
        return (
          <td key="ruptura" style={cellStyle} className="py-1 px-2 text-center border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap">
            <div className="flex items-center justify-center">
              <label 
                className="inline-flex items-center justify-center cursor-pointer p-1.5 rounded-lg hover:bg-rose-100/60 dark:hover:bg-rose-950/40 transition group" 
                title="Marcar item em ruptura (o item não é excluído, mas seu valor é descontado de todos os cálculos do pedido)"
              >
                <input
                  type="checkbox"
                  checked={!!item.ruptura}
                  onChange={(e) => handleFieldChange(item, 'ruptura', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-rose-600 focus:ring-rose-500 dark:bg-slate-800 cursor-pointer accent-rose-600 transition"
                />
              </label>
            </div>
          </td>
        );

      case 'foto':
        return (
          <td key="foto" style={cellStyle} className="py-1 px-2 text-center border-r border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/20 whitespace-nowrap">
            <div className="flex items-center justify-center">
              {item.fotoUrl ? (
                <div 
                  className="w-8 h-8 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 cursor-pointer relative group/photo shadow-2xs"
                  onClick={() => handleOpenPhotoModal(item)}
                  title="Clique para trocar, ver ampliado ou remover foto"
                >
                  <img 
                    src={item.fotoUrl} 
                    alt="" 
                    loading="lazy" 
                    decoding="async" 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition">
                    <Upload className="w-3 h-3" />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenPhotoModal(item)}
                  className="w-8 h-8 rounded-md border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                  title="Anexar foto do produto"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </td>
        );

      case 'codigoInterno':
        return (
          <td key="codigoInterno" style={cellStyle} className="p-0 border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap relative">
            <input
              type="text"
              data-excel-row={index}
              data-excel-field="codigoInterno"
              value={item.codigoInterno || item.codigo || ''}
              onKeyDown={(e) => handleExcelKeyDown(e, index, 'codigoInterno')}
              onChange={(e) => {
                handleFieldChange(item, 'codigoInterno', e.target.value);
                handleFieldChange(item, 'codigo', e.target.value);
                activeInputRef.current = e.currentTarget;
                updateDropdownPosition(e.currentTarget);
                setActiveAutocompleteItemId(item.id);
                setActiveAutocompleteField('codigoInterno');
                setAutocompleteQuery(e.target.value);
              }}
              onFocus={(e) => {
                activeInputRef.current = e.currentTarget;
                updateDropdownPosition(e.currentTarget);
                setActiveAutocompleteItemId(item.id);
                setActiveAutocompleteField('codigoInterno');
                setAutocompleteQuery(e.target.value);
              }}
              placeholder="CÓD INT"
              className="w-full h-full min-h-[38px] px-2 py-1.5 text-xs text-center font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-transparent border-0 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-colors whitespace-nowrap"
              title="Código Interno Mega12"
            />
          </td>
        );

      case 'codigoBarras':
        return (
          <td key="codigoBarras" style={cellStyle} className="p-0 border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap relative">
            <input
              type="text"
              data-excel-row={index}
              data-excel-field="codigoBarras"
              value={item.codigoBarras || ''}
              onKeyDown={(e) => handleExcelKeyDown(e, index, 'codigoBarras')}
              onChange={(e) => handleFieldChange(item, 'codigoBarras', e.target.value)}
              placeholder="789..."
              className="w-full h-full min-h-[38px] px-2 py-1.5 text-xs text-center font-mono text-slate-600 dark:text-slate-300 bg-transparent border-0 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-colors whitespace-nowrap"
              title="Código de Barras EAN-13"
            />
          </td>
        );

      case 'codigoFornecedor':
        return (
          <td key="codigoFornecedor" style={cellStyle} className="p-0 border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap relative">
            <input
              type="text"
              data-excel-row={index}
              data-excel-field="codigoFornecedor"
              value={item.codigoFornecedor || ''}
              onKeyDown={(e) => handleExcelKeyDown(e, index, 'codigoFornecedor')}
              onChange={(e) => {
                handleFieldChange(item, 'codigoFornecedor', e.target.value);
                activeInputRef.current = e.currentTarget;
                updateDropdownPosition(e.currentTarget);
                setActiveAutocompleteItemId(item.id);
                setActiveAutocompleteField('codigoFornecedor');
                setAutocompleteQuery(e.target.value);
              }}
              onFocus={(e) => {
                activeInputRef.current = e.currentTarget;
                updateDropdownPosition(e.currentTarget);
                setActiveAutocompleteItemId(item.id);
                setActiveAutocompleteField('codigoFornecedor');
                setAutocompleteQuery(e.target.value);
              }}
              placeholder="REF FORN"
              className="w-full h-full min-h-[38px] px-2 py-1.5 text-xs text-center font-mono text-slate-700 dark:text-slate-300 bg-transparent border-0 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-colors whitespace-nowrap"
              title="Código de Referência do Fornecedor"
            />
          </td>
        );

      case 'descricao':
        return (
          <td key="descricao" style={cellStyle} className="p-0 border-r border-slate-200 dark:border-slate-700/80 relative">
            <div className="relative flex items-center w-full h-full">
              <input
                type="text"
                data-excel-row={index}
                data-excel-field="descricao"
                value={item.descricao}
                onKeyDown={(e) => handleExcelKeyDown(e, index, 'descricao')}
                onChange={(e) => {
                  handleFieldChange(item, 'descricao', e.target.value);
                  activeInputRef.current = e.currentTarget;
                  updateDropdownPosition(e.currentTarget);
                  setActiveAutocompleteItemId(item.id);
                  setActiveAutocompleteField('descricao');
                  setAutocompleteQuery(e.target.value);
                }}
                onFocus={(e) => {
                  activeInputRef.current = e.currentTarget;
                  updateDropdownPosition(e.currentTarget);
                  setActiveAutocompleteItemId(item.id);
                  setActiveAutocompleteField('descricao');
                  setAutocompleteQuery(e.target.value);
                }}
                placeholder="Digite o nome ou código do produto..."
                className={`w-full h-full min-h-[38px] px-3 py-1.5 text-xs font-medium bg-transparent border-0 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-inset ${
                  item.ruptura
                    ? 'text-rose-600 dark:text-rose-400 font-bold focus:ring-rose-500 pr-20'
                    : 'text-slate-900 dark:text-white focus:ring-emerald-500'
                } transition-colors`}
              />
              {item.ruptura && (
                <span className="absolute right-2 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950/90 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded pointer-events-none select-none">
                  RUPTURA
                </span>
              )}
            </div>
          </td>
        );

      case 'qtdNoPacote':
        return (
          <td key="qtdNoPacote" style={cellStyle} className="p-0 border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap">
            <input
              type="number"
              min="1"
              data-excel-row={index}
              data-excel-field="qtdNoPacote"
              value={item.qtdNoPacote === 0 || item.qtdNoPacote === undefined ? '' : item.qtdNoPacote}
              placeholder="1"
              onKeyDown={(e) => handleExcelKeyDown(e, index, 'qtdNoPacote')}
              onFocus={(e) => e.target.select()}
              onChange={(e) => handleFieldChange(item, 'qtdNoPacote', e.target.value)}
              className="w-full h-full min-h-[38px] px-2 py-1.5 text-center text-xs font-semibold font-mono text-slate-900 dark:text-white bg-transparent border-0 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-colors whitespace-nowrap"
              title="Unidades por pacote/caixa/fardo"
            />
          </td>
        );

      case 'qtdPacotes':
        return (
          <td key="qtdPacotes" style={cellStyle} className="p-0 border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap">
            <input
              type="number"
              min="0"
              data-excel-row={index}
              data-excel-field="qtdPacotes"
              value={item.qtdPacotes === 0 || item.qtdPacotes === undefined ? '' : item.qtdPacotes}
              placeholder="0"
              onKeyDown={(e) => handleExcelKeyDown(e, index, 'qtdPacotes')}
              onFocus={(e) => e.target.select()}
              onChange={(e) => handleFieldChange(item, 'qtdPacotes', e.target.value)}
              className="w-full h-full min-h-[38px] px-2 py-1.5 text-center text-xs font-bold font-mono text-emerald-700 dark:text-emerald-400 bg-transparent border-0 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-colors whitespace-nowrap"
              title="Quantidade de pacotes ou caixas adquiridos"
            />
          </td>
        );

      case 'qtdTotalUnidades':
        return (
          <td key="qtdTotalUnidades" style={cellStyle} className="p-0 border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap bg-slate-50/40 dark:bg-slate-900/30">
            <input
              type="number"
              min="0"
              data-excel-row={index}
              data-excel-field="qtdTotalUnidades"
              value={item.qtdTotalUnidades === 0 ? '' : item.qtdTotalUnidades}
              placeholder="0"
              onKeyDown={(e) => handleExcelKeyDown(e, index, 'qtdTotalUnidades')}
              onFocus={(e) => e.target.select()}
              onChange={(e) => handleFieldChange(item, 'qtdTotalUnidades', e.target.value)}
              className="w-full h-full min-h-[38px] px-2 py-1.5 text-center text-xs font-extrabold font-mono text-slate-900 dark:text-white bg-transparent border-0 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-colors whitespace-nowrap"
              title="Total de peças = Qtd no Pac × Qtd de Pac"
            />
          </td>
        );

      case 'aliquotaIpi': {
        const globalIpi = normalizeRateToDecimal(globalFiscal?.ipiAliquota) * 100;
        const effectiveIpi = item.aliquotaIpi !== undefined && item.aliquotaIpi !== null && item.aliquotaIpi > 0
          ? item.aliquotaIpi
          : (item.fiscalOverride?.useCustomFiscal && item.fiscalOverride?.ipiAliquota !== undefined
              ? Number(item.fiscalOverride.ipiAliquota)
              : globalIpi);

        return (
          <td key="aliquotaIpi" style={cellStyle} className="p-0 border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap bg-amber-50/20 dark:bg-amber-950/10">
            <input
              type="number"
              min="0"
              step="0.1"
              data-excel-row={index}
              data-excel-field="aliquotaIpi"
              value={item.aliquotaIpi === 0 || item.aliquotaIpi === undefined ? '' : item.aliquotaIpi}
              placeholder={globalIpi > 0 ? `${globalIpi}%` : '0%'}
              onKeyDown={(e) => handleExcelKeyDown(e, index, 'aliquotaIpi')}
              onFocus={(e) => e.target.select()}
              onChange={(e) => handleFieldChange(item, 'aliquotaIpi', e.target.value)}
              className="w-full h-full min-h-[38px] px-2 py-1.5 text-center text-xs font-bold font-mono text-amber-700 dark:text-amber-400 bg-transparent border-0 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-inset focus:ring-amber-500 transition-colors whitespace-nowrap"
              title={item.valorIpi ? `IPI: ${effectiveIpi}% (R$ ${item.valorIpi.toFixed(2)})` : `Alíquota IPI: ${effectiveIpi}%`}
            />
          </td>
        );
      }

      case 'precoUnitario': {
        const isEditing = item.id in editingPriceMap;
        const formattedPrice = item.precoUnitario > 0
          ? formatCurrency(item.precoUnitario, false)
          : (isOrderItemBlank(item) ? '' : '0,00');
        const displayVal = isEditing ? editingPriceMap[item.id] : formattedPrice;

        return (
          <td key="precoUnitario" style={cellStyle} className="p-0 border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap">
            <input
              type="text"
              inputMode="numeric"
              data-excel-row={index}
              data-excel-field="precoUnitario"
              value={displayVal}
              placeholder="0,00"
              onKeyDown={(e) => handleExcelKeyDown(e, index, 'precoUnitario')}
              onFocus={(e) => {
                setEditingPriceMap(prev => ({
                  ...prev,
                  [item.id]: item.precoUnitario > 0
                    ? formatCurrency(item.precoUnitario, false)
                    : '0,00'
                }));
                e.target.select();
              }}
              onBlur={() => {
                setEditingPriceMap(prev => {
                  const next = { ...prev };
                  delete next[item.id];
                  return next;
                });
              }}
              onChange={(e) => {
                const { formatted, value } = handleCurrencyInput(e.target.value, false);
                setEditingPriceMap(prev => ({ ...prev, [item.id]: formatted }));
                handleFieldChange(item, 'precoUnitario', value);
              }}
              className="w-full h-full min-h-[38px] px-2.5 py-1.5 text-right text-xs font-bold font-mono text-slate-900 dark:text-white bg-transparent border-0 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-colors whitespace-nowrap"
              title="Valor do produto por unidade (R$)"
            />
          </td>
        );
      }

      case 'valorTotalLiquido':
        return (
          <td key="valorTotalLiquido" style={cellStyle} className="py-2 px-3 text-right font-mono border-r border-slate-200 dark:border-slate-700/80 bg-slate-50/30 dark:bg-slate-900/20 whitespace-nowrap">
            <span className="font-extrabold text-slate-900 dark:text-white text-xs whitespace-nowrap">
              R$ {((item.valorTotalLiquido !== undefined ? item.valorTotalLiquido : (item.valorTotalBruto * (1 - (item.percentualDesconto || 0) / 100)))).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </td>
        );

      case 'pdvAlvo': {
        const pdvVal = item.pdvAlvo !== undefined && item.pdvAlvo !== null && item.pdvAlvo > 0 ? item.pdvAlvo : 12.00;
        const isEditing = item.id in editingPdvMap;
        const formattedPdv = pdvVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const displayVal = isEditing ? editingPdvMap[item.id] : formattedPdv;

        return (
          <td key="pdvAlvo" style={cellStyle} className="p-0 border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap">
            <input
              type="text"
              inputMode="decimal"
              data-excel-row={index}
              data-excel-field="pdvAlvo"
              value={displayVal}
              placeholder="12,00"
              onKeyDown={(e) => handleExcelKeyDown(e, index, 'pdvAlvo')}
              onFocus={() => {
                setEditingPdvMap(prev => ({
                  ...prev,
                  [item.id]: ''
                }));
              }}
              onClick={() => {
                setEditingPdvMap(prev => ({
                  ...prev,
                  [item.id]: ''
                }));
              }}
              onBlur={() => {
                if (!item.pdvAlvo || item.pdvAlvo <= 0) {
                  handleFieldChange(item, 'pdvAlvo', 12.00);
                }
                setEditingPdvMap(prev => {
                  const next = { ...prev };
                  delete next[item.id];
                  return next;
                });
              }}
              onChange={(e) => {
                const sanitized = e.target.value.replace(/[^0-9,\.]/g, '');
                setEditingPdvMap(prev => ({ ...prev, [item.id]: sanitized }));
                const parsed = parseFloat(sanitized.replace(',', '.')) || 0;
                handleFieldChange(item, 'pdvAlvo', parsed);
              }}
              className="w-full h-full min-h-[38px] px-2 py-1.5 text-center text-xs font-bold font-mono text-slate-900 dark:text-white bg-transparent border-0 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-colors whitespace-nowrap"
              title="Preço de Venda (PDV) - Clique para editar livremente"
            />
          </td>
        );
      }

      case 'custoLoja':
      case 'custoReal': {
        return (
          <td key="custoLoja" style={cellStyle} className="py-2 px-3 text-right border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap bg-blue-50/20 dark:bg-blue-950/10">
            <div className="flex items-center justify-end gap-1.5">
              <div 
                className={`font-extrabold text-blue-700 dark:text-blue-400 font-mono text-xs whitespace-nowrap ${onOpenFiscalModal && !isOrderItemBlank(item) ? 'cursor-pointer hover:underline' : ''}`} 
                title="Custo Total da Loja (conforme modelo da planilha). Clique para abrir calculadora fiscal."
                onClick={() => {
                  if (onOpenFiscalModal && !isOrderItemBlank(item)) {
                    onOpenFiscalModal(item);
                  }
                }}
              >
                R$ {fiscal.custoLoja.toFixed(2)}
              </div>
            </div>
          </td>
        );
      }

      case 'custoFornecedor': {
        const hasCustomFiscal = Boolean(item.fiscalOverride?.useCustomFiscal);
        const itemDescPct = (item.percentualDesconto !== undefined && item.percentualDesconto > 0)
          ? item.percentualDesconto
          : Math.max(0, Math.min(100, percentualDescontoOff || 0));
        const precoLiquidoCompra = item.precoUnitario * (1 - itemDescPct / 100);
        return (
          <td key="custoFornecedor" style={cellStyle} className="py-2 px-3 text-right border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap bg-emerald-50/20 dark:bg-emerald-950/10">
            <div className="flex items-center justify-end gap-1.5">
              {hasCustomFiscal && (
                <span
                  title="Este item possui alíquotas fiscais individuais personalizadas"
                  className="inline-flex items-center px-1 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300/50"
                >
                  Indiv.
                </span>
              )}
              {itemDescPct > 0 && !isOrderItemBlank(item) && (
                <span
                  title={`Desconto Comercial de ${itemDescPct}% OFF aplicado: Preço Líquido R$ ${precoLiquidoCompra.toFixed(2)}`}
                  className="inline-flex items-center px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40"
                >
                  -{itemDescPct}%
                </span>
              )}
              <div 
                className={`font-extrabold text-emerald-700 dark:text-emerald-400 font-mono text-xs whitespace-nowrap ${onOpenFiscalModal && !isOrderItemBlank(item) ? 'cursor-pointer hover:underline' : ''}`} 
                title={itemDescPct > 0
                  ? `Custo Fornecedor = Preço com Desconto R$ ${precoLiquidoCompra.toFixed(2)} (R$ ${item.precoUnitario.toFixed(2)} - ${itemDescPct}% OFF) + Encargos R$ ${fiscal.custoRealEntrada.toFixed(2)} = R$ ${fiscal.custoFornecedor.toFixed(2)}`
                  : 'Custo Real Fornecedor (Produto + IPI + ST + Frete). Clique para abrir calculadora fiscal.'}
                onClick={() => {
                  if (onOpenFiscalModal && !isOrderItemBlank(item)) {
                    onOpenFiscalModal(item);
                  }
                }}
              >
                R$ {fiscal.custoFornecedor.toFixed(2)}
              </div>
            </div>
          </td>
        );
      }

      case 'margem': {
        const isLucro = fiscal.margemRealUnit >= 0;
        return (
          <td key="margem" style={cellStyle} className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap">
            <span 
              onClick={() => {
                if (onOpenFiscalModal && !isOrderItemBlank(item)) {
                  onOpenFiscalModal(item);
                }
              }}
              title="Margem Real deste produto. Clique para abrir calculadora fiscal."
              className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold font-mono border whitespace-nowrap ${onOpenFiscalModal && !isOrderItemBlank(item) ? 'cursor-pointer hover:opacity-85' : ''} ${
                isLucro 
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800'
              }`}
            >
              R$ {fiscal.margemRealUnit.toFixed(2)} <span className="text-[10px] font-semibold">({fiscal.margemPercentual.toFixed(0)}%)</span>
            </span>
          </td>
        );
      }

      case 'acoes': {
        const hasCustomFiscal = Boolean(item.fiscalOverride?.useCustomFiscal);
        return (
          <td key="acoes" style={cellStyle} className="py-1 px-2 text-center whitespace-nowrap">
            <div className="flex items-center justify-center gap-1 text-slate-400">
              {/* Botão de Engenharia Fiscal Individual */}
              {onOpenFiscalModal && !isOrderItemBlank(item) && (
                <button
                  type="button"
                  onClick={() => onOpenFiscalModal(item)}
                  className={`p-1 rounded-md transition cursor-pointer ${
                    hasCustomFiscal
                      ? 'text-amber-700 bg-amber-100 dark:bg-amber-950/80 dark:text-amber-300 hover:bg-amber-200 border border-amber-300/60 shadow-2xs'
                      : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60'
                  }`}
                  title={
                    hasCustomFiscal
                      ? 'Engenharia fiscal individual ativa neste produto (Clique para alterar)'
                      : 'Abrir calculadora fiscal individual deste produto'
                  }
                >
                  <Calculator className="w-3.5 h-3.5" />
                </button>
              )}

              {!isOrderItemBlank(item) && item.descricao && item.descricao.trim().length > 0 && !findCatalogProduct(item) && onSaveProduct && (
                <button
                  type="button"
                  onClick={() => handleQuickRegisterProduct(item)}
                  className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition cursor-pointer"
                  title="Salvar produto no Catálogo"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => onDuplicateItem(item)}
                disabled={isOrderItemBlank(item)}
                className={`p-1 rounded-md transition ${
                  isOrderItemBlank(item)
                    ? 'text-slate-300 dark:text-slate-700 opacity-30 cursor-not-allowed'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                }`}
                title="Duplicar Linha"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onDeleteItem(item.id)}
                disabled={isOrderItemBlank(item) && index === items.length - 1}
                className={`p-1 rounded-md transition ${
                  isOrderItemBlank(item) && index === items.length - 1
                    ? 'text-slate-300 dark:text-slate-700 opacity-30 cursor-not-allowed'
                    : 'text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 cursor-pointer'
                }`}
                title={isOrderItemBlank(item) && index === items.length - 1 ? 'Linha automática' : 'Remover Item'}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              </button>
            </div>
          </td>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs mb-8 overflow-visible">
      
      {/* Header bar com ações e busca inteligente rápida */}
      <div className="px-5 py-4 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200/70 dark:border-slate-700/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              GRADE DE PRODUTOS & PEDIDO
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              {validItemsCount} {validItemsCount === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Digitação contínua em formato planilha com auto-inclusão de linhas, códigos, custos e rateio de lojas
          </p>
        </div>

        {/* Barra de Ações Rápidas Superior */}
        <div className="flex flex-wrap items-center gap-2">
          

          {/* Busca Rápida com Autocomplete no Catálogo */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              ref={quickSearchInputRef}
              type="text"
              value={quickSearchText}
              onChange={(e) => {
                setQuickSearchText(e.target.value);
                setIsQuickSearchOpen(true);
              }}
              onFocus={() => {
                if (quickSearchText.trim().length > 0) setIsQuickSearchOpen(true);
              }}
              placeholder="Buscar no catálogo..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-hidden shadow-2xs font-medium"
            />
            {quickSearchText && (
              <button
                type="button"
                onClick={() => {
                  setQuickSearchText('');
                  setIsQuickSearchOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Menu Suspenso de Resultados da Busca Rápida Superior */}
            {isQuickSearchOpen && quickSearchText.trim().length > 0 && (
              <div
                className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-40 max-h-72 overflow-y-auto p-1.5 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150"
              >
                {matchingProductsForQuickBar.length > 0 ? (
                  matchingProductsForQuickBar.map(prod => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleSelectProductForNewItem(prod)}
                      className="w-full p-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2.5 group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        {prod.fotoUrl ? (
                          <img src={prod.fotoUrl} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {highlightMatch(prod.descricao, quickSearchText)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                          <span>{prod.codigoInterno || prod.codigo}</span>
                          <span>•</span>
                          <span className="text-emerald-600 font-bold">R$ {Number(prod.precoUnitarioPadrao || 0).toFixed(2)}</span>
                          {prod.nomeFornecedor && (
                            <>
                              <span>•</span>
                              <span className="text-slate-500 truncate">{prod.nomeFornecedor}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg shrink-0">
                        Adicionar +
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400">
                    Nenhum produto {currentSupplierName ? `do fornecedor "${currentSupplierName}"` : ''} encontrado para "{quickSearchText}"
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => { setCatalogSearch(''); setIsCatalogPickerOpen(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition cursor-pointer shadow-2xs"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Catálogo ({products.filter(p => isProductFromSupplier(p, currentSupplierId, currentSupplierName, suppliers)).length})</span>
          </button>
        </div>
      </div>

      {/* Table responsive container com visual e comportamento de planilha do Excel */}
      <div className="overflow-x-auto overflow-y-visible">
        <table 
          style={{ 
            tableLayout: 'fixed', 
            width: `${totalTableWidth}px`, 
            minWidth: '100%' 
          }} 
          className="text-left border-collapse border-t border-slate-200 dark:border-slate-700 font-sans text-xs"
        >
          <colgroup>
            <col style={{ width: '48px', minWidth: '48px' }} />
            {orderedVisibleColumns.map(col => {
              const w = columnWidths[col.key] || col.defaultWidth;
              const minW = col.minWidth || 60;
              return <col key={col.key} style={{ width: `${w}px`, minWidth: `${minW}px` }} />;
            })}
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider select-none">
              {/* Coluna # com Dropdown para escolha de colunas visíveis */}
              <th 
                style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}
                className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-700 bg-slate-200/60 dark:bg-slate-800/90 whitespace-nowrap relative"
              >
                <button
                  ref={columnsButtonRef}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsColumnsDropdownOpen(prev => {
                      const next = !prev;
                      if (next && columnsButtonRef.current) {
                        const rect = columnsButtonRef.current.getBoundingClientRect();
                        const spaceBelow = window.innerHeight - rect.bottom;
                        const isFlipped = spaceBelow < 320 && rect.top > 320;
                        setColumnsCoords({
                          top: isFlipped ? Math.max(10, rect.top - 330) : rect.bottom + 6,
                          left: Math.max(12, Math.min(rect.left, window.innerWidth - 280))
                        });
                      }
                      return next;
                    });
                  }}
                  className="inline-flex items-center justify-center gap-1 font-extrabold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 p-1 rounded-md hover:bg-slate-300/60 dark:hover:bg-slate-700 transition cursor-pointer"
                  title="Configurar Colunas Visíveis"
                >
                  <span>#</span>
                  <SlidersHorizontal className="w-3 h-3 text-slate-500" />
                </button>

                {isColumnsDropdownOpen && columnsCoords && createPortal(
                  <div
                    ref={columnsDropdownRef}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'fixed',
                      top: `${columnsCoords.top}px`,
                      left: `${columnsCoords.left}px`,
                      zIndex: 999999
                    }}
                    className="w-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-3 text-left font-sans normal-case tracking-normal animate-in fade-in slide-in-from-top-2 duration-150"
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Colunas Visíveis</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {orderedVisibleColumns.length}/{ALL_COLUMNS.length}
                      </span>
                    </div>

                    <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                      {ALL_COLUMNS.map(col => {
                        const isVisible = visibleColumns[col.key] !== false;
                        return (
                          <label
                            key={col.key}
                            className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs text-slate-700 dark:text-slate-300 transition"
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isVisible}
                                onChange={() => toggleColumnVisibility(col.key)}
                                className="rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <span className={isVisible ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-400'}>
                                {col.label}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={resetColumns}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restaurar
                      </button>
                      <button
                        type="button"
                        onClick={showAllColumns}
                        className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                      >
                        Marcar Todas
                      </button>
                    </div>
                  </div>,
                  document.body
                )}
              </th>

              {/* Colunas Reordenáveis com Arraste de Posição e Ajuste de Largura Limpo */}
              {orderedVisibleColumns.map(col => {
                const isDragOver = dragOverColumn === col.key;
                const isBeingDragged = draggedColumn === col.key;
                const colWidth = columnWidths[col.key] || col.defaultWidth;
                const minWidth = col.minWidth || 60;
                const isThisResizing = resizingColKey === col.key;
                const canDrag = !resizingColKey && !isHoveringResize;

                return (
                  <th
                    key={col.key}
                    draggable={canDrag}
                    onDragStart={(e) => handleDragStart(e, col.key)}
                    onDragOver={(e) => handleDragOver(e, col.key)}
                    onDragLeave={() => handleDragLeave(col.key)}
                    onDrop={(e) => handleDrop(e, col.key)}
                    onDragEnd={handleDragEnd}
                    style={{ width: `${colWidth}px`, minWidth: `${minWidth}px`, maxWidth: `${colWidth}px` }}
                    className={`py-2 px-1.5 border-r border-slate-200 dark:border-slate-700 select-none transition-colors relative text-center align-middle ${
                      canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                    } ${
                      isDragOver ? 'bg-emerald-100/90 dark:bg-emerald-950/90 ring-2 ring-emerald-500' : ''
                    } ${isBeingDragged ? 'opacity-30' : 'hover:bg-slate-200/50 dark:hover:bg-slate-700/50'} ${
                      isThisResizing ? 'bg-emerald-50/60 dark:bg-emerald-950/40' : ''
                    }`}
                    title="Arraste para mover a posição da coluna • Arraste a divisória direita para ajustar a largura"
                  >
                    <div className="flex items-center justify-center w-full min-h-[28px] pointer-events-none text-center">
                      <span className="font-bold tracking-tight text-[11px] text-slate-700 dark:text-slate-200 text-center whitespace-normal break-words leading-tight">
                        {col.label}
                      </span>
                    </div>

                    {/* Alça de Redimensionamento Confortável com Feedback Visual */}
                    <div
                      draggable={false}
                      onDragStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onMouseEnter={() => setIsHoveringResize(true)}
                      onMouseLeave={() => {
                        if (!resizingColumnRef.current) setIsHoveringResize(false);
                      }}
                      onMouseDown={(e) => handleResizeStart(e, col.key, minWidth)}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      title="Arraste para ajustar a largura desta coluna"
                      className={`absolute top-0 -right-2 w-4 h-full cursor-col-resize z-30 flex items-center justify-center group/resize select-none ${
                        isThisResizing ? 'bg-emerald-500/20' : ''
                      }`}
                    >
                      <div className={`w-[3px] h-full rounded-full transition-colors ${
                        isThisResizing 
                          ? 'bg-emerald-500 shadow-sm' 
                          : 'bg-transparent group-hover/resize:bg-emerald-500'
                      }`} />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700/80 text-xs">
            {items.map((item, index) => {
              const precoCompraEfetivo = item.precoUnitario * (1 - (item.percentualDesconto || 0) / 100);
              const fiscal = calculateItemFiscal(precoCompraEfetivo, item.pdvAlvo, globalFiscal, item.fiscalOverride);

              return (
                <tr 
                  key={item.id ? `${item.id}_${index}` : `row_${index}`}
                  className={`${
                    item.ruptura 
                      ? 'bg-rose-50/60 dark:bg-rose-950/25 hover:bg-rose-100/60 dark:hover:bg-rose-950/40' 
                      : 'hover:bg-emerald-50/20 dark:hover:bg-slate-800/40'
                  } transition-colors group whitespace-nowrap`}
                >
                  {/* Index / Linha fixa */}
                  <td 
                    style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}
                    className="py-2 px-2 text-center bg-slate-50 dark:bg-slate-900/40 text-slate-400 font-mono text-[11px] font-semibold border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap select-none"
                  >
                    {index + 1}
                  </td>

                  {/* Células dinâmicas de acordo com orderedVisibleColumns */}
                  {orderedVisibleColumns.map(col => renderTableCell(col.key, item, index, fiscal))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer bar com resumo financeiro coerente e TOTAL GERAL com máximo destaque */}
      <div className="px-5 py-3.5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200/80 dark:border-slate-700/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        
        {/* Lado Esquerdo: Métricas Físicas e Operacionais */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-2xs">
            <span className="text-slate-400 font-sans">Itens:</span>
            <strong className="text-slate-900 dark:text-white font-bold">{validItemsCount}</strong>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="font-bold">{totals.pecas.toLocaleString('pt-BR')} un</span>
          </div>

          {totals.rupturasCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold shadow-2xs">
              <span>🚫 {totals.rupturasCount} em ruptura (descontados)</span>
            </div>
          )}

          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-2xs"
            title="Preço médio por peça: Subtotal de Mercadorias ÷ Total de Peças"
          >
            <span className="text-slate-400 font-sans">Preço Médio:</span>
            <strong className="text-slate-800 dark:text-slate-200 font-bold">
              R$ {totals.precoMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>

          <div 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-2xs ${
              totals.margemMediaPercentual >= 0
                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300'
            }`}
            title={`Margem Real Média Ponderada do Pedido: ${totals.margemMediaPercentual.toFixed(1)}% (Lucro médio projetado de R$ ${totals.margemMediaValor.toFixed(2)} por unidade vendida no PDV)`}
          >
            <span className="text-slate-400 dark:text-slate-400 font-sans">Margem Média:</span>
            <strong className="font-extrabold font-mono">
              {totals.margemMediaPercentual.toFixed(1)}%
            </strong>
            <span className="text-[11px] opacity-85 font-mono">
              (R$ {totals.margemMediaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
            </span>
          </div>
        </div>

        {/* Lado Direito: Resumo Financeiro no Formato Proposta Comercial (Total Líquido | IPI | Desconto Comercial | TOTAL GERAL) */}
        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2.5 font-mono">
          <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 px-3.5 py-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            
            {/* 1. Total Líquido */}
            <div className="flex items-center gap-1.5 text-xs border-r border-slate-200 dark:border-slate-700 pr-3" title="Total líquido das mercadorias faturadas">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                Total Líquido:
              </span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200">
                R$ {totals.liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* 2. IPI */}
            <div className="flex items-center gap-1.5 text-xs border-r border-slate-200 dark:border-slate-700 pr-3" title="Imposto sobre Produtos Industrializados">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-sans">
                {totals.totalIpi > 0 ? '+ IPI:' : 'IPI:'}
              </span>
              <span className={`font-extrabold ${totals.totalIpi > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-400'}`}>
                R$ {totals.totalIpi.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* 3. Desconto Comercial */}
            <div className="flex items-center gap-1.5 text-xs border-r border-slate-200 dark:border-slate-700 pr-3" title={totals.desconto > 0 ? `Desconto comercial negociado já deduzido nas mercadorias` : 'Nenhum desconto comercial aplicado'}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-sans">
                Desconto Comercial:
              </span>
              {totals.desconto > 0 ? (
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                  -R$ {totals.desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {totals.descontoPercentualMedio > 0 && (
                    <span className="ml-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                      ({totals.descontoPercentualMedio.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)
                    </span>
                  )}
                </span>
              ) : (
                <span className="font-bold text-slate-400">
                  0%
                </span>
              )}
            </div>

            {/* ST (se houver) */}
            {totals.totalSt > 0 && (
              <div className="flex items-center gap-1.5 text-xs border-r border-slate-200 dark:border-slate-700 pr-3" title="Substituição Tributária">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 font-sans">
                  + ST:
                </span>
                <span className="font-extrabold text-purple-700 dark:text-purple-300">
                  R$ {totals.totalSt.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}


            {/* 4. TOTAL GERAL (Destaque Principal) */}
            <div className="flex items-center gap-2 pl-0.5 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 shadow-2xs" title="Total Geral faturado do pedido">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-sans">
                TOTAL GERAL:
              </span>
              <span className="text-sm sm:text-base md:text-lg font-black font-mono text-emerald-950 dark:text-emerald-100 tracking-tight">
                R$ {totals.totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* Modal: Seletor de Produtos do Catálogo */}
      {isCatalogPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Selecionar Produto do Catálogo
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Clique em um produto cadastrado com foto para adicioná-lo ao pedido
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCatalogPickerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Busca no modal */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Pesquisar por nome, código ou categoria..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                  autoFocus
                />
              </div>
            </div>

            {/* Lista de Produtos com Fotos — filtrado pelo fornecedor do pedido */}
            <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(() => {
                // Filtra por fornecedor do pedido, depois aplica busca textual
                const supplierProducts = products.filter(p =>
                  isProductFromSupplier(p, currentSupplierId, currentSupplierName, suppliers)
                );

                const filteredCatalog = catalogSearch.trim().length === 0
                  ? supplierProducts
                  : supplierProducts.filter(p => {
                      const s = catalogSearch.toLowerCase();
                      const desc = (p.descricao || '').toLowerCase();
                      const codInt = (p.codigoInterno || p.codigo || '').toLowerCase();
                      const codForn = (p.codigoFornecedor || '').toLowerCase();
                      const cat = (p.categoria || '').toLowerCase();
                      return desc.includes(s) || codInt.includes(s) || codForn.includes(s) || cat.includes(s);
                    });

                if (filteredCatalog.length === 0) {
                  return (
                    <div className="col-span-full p-8 text-center text-slate-400 text-xs">
                      {catalogSearch.trim().length > 0
                        ? `Nenhum produto encontrado para "${catalogSearch}".`
                        : `Nenhum produto cadastrado para o fornecedor "${currentSupplierName || ''}".`
                      }
                    </div>
                  );
                }

                return filteredCatalog.map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => handleSelectProductForNewItem(prod)}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 hover:border-indigo-500 dark:hover:border-indigo-500 bg-white dark:bg-slate-800/80 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition cursor-pointer flex items-center gap-3.5 group shadow-xs hover:shadow-md"
                  >
                    {/* Foto */}
                    <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-900 overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center relative">
                      {prod.fotoUrl ? (
                        <img src={prod.fotoUrl} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    {/* Dados */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-[10px] font-bold font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/60" title="Código Interno">
                          {prod.codigoInterno || prod.codigo}
                        </span>
                        {prod.codigoFornecedor && (
                          <span className="text-[9px] font-bold font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800" title="Código do Fornecedor">
                            Ref: {prod.codigoFornecedor}
                          </span>
                        )}
                        {prod.categoria && (
                          <span className="text-[10px] text-slate-400 truncate">
                            {prod.categoria}
                          </span>
                        )}
                        {prod.nomeFornecedor && (
                          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded-md flex items-center gap-1 truncate max-w-[150px]">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{prod.nomeFornecedor}</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate mb-1.5" title={prod.descricao}>
                        {prod.descricao}
                      </h4>

                      {/* Preço em Grande Destaque e Embalagem */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-baseline gap-1 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 shadow-2xs">
                          <span className="text-[11px] font-bold tracking-normal opacity-80">R$</span>
                          <span className="text-base sm:text-lg font-black font-mono tracking-tight leading-none">
                            {Number(prod.precoUnitarioPadrao || 0).toFixed(2)}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-600/80 dark:text-emerald-400/80">/un</span>
                        </span>

                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
                          Emb: <strong className="text-slate-800 dark:text-slate-200">{prod.qtdPorPacote} un/cx</strong>
                        </span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 group-hover:bg-indigo-600 group-hover:text-white text-slate-400 transition shrink-0">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Rodapé do Modal com botão para fechar após selecionar os itens */}
            <div className="p-3.5 px-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Clique nos produtos para ir adicionando ao pedido. Quando terminar, clique em Concluir.
              </span>
              <button
                type="button"
                onClick={() => setIsCatalogPickerOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 transition cursor-pointer shadow-xs"
              >
                Concluir & Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Zoom da Imagem */}
      {/* MODAL ESPECIALIZADO DE FOTO DO PRODUTO NO PEDIDO */}
      {photoModalItem && (
        <div 
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handlePhotoDrop(e); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Header do Modal */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Foto do Produto
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                    {photoModalItem.descricao || 'Definir imagem do item'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPhotoModalItem(null)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-5 space-y-4">
              
              {/* Tabs de Seleção: Upload vs Link URL */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPhotoTab('upload')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    photoTab === 'upload'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Upload do Computador/Celular
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoTab('url')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    photoTab === 'url'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  Link / URL da Imagem
                </button>
              </div>

              {/* Área de Preview da Imagem com Suporte Completo a Drag & Drop */}
              <div 
                onDragOver={handlePhotoDragOver}
                onDragEnter={handlePhotoDragOver}
                onDragLeave={handlePhotoDragLeave}
                onDrop={handlePhotoDrop}
                onClick={() => {
                  if (!photoPreview && !isProcessingPhoto) {
                    photoFileInputRef.current?.click();
                  }
                }}
                className={`w-full h-48 rounded-2xl border-2 border-dashed transition-all overflow-hidden flex flex-col items-center justify-center relative group select-none ${
                  isDraggingPhoto
                    ? 'border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/80 ring-4 ring-emerald-500/20 scale-[1.01]'
                    : photoPreview
                    ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 cursor-default'
                    : 'border-indigo-300/80 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/30 hover:bg-indigo-50/70 hover:border-indigo-400 cursor-pointer'
                }`}
              >
                {isProcessingPhoto ? (
                  <div className="text-center p-4 space-y-2 text-indigo-600 dark:text-indigo-400">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin" />
                    <p className="text-xs font-bold">Otimizando e carregando foto...</p>
                  </div>
                ) : isDraggingPhoto ? (
                  <div className="text-center p-4 space-y-2 text-emerald-600 dark:text-emerald-400 animate-pulse">
                    <UploadCloud className="w-12 h-12 mx-auto stroke-2" />
                    <p className="text-sm font-extrabold">Solte a imagem aqui para importar!</p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">Formatos aceitos: JPG, PNG, WEBP, GIF</p>
                  </div>
                ) : photoPreview ? (
                  <>
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-contain p-2" />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          photoFileInputRef.current?.click();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/95 text-slate-800 text-xs font-bold shadow-md hover:bg-white flex items-center gap-1.5 transition cursor-pointer"
                        title="Trocar por outra foto"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Trocar Foto</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhotoFromModal();
                        }}
                        className="p-1.5 rounded-xl bg-rose-600 text-white shadow-md hover:bg-rose-700 transition cursor-pointer"
                        title="Remover Imagem"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4 space-y-2 text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center mx-auto shadow-xs group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Arraste e solte a imagem aqui
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        ou clique para escolher do computador / celular
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tab 1: Upload */}
              {photoTab === 'upload' && (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    ref={photoFileInputRef}
                    onChange={handleFileSelectedInModal}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => photoFileInputRef.current?.click()}
                    onDragOver={handlePhotoDragOver}
                    onDrop={handlePhotoDrop}
                    className="w-full py-2.5 px-4 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Escolher arquivo de imagem...</span>
                  </button>
                </div>
              )}

              {/* Tab 2: URL */}
              {photoTab === 'url' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    URL da Imagem na Internet:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={photoUrlInput}
                      onChange={(e) => {
                        setPhotoUrlInput(e.target.value);
                        setPhotoPreview(e.target.value.trim() || null);
                      }}
                      placeholder="https://exemplo.com/foto-produto.jpg"
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(photoUrlInput.trim() || null)}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Carregar
                    </button>
                  </div>
                </div>
              )}

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Ao salvar, esta foto será gravada no item do pedido e sincronizada automaticamente no <strong>Catálogo de Produtos</strong>!
                </span>
              </div>

            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPhotoModalItem(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2">
                {photoPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhotoFromModal}
                    className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition cursor-pointer"
                  >
                    Remover Foto
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSavePhotoFromModal}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Foto</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Visualizador Zoom de Foto */}
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

      {/* PORTAL FLUTUANTE DE FILTRO INTELIGENTE (RENDERIZADO NO ROOT BODY ACIMA DE QUALQUER TABELA/CONTAINER) */}
      {activeAutocompleteItemId && matchingProductsForRow.length > 0 && dropdownCoords && createPortal(
        <div
          ref={autocompletePortalRef}
          style={{
            position: 'fixed',
            top: dropdownCoords.isFlipped ? undefined : `${dropdownCoords.top}px`,
            bottom: dropdownCoords.isFlipped ? `${window.innerHeight - dropdownCoords.top}px` : undefined,
            left: `${dropdownCoords.left}px`,
            width: `${dropdownCoords.width}px`,
            zIndex: 999999
          }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-500/50 dark:border-emerald-500/40 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
        >
          {/* Cabeçalho do Dropdown */}
          <div className="px-3.5 py-2.5 bg-emerald-50/90 dark:bg-emerald-950/90 border-b border-emerald-100 dark:border-emerald-900/60 flex items-center justify-between text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                {currentSupplierName ? `Produtos: ${currentSupplierName}` : 'Produtos do Catálogo'} ({matchingProductsForRow.length})
              </span>
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
              Clique para preencher a linha
            </span>
          </div>

          {/* Lista de Itens Encontrados */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {matchingProductsForRow.map(prod => (
              <button
                key={prod.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const targetItem = items.find(it => it.id === activeAutocompleteItemId);
                  if (targetItem) {
                    handleSelectProductForExistingItem(targetItem, prod);
                  }
                }}
                className="w-full text-left p-2.5 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/50 transition flex items-center gap-3 group cursor-pointer"
              >
                {/* Thumbnail com Foto */}
                <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 overflow-hidden flex items-center justify-center">
                  {prod.fotoUrl ? (
                    <img src={prod.fotoUrl} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                  ) : (
                    <Package className="w-5 h-5 text-slate-400" />
                  )}
                </div>

                {/* Informações do Produto */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                      {prod.codigoInterno || prod.codigo}
                    </span>
                    {prod.codigoFornecedor && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                        Ref: {prod.codigoFornecedor}
                      </span>
                    )}
                    {prod.categoria && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        • {prod.categoria}
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                    {highlightMatch(prod.descricao, autocompleteQuery)}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    <span>Emb: <strong className="text-slate-700 dark:text-slate-300">{prod.qtdPorPacote} pçs</strong></span>
                    <span>Compra: <strong className="text-emerald-600 dark:text-emerald-400">R$ {Number(prod.precoUnitarioPadrao || 0).toFixed(2)}</strong></span>
                    <span>PDV: <strong className="text-slate-700 dark:text-slate-300">R$ 12,00</strong></span>
                  </div>
                </div>

                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white transition shrink-0">
                  <Check className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}



    </div>
  );
};
