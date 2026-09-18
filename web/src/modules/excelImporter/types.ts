import { PurchaseOrder, OrderItem, Product, Supplier, StoreConfig } from '../../shared/types';

export interface ExcelImportHeader {
  numeroPedido?: string;
  fornecedorNome: string;
  cnpj?: string;
  email?: string;
  telefoneContato?: string;
  telefoneEmpresa?: string;
  vendedor?: string;
  telefoneVendedor?: string;
  contatoVendedor?: string;
  condicaoPagamento?: string;
  percentualDescontoOff: number; // e.g. 50 (from 0.5)
  percentualNota?: number;        // e.g. 50 (faturado em NF)
  dataPedido: string;            // YYYY-MM-DD
  dataEntregaPrevista: string;   // YYYY-MM-DD
  observacoes?: string;
  tipoFrete?: 'CIF' | 'FOB' | 'Retira';
}

export interface ExcelImportRawItem {
  rowNumber: number;
  codigo: string;
  codigoFornecedor?: string;
  codigoInterno?: string;
  descricao: string;
  ncm?: string;
  eanBarcode?: string;
  unidadeMedida?: string;
  qtdNoPacote: number;
  qtdPacotes: number;
  qtdTotalUnidades: number;
  precoUnitario: number;
  aliquotaIpi?: number;
  valorIpi?: number;
  percentualDesconto?: number;
  valorDescontoItem?: number;
  valorTotalBruto: number;
  pdvSugerido: number;
  custoTotalInformado?: number;
  margemInformada?: number;
}

export interface ExcelImportFiscalParams {
  icmsAliquota?: number;
  ipiAliquota?: number;
  pisCofinsAliquota?: number;
  custosFixos?: number;
  creditoEntradaICMS?: number;
  aliquotaSt?: number;
}

export interface ParsedExcelOrder {
  fileName: string;
  sheetName: string;
  header: ExcelImportHeader;
  items: ExcelImportRawItem[];
  fiscalParams?: ExcelImportFiscalParams;
  storeAllocations?: Record<string, Record<string, number>>; // [storeName]: { [itemCode]: qty }
  totalItens: number;
  totalPecas: number;
  valorTotalGeral: number;
}

export interface CatalogProductStatus {
  rawItem: ExcelImportRawItem;
  status: 'existing' | 'new';
  existingProduct?: Product;
  assignedCode: string; // Internal PRD-XXX or existing
}

export interface ExcelImportResult {
  order: PurchaseOrder;
  supplier: Supplier;
  isSupplierNew: boolean;
  newProductsCount: number;
  existingProductsCount: number;
  newProductsToCreate: Product[];
}
