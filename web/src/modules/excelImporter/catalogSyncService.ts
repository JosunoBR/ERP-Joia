import { Product, Supplier } from '../../shared/types';
import { ExcelImportRawItem, CatalogProductStatus } from './types';
import { saveProductsBatchToDb, saveProductToDb } from '../../utils/api';
import { saveProductsList } from '../../utils/storage';

/**
 * Normaliza texto para comparação fonética/limpa de descrições.
 */
function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Analisa os itens importados da planilha contra o catálogo atual de produtos.
 * Garante que tanto produtos novos quanto existentes sejam devidamente vinculados ao fornecedor.
 */
export function analyzeCatalogProducts(
  rawItems: ExcelImportRawItem[],
  existingCatalog: Product[],
  supplier: Supplier
): {
  statusList: CatalogProductStatus[];
  newProducts: Product[];
  existingToUpdate: Product[];
  allOrderProducts: Product[];
  existingCount: number;
  newCount: number;
} {
  const existingCodes = new Set(existingCatalog.map(p => (p.codigo || '').toUpperCase().trim()));
  const existingDescMap = new Map<string, Product>();

  existingCatalog.forEach(p => {
    if (p.descricao) {
      existingDescMap.set(normalizeText(p.descricao), p);
    }
  });

  const statusList: CatalogProductStatus[] = [];
  const newProducts: Product[] = [];
  const existingToUpdate: Product[] = [];
  const createdKeysInBatch = new Set<string>();

  // Encontrar maior sequencial numérico caso precise gerar código
  let maxSeq = 100;
  existingCatalog.forEach(p => {
    const match = (p.codigo || '').match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (!isNaN(num) && num > maxSeq && num < 999999) {
        maxSeq = num;
      }
    }
  });

  const supplierName = supplier.razaoSocial || supplier.nomeFantasia || '';

  for (const rawItem of rawItems) {
    const rawCod = (rawItem.codigo || '').toUpperCase().trim();
    const rawFornecCod = (rawItem.codigoFornecedor || '').toUpperCase().trim();
    const rawInternoCod = (rawItem.codigoInterno || '').toUpperCase().trim();
    const rawEan = (rawItem.eanBarcode || '').trim();
    const normDesc = normalizeText(rawItem.descricao);

    // 1. Tentar encontrar produto correspondente no catálogo
    let matchedProduct: Product | undefined = existingCatalog.find(p => {
      const pCod = p.codigo?.toUpperCase().trim();
      const pFornec = p.codigoFornecedor?.toUpperCase().trim();
      const pInterno = p.codigoInterno?.toUpperCase().trim();

      if (rawInternoCod && (pInterno === rawInternoCod || pCod === rawInternoCod)) {
        return true;
      }
      if (rawFornecCod && (pFornec === rawFornecCod || pCod === rawFornecCod)) {
        return true;
      }
      if (rawCod && (pCod === rawCod || pFornec === rawCod || pInterno === rawCod)) {
        return true;
      }
      if (rawEan && (p.eanBarcode?.trim() === rawEan || p.codigoBarras?.trim() === rawEan)) {
        return true;
      }
      return false;
    });

    if (!matchedProduct && normDesc) {
      matchedProduct = existingDescMap.get(normDesc);
    }

    if (matchedProduct) {
      // Produto já existente no catálogo:
      // OBRIGATÓRIO: Atualizar o vínculo com o fornecedor da importação e enriquecer campos ausentes
      const updatedProduct: Product = {
        ...matchedProduct,
        supplierId: supplier.id,
        nomeFornecedor: supplierName || matchedProduct.nomeFornecedor || '',
        codigoFornecedor: rawItem.codigoFornecedor || rawItem.codigo || matchedProduct.codigoFornecedor,
        codigoBarras: rawItem.eanBarcode || matchedProduct.codigoBarras || matchedProduct.eanBarcode,
        eanBarcode: rawItem.eanBarcode || matchedProduct.eanBarcode || matchedProduct.codigoBarras,
        precoUnitarioPadrao: rawItem.precoUnitario > 0 ? rawItem.precoUnitario : matchedProduct.precoUnitarioPadrao,
        pdvSugerido: rawItem.pdvSugerido || matchedProduct.pdvSugerido || 0,
        qtdPorPacote: (rawItem.qtdNoPacote && rawItem.qtdNoPacote > 0) ? rawItem.qtdNoPacote : (matchedProduct.qtdPorPacote || 1),
        ncm: rawItem.ncm || matchedProduct.ncm,
        updatedAt: new Date().toISOString()
      };

      existingToUpdate.push(updatedProduct);

      statusList.push({
        rawItem,
        status: 'existing',
        existingProduct: updatedProduct,
        assignedCode: matchedProduct.codigo || rawCod
      });
    } else {
      // Produto NOVO - precisa ser cadastrado com código único
      let assignedCode = rawItem.codigoInterno || rawItem.codigo || '';
      if (!assignedCode || existingCodes.has(assignedCode.toUpperCase()) || createdKeysInBatch.has(assignedCode.toUpperCase())) {
        maxSeq++;
        assignedCode = `PRD-${String(maxSeq).padStart(4, '0')}`;
      }

      createdKeysInBatch.add(assignedCode.toUpperCase());

      const now = new Date().toISOString();
      const newProduct: Product = {
        id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        codigo: assignedCode,
        codigoInterno: assignedCode,
        codigoFornecedor: rawItem.codigoFornecedor || rawItem.codigo || undefined,
        codigoBarras: rawItem.eanBarcode || undefined,
        descricao: rawItem.descricao,
        categoria: 'Bazar / Utilidades',
        supplierId: supplier.id,
        nomeFornecedor: supplierName,
        precoUnitarioPadrao: rawItem.precoUnitario,
        pdvSugerido: rawItem.pdvSugerido || 0,
        qtdPorPacote: rawItem.qtdNoPacote || 1,
        ncm: rawItem.ncm || undefined,
        eanBarcode: rawItem.eanBarcode || undefined,
        ativo: true,
        createdAt: now,
        updatedAt: now
      };

      newProducts.push(newProduct);

      statusList.push({
        rawItem,
        status: 'new',
        existingProduct: newProduct,
        assignedCode
      });
    }
  }

  const existingCount = statusList.filter(s => s.status === 'existing').length;
  const newCount = newProducts.length;
  const allOrderProducts = [...newProducts, ...existingToUpdate];

  return {
    statusList,
    newProducts,
    existingToUpdate,
    allOrderProducts,
    existingCount,
    newCount
  };
}

