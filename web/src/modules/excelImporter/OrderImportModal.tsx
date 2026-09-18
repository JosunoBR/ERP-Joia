import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  X, 
  Package, 
  Building2, 
  Calendar, 
  CreditCard, 
  Percent, 
  ShoppingBag, 
  Info,
  Layers,
  Sparkles,
  Loader2,
  RefreshCw,
  Mail,
  Phone,
  User,
  Download
} from 'lucide-react';
import { 
  Supplier, 
  Product, 
  StoreConfig, 
  FiscalConfig,
  PurchaseOrder
} from '../../shared/types';
import { parseOrderExcelFile } from './orderExcelParser';
import { analyzeCatalogProducts, persistImportedCatalogProducts } from './catalogSyncService';
import { mapParsedExcelToOrder } from './orderMapper';
import { ParsedExcelOrder, CatalogProductStatus } from './types';
import { formatISODateToBR } from './excelDateHelper';
import { downloadModelTemplate } from './modelTemplateGenerator';
import { getNextOrderNumber } from '../../utils/storage';

interface OrderImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  products: Product[];
  stores: StoreConfig[];
  existingOrders?: PurchaseOrder[];
  fiscalConfig?: FiscalConfig;
  onSaveSupplier?: (supplier: Supplier) => Promise<any> | void;
  onOrderImported: (order: PurchaseOrder, updatedProducts: Product[]) => void;
}