/**
 * Persiste produtos importados (novos E existentes atualizados com o fornecedor)
 * tanto no SQLite (backend) quanto no localStorage (frontend).
 */
export async function persistImportedCatalogProducts(
  productsToSave: Product[],
  currentCatalog: Product[]
): Promise<Product[]> {
  if (!productsToSave || productsToSave.length === 0) {
    return currentCatalog;
  }

  // 1. Tentar salvar no backend em lote (SQLite via API)
  try {
    await saveProductsBatchToDb(productsToSave);
  } catch (err) {
    console.warn('Falha no batch de produtos, tentando salvar individualmente:', err);
    for (const p of productsToSave) {
      await saveProductToDb(p).catch(e => console.error(`Erro ao salvar produto ${p.codigo}:`, e));
    }
  }

  // 2. Atualizar catálogo local em memória e no localStorage
  const updatedCatalog = [...currentCatalog];
  productsToSave.forEach(savedP => {
    const idx = updatedCatalog.findIndex(p => 
      p.id === savedP.id || 
      (p.codigo && savedP.codigo && p.codigo.trim().toUpperCase() === savedP.codigo.trim().toUpperCase()) ||
      (p.descricao && savedP.descricao && p.descricao.trim().toLowerCase() === savedP.descricao.trim().toLowerCase())
    );
    if (idx >= 0) {
      updatedCatalog[idx] = {
        ...updatedCatalog[idx],
        ...savedP
      };
    } else {
      updatedCatalog.push(savedP);
    }
  });

  saveProductsList(updatedCatalog);
  return updatedCatalog;
}

// Alias para compatibilidade anterior
export const persistNewProducts = persistImportedCatalogProducts;