export const OrderImportModal: React.FC<OrderImportModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  products,
  stores,
  existingOrders = [],
  fiscalConfig,
  onSaveSupplier,
  onOrderImported
}) => {
  if (!isOpen) return null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  // Fechar com a tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isImporting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImporting, onClose]);

  // Estados pós-leitura
  const [parsedData, setParsedData] = useState<ParsedExcelOrder | null>(null);
  const [orderNumberInput, setOrderNumberInput] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isNewSupplier, setIsNewSupplier] = useState(false);
  const [catalogAnalysis, setCatalogAnalysis] = useState<ReturnType<typeof analyzeCatalogProducts> | null>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'existing'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manipulador de drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setError(null);
    setLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseOrderExcelFile(buffer, file.name);

      if (!parsed.items || parsed.items.length === 0) {
        throw new Error('Nenhum item ou produto foi localizado na planilha. Verifique se as linhas de produtos estão preenchidas.');
      }

      // Vincular fornecedor correspondente ou sugerir cadastro
      let matchedSupplier = suppliers.find(s => {
        // Ignora fornecedor caso possua dados da própria empresa compradora
        if (s.cnpj && s.cnpj.replace(/\D/g, '') === '37144240000170') return false;
        if (s.razaoSocial && s.razaoSocial.toUpperCase() === 'CONECTA') return false;

        if (parsed.header.cnpj && s.cnpj) {
          const clean1 = s.cnpj.replace(/\D/g, '');
          const clean2 = parsed.header.cnpj.replace(/\D/g, '');
          if (clean1 && clean2 && clean1 === clean2) return true;
        }
        if (s.razaoSocial && parsed.header.fornecedorNome) {
          const n1 = s.razaoSocial.toLowerCase().trim();
          const n2 = parsed.header.fornecedorNome.toLowerCase().trim();
          if (n1.includes(n2) || n2.includes(n1)) return true;
        }
        return false;
      });

      let isNew = false;
      if (!matchedSupplier) {
        isNew = true;
        matchedSupplier = {
          id: 'sup_' + Date.now(),
          razaoSocial: parsed.header.fornecedorNome || 'Fornecedor Planilha',
          nomeFantasia: parsed.header.fornecedorNome || 'Fornecedor Planilha',
          cnpj: parsed.header.cnpj || undefined,
          email: parsed.header.email || undefined,
          telefoneEmpresa: parsed.header.telefoneEmpresa || undefined,
          vendedorPadrao: parsed.header.vendedor || undefined,
          contatoVendedor: parsed.header.contatoVendedor || parsed.header.telefoneVendedor || undefined,
          condicaoPagamentoPadrao: parsed.header.condicaoPagamento || '30/60/90 Dias',
          aliquotaStPadrao: parsed.fiscalParams?.aliquotaSt ? parsed.fiscalParams.aliquotaSt * 100 : 0,
          aliquotaIpiPadrao: parsed.fiscalParams?.ipiAliquota ? parsed.fiscalParams.ipiAliquota * 100 : 0,
          descontoOffPadrao: parsed.header.percentualDescontoOff || 0,
          observacoesDescarga: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } else {
        // Enriquecer dados faltantes do fornecedor existente se a planilha trouxe informações
        matchedSupplier = {
          ...matchedSupplier,
          cnpj: matchedSupplier.cnpj || parsed.header.cnpj || undefined,
          email: parsed.header.email || matchedSupplier.email || undefined,
          telefoneEmpresa: parsed.header.telefoneEmpresa || matchedSupplier.telefoneEmpresa || undefined,
          vendedorPadrao: matchedSupplier.vendedorPadrao || parsed.header.vendedor || undefined,
          contatoVendedor: matchedSupplier.contatoVendedor || parsed.header.contatoVendedor || parsed.header.telefoneVendedor || undefined,
          condicaoPagamentoPadrao: matchedSupplier.condicaoPagamentoPadrao || parsed.header.condicaoPagamento || undefined,
          descontoOffPadrao: matchedSupplier.descontoOffPadrao || parsed.header.percentualDescontoOff || undefined
        };
      }

      // Analisar catálogo de produtos
      const analysis = analyzeCatalogProducts(parsed.items, products, matchedSupplier);

      // Sanitiza e atribui número de pedido sequencial oficial
      let cleanNumero = (parsed.header.numeroPedido || '').trim();
      const isBogus = !cleanNumero || 
        cleanNumero.toUpperCase().includes('FORNECEDOR') || 
        cleanNumero.toUpperCase().includes('IMPORTADO') || 
        cleanNumero.toUpperCase().includes('FORNEC') ||
        cleanNumero.toUpperCase().includes('PLANILHA');

      // 🛡️ Prevenção de duplicidade: se o número já existir no sistema, gera o próximo livre
      const numberAlreadyTaken = cleanNumero && existingOrders.some(o => 
        o.header.numeroPedido && o.header.numeroPedido.trim().toUpperCase() === cleanNumero.toUpperCase()
      );

      if (isBogus || numberAlreadyTaken) {
        cleanNumero = getNextOrderNumber(existingOrders);
      }
      parsed.header.numeroPedido = cleanNumero;
      setOrderNumberInput(cleanNumero);

      setParsedData(parsed);
      setSelectedSupplier(matchedSupplier);
      setIsNewSupplier(isNew);
      setCatalogAnalysis(analysis);
    } catch (err: any) {
      console.error('Erro ao processar planilha de pedido:', err);
      setError(err.message || 'Erro ao ler arquivo Excel. Verifique se é uma planilha válida.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setParsedData(null);
    setOrderNumberInput('');
    setSelectedSupplier(null);
    setIsNewSupplier(false);
    setCatalogAnalysis(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectSupplier = (supId: string) => {
    const found = suppliers.find(s => s.id === supId);
    if (!found || !parsedData) return;
    setSelectedSupplier(found);
    setIsNewSupplier(false);
    const updatedAnalysis = analyzeCatalogProducts(parsedData.items, products, found);
    setCatalogAnalysis(updatedAnalysis);
  };

  const isInputDuplicate = useMemo(() => {
    if (!orderNumberInput || !existingOrders) return false;
    const clean = orderNumberInput.trim().toUpperCase();
    return existingOrders.some(o => o.header.numeroPedido && o.header.numeroPedido.trim().toUpperCase() === clean);
  }, [orderNumberInput, existingOrders]);

  const handleConfirmImport = async () => {
    if (!parsedData || !selectedSupplier || !catalogAnalysis) return;

    const finalNum = (orderNumberInput || parsedData.header.numeroPedido || '').trim().toUpperCase();
    if (!finalNum) {
      setError('O número do pedido é obrigatório.');
      return;
    }
    const duplicate = existingOrders.find(o => o.header.numeroPedido && o.header.numeroPedido.trim().toUpperCase() === finalNum);
    if (duplicate) {
      setError(`Não é possível importar: O número de pedido "${finalNum}" já pertence a outro pedido no sistema (${duplicate.header.fornecedor || 'Fornecedor'}). Números de pedido não podem ser duplicados!`);
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      // 1. Sempre salva/atualiza o fornecedor no cadastro (backend SQLite e localStorage)
      let currentSupplier = selectedSupplier;
      if (onSaveSupplier) {
        try {
          const saved = await onSaveSupplier(selectedSupplier);
          if (saved) currentSupplier = saved;
        } catch (supErr) {
          console.warn('Aviso ao persistir fornecedor na importação:', supErr);
        }
      }

      const supplierName = currentSupplier.razaoSocial || currentSupplier.nomeFantasia || '';

      // 2. REGRA DE NEGÓCIO CRÍTICA:
      // Todo produto do pedido (novo OU já cadastrado no catálogo) DEVE receber o fornecedor atual.
      // Produtos nunca podem ficar sem fornecedor.
      const allProductsToSave: Product[] = [
        ...catalogAnalysis.newProducts.map(p => ({
          ...p,
          supplierId: currentSupplier.id,
          nomeFornecedor: supplierName || p.nomeFornecedor
        })),
        ...catalogAnalysis.existingToUpdate.map(p => ({
          ...p,
          supplierId: currentSupplier.id,
          nomeFornecedor: supplierName || p.nomeFornecedor
        }))
      ];

      let updatedProducts = products;
      if (allProductsToSave.length > 0) {
        updatedProducts = await persistImportedCatalogProducts(allProductsToSave, products);
      }

      // 3. Mapear o pedido completo (com status 'Em Cotação' e isDraft: true)
      const order = mapParsedExcelToOrder(
        parsedData,
        currentSupplier,
        catalogAnalysis.statusList,
        stores,
        fiscalConfig,
        orderNumberInput.trim() || undefined
      );

      // 4. Concluir importação
      onOrderImported(order, updatedProducts);
      onClose();
    } catch (err: any) {
      console.error('Erro ao concluir importação do pedido:', err);
      setError(err.message || 'Erro ao salvar o pedido importado no sistema.');
    } finally {
      setIsImporting(false);
    }
  };

  // Filtragem dos itens exibidos
  const displayedItems = catalogAnalysis?.statusList.filter(item => {
    if (activeTab === 'new') return item.status === 'new';
    if (activeTab === 'existing') return item.status === 'existing';
    return true;
  }) || [];

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget && !isImporting) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Importador Inteligente de Pedidos (Excel)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400">
                  .xlsx / .xls
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Importe planilhas de pedidos com auto-cadastro de produtos e geração de proposta comercial ativa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Mensagem de Erro */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div>
                <p className="font-bold text-rose-900 dark:text-rose-200 mb-0.5">Falha na leitura do arquivo</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* ESTADO 1: Upload do Arquivo */}
          {!parsedData && (
            <div className="space-y-5">
              
              {/* Card de Download da Planilha Modelo Oficial */}
              <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-slate-50 to-emerald-500/5 dark:from-emerald-950/40 dark:via-slate-900/60 dark:to-emerald-950/20 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        Planilha Modelo Oficial (Padrão Rede Mega 12)
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-300">
                        Novo Layout v2.0
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Contém todos os campos obrigatórios (Código PRD, EAN-13, NCM, Unidade, Separação das 20 Lojas e Fórmulas Automáticas) para evitar erros de importação.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    setIsDownloadingTemplate(true);
                    try {
                      await downloadModelTemplate();
                    } catch (err: any) {
                      setError(err.message || 'Erro ao baixar planilha modelo.');
                    } finally {
                      setIsDownloadingTemplate(false);
                    }
                  }}
                  disabled={isDownloadingTemplate}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer shrink-0 disabled:opacity-60"
                  title="Baixar modelo em formato Excel (.xlsx)"
                >
                  {isDownloadingTemplate ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Baixar Planilha Modelo (.xlsx)</span>
                </button>
              </div>

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4 ${
                  dragActive
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[0.99]'
                    : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500/60 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileInput}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                  {loading ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <UploadCloud className="w-8 h-8" />
                  )}
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {loading ? 'Processando planilha...' : 'Arraste a planilha de pedido aqui ou clique para selecionar'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Compatível com formato padrão de pedidos (ex: CONECTA, ALS 10 BAZAR)
                  </p>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  Auto-detecção de Fornecedor, Vendedor, Condições e Itens
                </span>
              </div>

              {/* Destaques do Módulo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5">
                    <Package className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Auto-Cadastro de Produtos</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Produtos novos no pedido são automaticamente integrados ao catálogo com códigos sequenciais PRD.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5">
                    <Percent className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">50% OFF Histórico Seguro</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Preserva os preços unitários líquidos da planilha e registra o desconto OFF como referência de histórico.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2.5">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Pedido Ativo & Editável</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    O pedido é importado no status &quot;Em Cotação&quot; (salvo mas não fechado), permitindo ajustes completos.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ESTADO 2: Visualização e Validação dos Dados Extraídos */}
          {parsedData && selectedSupplier && catalogAnalysis && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Barra superior de identificação do arquivo */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500 text-white shadow-xs">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block font-mono">
                      {parsedData.fileName}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Aba comercial: <strong className="text-emerald-600 dark:text-emerald-400">{parsedData.sheetName}</strong>
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Trocar Planilha
                </button>
              </div>

              {/* Cards de Métricas Principais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Itens Distintos</span>
                  <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                    {parsedData.totalItens} produtos
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Volume Total</span>
                  <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                    {parsedData.totalPecas.toLocaleString('pt-BR')} peças
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 block">Valor Total Líquido</span>
                  <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5 block font-mono">
                    R$ {parsedData.valorTotalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 shadow-xs">
                  <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 block">
                    Desc. Comercial (% OFF)
                  </span>
                  <span className="text-xl font-extrabold text-indigo-700 dark:text-indigo-400 mt-0.5 block">
                    {parsedData.header.percentualDescontoOff > 0 ? `${parsedData.header.percentualDescontoOff}%` : '0%'}
                  </span>
                </div>
              </div>

              {/* Informações do Cabeçalho Extraído & Fornecedor */}
              <div className="p-4.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Fornecedor & Condições Comerciais
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Seletor rápido de fornecedor cadastrado */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Vincular a:</span>
                      <select
                        value={selectedSupplier.id}
                        onChange={(e) => handleSelectSupplier(e.target.value)}
                        className="text-xs font-semibold py-1 px-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 max-w-[200px] truncate"
                      >
                        {isNewSupplier && (
                          <option value={selectedSupplier.id}>
                            * {selectedSupplier.razaoSocial} (Detectado da Planilha)
                          </option>
                        )}
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.razaoSocial}
                          </option>
                        ))}
                      </select>
                    </div>

                    {isNewSupplier ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Novo Fornecedor
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Fornecedor Vinculado
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  {/* Fornecedor */}
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Fornecedor</span>
                    <strong className="text-slate-900 dark:text-white block mt-0.5">{selectedSupplier.razaoSocial}</strong>
                    {selectedSupplier.cnpj ? (
                      <span className="block text-[11px] text-slate-500 font-mono mt-0.5">{selectedSupplier.cnpj}</span>
                    ) : (
                      <span className="block text-[10px] text-slate-400 mt-0.5">CNPJ não informado</span>
                    )}
                  </div>

                  {/* E-mail da Empresa Fornecedora */}
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold flex items-center gap-1">
                      <Mail className="w-3 h-3 text-emerald-600" />
                      E-mail Fornecedor
                    </span>
                    <strong className="text-slate-900 dark:text-white block mt-0.5 truncate" title={selectedSupplier.email || 'Não informado'}>
                      {selectedSupplier.email || 'Não informado'}
                    </strong>
                    <span className="block text-[10px] text-slate-400 mt-0.5">Institucional / Pedidos</span>
                  </div>

                  {/* Telefone Empresa Fornecedora */}
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      Telefone Fornecedor
                    </span>
                    <strong className="text-slate-900 dark:text-white block font-mono mt-0.5">
                      {selectedSupplier.telefoneEmpresa || 'Não informado'}
                    </strong>
                    <span className="block text-[10px] text-slate-400 mt-0.5">Contato da Empresa</span>
                  </div>

                  {/* Vendedor & Contato (Linha 4) */}
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold flex items-center gap-1">
                      <User className="w-3 h-3 text-indigo-600" />
                      Vendedor (Linha 4)
                    </span>
                    <strong className="text-slate-900 dark:text-white block mt-0.5">
                      {selectedSupplier.vendedorPadrao || 'Não informado'}
                    </strong>
                    {selectedSupplier.contatoVendedor ? (
                      <span className="block text-[11px] text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">{selectedSupplier.contatoVendedor}</span>
                    ) : (
                      <span className="block text-[10px] text-slate-400 mt-0.5">Contato do Vendedor</span>
                    )}
                  </div>

                  {/* N° do Pedido */}
                  <div className={`p-2 rounded-xl bg-white dark:bg-slate-900 border transition-colors ${
                    isInputDuplicate 
                      ? 'border-rose-500 dark:border-rose-500 bg-rose-50/30 dark:bg-rose-950/20' 
                      : 'border-slate-200/70 dark:border-slate-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">N° do Pedido</span>
                      {isInputDuplicate && (
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">⚠️ Já existe!</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={orderNumberInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOrderNumberInput(val);
                        if (parsedData) parsedData.header.numeroPedido = val;
                      }}
                      placeholder="ex: PED-0001"
                      className={`w-full font-mono font-bold text-xs px-2 py-1 rounded border outline-none mt-0.5 ${
                        isInputDuplicate
                          ? 'border-rose-500 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40'
                          : 'text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                      }`}
                    />
                    {isInputDuplicate ? (
                      <span className="block text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 font-semibold">Número duplicado não permitido</span>
                    ) : (
                      <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-semibold">Status: Em Cotação</span>
                    )}
                  </div>

                  {/* Condição de Pagamento e Desconto Comercial */}
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Pagamento & Desconto</span>
                    <span className="text-slate-900 dark:text-white font-medium block truncate mt-0.5" title={parsedData.header.condicaoPagamento}>
                      {parsedData.header.condicaoPagamento}
                    </span>
                    <div className="flex items-center justify-between text-[10px] mt-0.5">
                      <span className="text-slate-500">Frete: {parsedData.header.tipoFrete || 'Retira'}</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {parsedData.header.percentualDescontoOff > 0 ? `${parsedData.header.percentualDescontoOff}% OFF` : 'Sem Desc. OFF'}
                      </span>
                    </div>
                  </div>
                </div>

                {parsedData.header.observacoes && (
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <strong className="text-slate-800 dark:text-slate-200">Observações extraídas da planilha:</strong> {parsedData.header.observacoes}
                  </div>
                )}
              </div>

              {/* Tabela e Filtros de Itens */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        activeTab === 'all'
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      Todos ({catalogAnalysis.statusList.length})
                    </button>

                    <button
                      onClick={() => setActiveTab('new')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        activeTab === 'new'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Novos Produtos a Cadastrar ({catalogAnalysis.newCount})
                    </button>

                    <button
                      onClick={() => setActiveTab('existing')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        activeTab === 'existing'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900'
                      }`}
                    >
                      Já Cadastrados ({catalogAnalysis.existingCount})
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    Exibindo {displayedItems.length} itens
                  </span>
                </div>

                {/* Tabela de Produtos */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0 z-10 text-[11px] font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Cód. Planilha</th>
                        <th className="py-2.5 px-3">Cód. Interno</th>
                        <th className="py-2.5 px-3">Descrição do Produto</th>
                        <th className="py-2.5 px-3 text-center">Embalagem</th>
                        <th className="py-2.5 px-3 text-center">Pacotes</th>
                        <th className="py-2.5 px-3 text-right">Unidades</th>
                        <th className="py-2.5 px-3 text-right">R$ Unit.</th>
                        <th className="py-2.5 px-3 text-right">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {displayedItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="py-2 px-3">
                            {item.status === 'new' ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 w-max">
                                <Sparkles className="w-2.5 h-2.5" />
                                Novo
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 w-max block">
                                Cadastrado
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono font-medium text-slate-600 dark:text-slate-400">
                            {item.rawItem.codigo}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {item.assignedCode}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-900 dark:text-white max-w-xs truncate" title={item.rawItem.descricao}>
                            {item.rawItem.descricao}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-500 font-mono">
                            {item.rawItem.qtdNoPacote}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-500 font-mono">
                            {item.rawItem.qtdPacotes}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-800 dark:text-slate-200 font-mono">
                            {item.rawItem.qtdTotalUnidades.toLocaleString('pt-BR')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                            R$ {item.rawItem.precoUnitario.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            R$ {item.rawItem.valorTotalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Ao confirmar, o pedido será importado com o status <strong>&quot;Em Cotação&quot; (Ativo)</strong>. 
                    Nenhum pedido será fechado automaticamente, permitindo que você altere produtos, quantidades e preços a qualquer momento.
                  </span>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            Cancelar
          </button>

          {parsedData && (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isImporting || isInputDuplicate}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importando e cadastrando produtos...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar e Importar Pedido ({parsedData.totalItens} Itens)
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
