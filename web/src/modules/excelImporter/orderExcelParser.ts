import * as XLSX from 'xlsx';
import { 
  ExcelImportHeader, 
  ExcelImportRawItem, 
  ExcelImportFiscalParams, 
  ParsedExcelOrder 
} from './types';
import { parseExcelDate } from './excelDateHelper';

/**
 * Realiza a leitura e extração estruturada dos dados da planilha de pedido do Excel.
 */
export function parseOrderExcelFile(
  dataBuffer: ArrayBuffer, 
  fileName: string
): ParsedExcelOrder {
  const workbook = XLSX.read(dataBuffer, { type: 'array' });

  // 1. Identificar a aba comercial do pedido
  const sheetName = findCommercialSheet(workbook);
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Não foi possível localizar a aba de itens comerciais no arquivo ${fileName}`);
  }

  // Obter dados da planilha como matriz bidimensional
  const sheetMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1, 
    raw: true, 
    defval: '' 
  });

  // 2. Extrair Cabeçalho do Pedido
  const header = extractHeaderFromMatrix(sheetMatrix);

  // Sanitiza número de pedido extraído da planilha para evitar textos espúrios
  if (header.numeroPedido && (header.numeroPedido.toUpperCase().includes('FORNECEDOR') || header.numeroPedido.toUpperCase().includes('IMPORTADO'))) {
    header.numeroPedido = '';
  }

  // 3. Localizar e extrair a tabela de produtos/itens
  const items = extractItemsFromMatrix(sheetMatrix);

  // 4. Extrair parâmetros fiscais (se houver aba "LIMITE DE PRECO" ou similar)
  const fiscalParams = extractFiscalParams(workbook);

  // 5. Extrair grade de separação de lojas (se houver aba "SEPARACAO")
  const storeAllocations = extractStoreSeparation(workbook);

  // 6. Totais consolidados
  const totalItens = items.length;
  const totalPecas = items.reduce((sum, item) => sum + (item.qtdTotalUnidades || 0), 0);
  const valorTotalGeral = items.reduce((sum, item) => sum + (item.valorTotalBruto || 0), 0);

  return {
    fileName,
    sheetName,
    header,
    items,
    fiscalParams,
    storeAllocations,
    totalItens,
    totalPecas,
    valorTotalGeral
  };
}

/**
 * Encontra a aba comercial do pedido (ignora abas acessórias como SEPARACAO, CALCULADORA, LIMITE DE PRECO).
 */
function findCommercialSheet(workbook: XLSX.WorkBook): string {
  const ignoredNames = ['SEPARACAO', 'SEPARAÇÃO', 'LIMITE DE PRECO', 'LIMITE DE PREÇO', 'CALCULADORA', 'GRAFICO', 'RESUMO'];
  
  // Se tiver apenas 1 aba
  if (workbook.SheetNames.length === 1) {
    return workbook.SheetNames[0];
  }

  // Procura primeira aba que não esteja na lista de ignoradas
  for (const name of workbook.SheetNames) {
    const upper = name.trim().toUpperCase();
    if (!ignoredNames.includes(upper)) {
      return name;
    }
  }

  return workbook.SheetNames[0];
}

/**
 * Extrai os dados do cabeçalho da matriz de células da planilha comercial.
/**
 * Verifica se um valor de célula pertence aos dados cadastrais e de contato da nossa empresa compradora
 * (Mega 12 / ALS Conecta), que devem ser ignorados para evitar que sejam atribuídos ao fornecedor ou vendedor.
 */
function isBuyerCompanyData(val: any): boolean {
  if (val === null || val === undefined) return false;
  const str = String(val).trim();
  if (!str) return false;

  // CNPJ da nossa empresa (Mega 12 / ALS Conecta)
  if (str.includes('37.144.240/0001-70') || str.replace(/\D/g, '') === '37144240000170') return true;

  // Nomes da nossa empresa compradora
  if (/ALS\s*10\s*BAZAR/i.test(str) || /MEGA\s*12/i.test(str) || /ALS\s*CONECTA/i.test(str)) return true;

  // E-mails da nossa empresa
  if (/als\.conecta@gmail\.com/i.test(str) || /@mega12\./i.test(str)) return true;

  // Telefones institucionais da nossa empresa
  if (str.includes('9136-5009') || str.replace(/\D/g, '').includes('42991365009')) return true;

  // Contatos da equipe interna compradora (ex: Rafael (55) 9. 9659-6315, Bruna (55) 9. 3618-5609)
  if (/^Rafael\s*\(?55\)?/i.test(str) || str.includes('9659-6315') || str.replace(/\D/g, '').includes('55996596315')) return true;
  if (/^Bruna\s*\(?55\)?/i.test(str) || str.includes('3618-5609') || str.replace(/\D/g, '').includes('55936185609')) return true;

  // Cabeçalhos institucionais do pedido da empresa
  if (/^PEDIDO DE COMPRA/i.test(str)) return true;

  return false;
}

/**
 * Extrai os dados do cabeçalho da matriz de células da planilha comercial.
 */
function extractHeaderFromMatrix(matrix: any[][]): ExcelImportHeader {
  let numeroPedido = '';
  let fornecedorNome = '';
  let cnpj = '';
  let email = '';
  let telefoneEmpresa = '';
  let telefoneContato = '';
  let vendedor = '';
  let telefoneVendedor = '';
  let condicaoPagamento = '';
  let percentualDescontoOff = 0;
  let percentualNota: number | undefined = undefined;
  let dataPedidoVal: any = null;
  let dataEntregaVal: any = null;
  const observacoesList: string[] = [];
  let tipoFrete: 'CIF' | 'FOB' | 'Retira' = 'Retira';

  // Determinar onde inicia a tabela de itens para limitar a varredura do cabeçalho
  let tableHeaderRowIndex = -1;
  for (let r = 0; r < Math.min(matrix.length, 25); r++) {
    const row = matrix[r] || [];
    const rowText = row.map(c => String(c).toUpperCase().trim());
    if (rowText.some(t => t.includes('CODIGO') || t.includes('CÓDIGO') || t.includes('DESCRICAO') || t.includes('DESCRIÇÃO') || t.includes('REFER'))) {
      tableHeaderRowIndex = r;
      break;
    }
  }
  const maxHeaderRow = tableHeaderRowIndex !== -1 ? tableHeaderRowIndex : 15;

  // 1. Linha 3 do Excel legado (índice 2): FORNECEDOR (Col A/B), DATA ENTREGA (Col H/I)
  const rowExcel3 = matrix[2] || [];
  const cellA3 = String(rowExcel3[0] || '').trim();
  if (cellA3.toUpperCase().startsWith('FORNECEDOR:')) {
    const ext = cellA3.replace(/^FORNECEDOR:\s*/i, '').trim();
    if (ext && !isBuyerCompanyData(ext)) fornecedorNome = ext;
    else if (rowExcel3[1] && !isBuyerCompanyData(rowExcel3[1])) fornecedorNome = String(rowExcel3[1]).trim();
  }

  // Contato do fornecedor em Col E..G (índices 4..6) em planilhas legadas
  for (let c = 4; c <= 6; c++) {
    const contactVal = String(rowExcel3[c] || '').trim();
    if (contactVal && !isBuyerCompanyData(contactVal)) {
      if (contactVal.includes('@')) email = contactVal;
      else telefoneEmpresa = contactVal;
      break;
    }
  }

  // 2. Linha 4 do Excel legado (índice 3): VENDEDOR (Col A/B) e CONTATO DO VENDEDOR (Col E..G)
  const rowExcel4 = matrix[3] || [];
  const cellA4 = String(rowExcel4[0] || '').trim();
  if (cellA4.toUpperCase().startsWith('VENDEDOR:')) {
    const ext = cellA4.replace(/^VENDEDOR:\s*/i, '').trim();
    if (ext && !isBuyerCompanyData(ext)) vendedor = ext;
    else if (rowExcel4[1] && !isBuyerCompanyData(rowExcel4[1])) vendedor = String(rowExcel4[1]).trim();
  }

  // Contato do vendedor na Linha 4 (sob CONTATO, Col E..G)
  for (let c = 4; c <= 6; c++) {
    const contactVal = String(rowExcel4[c] || '').trim();
    if (contactVal && !isBuyerCompanyData(contactVal)) {
      telefoneVendedor = contactVal;
      break;
    }
  }

  // 3. Linha 5 do Excel legado (índice 4): COND. PAG. (Col A/B)
  const rowExcel5 = matrix[4] || [];
  const cellA5 = String(rowExcel5[0] || '').trim();
  if (cellA5.toUpperCase().startsWith('COND. PAG.')) {
    const ext = cellA5.replace(/^COND\.\s*PAG\.\s*:?\s*/i, '').trim();
    if (ext) condicaoPagamento = ext;
    else if (rowExcel5[1]) condicaoPagamento = String(rowExcel5[1]).trim();
  }

  // 4. Varredura geral das linhas do cabeçalho (antes da grade de produtos)
  for (let r = 0; r < maxHeaderRow; r++) {
    const row = matrix[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || '').trim();
      if (!cellVal) continue;

      const upper = cellVal.toUpperCase();
      const nextCellVal = String(row[c + 1] || '').trim();

      // N° PEDIDO / Nº PEDIDO
      if (upper.includes('N° PEDIDO') || upper.includes('NUMERO PEDIDO') || upper.includes('Nº PEDIDO') || upper.startsWith('Nº PEDIDO:') || upper.startsWith('N° PEDIDO:')) {
        let extNum = cellVal.replace(/^N[°º]\s*PEDIDO:?\s*/i, '').trim();
        if (!extNum && nextCellVal && !nextCellVal.toUpperCase().includes('FORNECEDOR') && !nextCellVal.toUpperCase().includes('CONTATO')) {
          extNum = nextCellVal;
        }
        if (extNum && !isBuyerCompanyData(extNum)) {
          numeroPedido = extNum;
        }
      }

      // FORNECEDOR / RAZÃO SOCIAL DO FORNECEDOR
      // No modelo novo, fica na coluna H (c >= 6) com rótulo "Razão Social:" ou "Fornecedor:"
      if (upper === 'FORNECEDOR:' || upper === 'RAZÃO SOCIAL:' || upper === 'RAZAO SOCIAL:' || upper.startsWith('FORNECEDOR:')) {
        let extracted = cellVal.replace(/^(FORNECEDOR|RAZÃO SOCIAL|RAZAO SOCIAL):?\s*/i, '').trim();
        if (!extracted && nextCellVal) extracted = nextCellVal;
        if (extracted && !isBuyerCompanyData(extracted)) {
          // Se for na coluna 0, só aceita se for claramente fornecedor
          if (c >= 6 || !fornecedorNome) {
            fornecedorNome = extracted;
          }
        }
      }

      // VENDEDOR
      if (upper === 'VENDEDOR:' || upper.startsWith('VENDEDOR:')) {
        let extracted = cellVal.replace(/^VENDEDOR:\s*/i, '').trim();
        if (!extracted && nextCellVal) extracted = nextCellVal;
        if (extracted && !isBuyerCompanyData(extracted)) {
          vendedor = extracted;
        }
      }

      // WHATSAPP / TELEFONE DO VENDEDOR / CONTATO
      if (upper.includes('WHATSAPP') || upper.includes('FONE') || upper.includes('CONTATO DO VENDEDOR')) {
        if (nextCellVal && !isBuyerCompanyData(nextCellVal)) {
          telefoneVendedor = nextCellVal;
        }
      }

      // EMAIL
      if (upper.includes('E-MAIL VENDAS') || upper.includes('EMAIL COMERCIAL') || upper.includes('E-MAIL:')) {
        if (nextCellVal && !isBuyerCompanyData(nextCellVal)) {
          email = nextCellVal;
        }
      }

      // COND. PAG.
      if (upper.startsWith('COND. PAG') || upper.startsWith('CONDICAO PAG') || upper.startsWith('COND. PAGAMENTO')) {
        let extracted = cellVal.replace(/^COND\.\s*PAG\w*\.?\s*:?\s*/i, '').trim();
        if (!extracted && nextCellVal) {
          extracted = nextCellVal;
        }
        if (extracted) {
          condicaoPagamento = extracted;
        }
      }

      // % NOTA (Faturado em NF)
      if (
        upper === '% NOTA' || upper === '% NOTA:' || upper === '% NOTA FISCAL' || 
        upper === '% NF' || upper === 'NOTA FISCAL %' || upper === '% FATURADO' ||
        upper.startsWith('% NOTA') || upper.startsWith('NOTA FISCAL')
      ) {
        let notaRaw: any = null;
        // Verifica se o valor veio na mesma célula (ex: "% NOTA: 100%")
        const inlineMatch = cellVal.match(/(?:%\s*NOTA|NOTA\s*FISCAL)\s*:?\s*(\d+(?:[.,]\d+)?\s*%?)/i);
        if (inlineMatch && inlineMatch[1]) {
          notaRaw = inlineMatch[1];
        } else {
          const nextColVal = row[c + 1];
          const nextRowVal = matrix[r + 1]?.[c];
          notaRaw = (nextColVal !== undefined && nextColVal !== '') ? nextColVal : nextRowVal;
        }
        const parsedNota = parsePercentage(notaRaw);
        if (parsedNota > 0) {
          percentualNota = parsedNota;
        }
      }

      // % OFF / DESCONTO COMERCIAL (Desconto Direto Comercial Negociado)
      const isOffOrDiscountHeader = (
        upper === '% OFF' || upper === '% OFF:' || upper === 'OFF %' || upper === 'OFF %:' || 
        upper === 'OFF%' || upper === '%OFF' || upper === 'DESCONTO OFF' || upper === 'DESCONTO OFF:' ||
        upper === 'DESCONTO COMERCIAL' || upper === 'DESCONTO COMERCIAL:' || 
        upper === 'DESCONTO COMERCIAL (%)' || upper === 'DESCONTO COMERCIAL (%):' ||
        upper === 'DESC. COMERCIAL' || upper === 'DESC. COMERCIAL:' || 
        upper === 'DESC. COMERCIAL (%)' || upper === 'DESC. COMERCIAL (%):' ||
        upper === 'DESC COMERCIAL' || upper === 'DESC COMERCIAL (%)' ||
        upper === 'DESCONTO (%)' || upper === 'DESCONTO (%):' ||
        upper === 'DESC (%)' || upper === 'DESC (%):' ||
        upper === 'DESCONTO:' || upper === '% DESCONTO' || upper === '% DESC' ||
        upper.includes('% OFF') || upper.includes('OFF %') || upper.includes('DESCONTO COMERCIAL') ||
        (upper.startsWith('DESCONTO') && !upper.includes('TOTAL') && !upper.includes('ITEM') && !upper.includes('PRODUTO'))
      );

      if (isOffOrDiscountHeader && !upper.includes('DESCARGA') && !upper.includes('DESCARREGAMENTO')) {
        let offRaw: any = null;
        // Verifica se o valor veio na mesma célula (ex: "% OFF: 5%" ou "Desconto Comercial: 10%")
        const inlineMatch = cellVal.match(/(?:%\s*OFF|OFF\s*%|DESCONTO(?:\s*COMERCIAL)?|DESC\.?(?:\s*COMERCIAL)?)\s*:?\s*(\d+(?:[.,]\d+)?\s*%?)/i);
        if (inlineMatch && inlineMatch[1]) {
          offRaw = inlineMatch[1];
        } else {
          const nextColVal = row[c + 1];
          const nextRowVal = matrix[r + 1]?.[c];
          offRaw = (nextColVal !== undefined && nextColVal !== '') ? nextColVal : nextRowVal;
        }
        const parsedOff = parsePercentage(offRaw);
        if (parsedOff > 0) {
          percentualDescontoOff = parsedOff;
        }
      }

      // DATA PEDIDO
      if (upper.includes('DATA PEDIDO')) {
        const nextColVal = row[c + 1];
        const nextRowVal = matrix[r + 1]?.[c];
        dataPedidoVal = (nextColVal !== undefined && nextColVal !== '') ? nextColVal : nextRowVal;
      }

      // DATA ENTREGA / ENTREGA
      if (upper === 'ENTREGA:' || upper.includes('DATA ENTREGA') || upper.includes('PREVISÃO DE ENTREGA') || upper.includes('PREVISAO DE ENTREGA')) {
        const nextColVal = row[c + 1];
        const nextRowVal = matrix[r + 1]?.[c];
        dataEntregaVal = (nextColVal !== undefined && nextColVal !== '') ? nextColVal : nextRowVal;
      }

      // FRETE / TIPO FRETE
      if (upper.includes('FRETE')) {
        const freteText = cellVal.replace(/^TIPO\s*FRETE:?\s*|^FRETE:?\s*/i, '').trim() || String(row[c + 1] || '').trim().toUpperCase();
        if (freteText.includes('FOB')) tipoFrete = 'FOB';
        else if (freteText.includes('CIF')) tipoFrete = 'CIF';
        else if (freteText.includes('RETIRA')) tipoFrete = 'Retira';
      }

      // CNPJ do fornecedor (que não seja da empresa compradora)
      const cnpjMatch = cellVal.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
      if (cnpjMatch && !cnpj && !isBuyerCompanyData(cnpjMatch[0])) {
        cnpj = cnpjMatch[0];
      }
      if (nextCellVal) {
        const nextCnpjMatch = nextCellVal.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
        if (nextCnpjMatch && !cnpj && !isBuyerCompanyData(nextCnpjMatch[0])) {
          cnpj = nextCnpjMatch[0];
        }
      }

      // Email do fornecedor (que não seja da nossa empresa)
      const emailMatch = cellVal.match(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/);
      if (emailMatch && !email && !isBuyerCompanyData(emailMatch[0])) {
        email = emailMatch[0];
      }
      if (nextCellVal) {
        const nextEmailMatch = nextCellVal.match(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/);
        if (nextEmailMatch && !email && !isBuyerCompanyData(nextEmailMatch[0])) {
          email = nextEmailMatch[0];
        }
      }

      // Telefone da empresa fornecedora
      const phoneMatch = cellVal.match(/\(?\d{2}\)?\s*9?\.?\s*\d{4,5}[-\s]?\d{4}/);
      if (phoneMatch && !telefoneEmpresa && !isBuyerCompanyData(phoneMatch[0]) && phoneMatch[0] !== telefoneVendedor) {
        telefoneEmpresa = phoneMatch[0].trim();
      }

      // Textos operacionais e observações na área do pedido
      if (upper.startsWith('OBSERVAÇÕES') || upper.startsWith('OBSERVACOES') || upper.startsWith('OBSERVAÇÃO') || upper.startsWith('OBSERVACAO')) {
        let obsText = cellVal.replace(/^OBSERVA[ÇC][ÕO0]ES?:?\s*/i, '').trim();
        if (!obsText && nextCellVal) obsText = nextCellVal;
        if (obsText && !isBuyerCompanyData(obsText) && !observacoesList.includes(obsText)) {
          observacoesList.push(obsText);
        }
      } else if (upper.includes('DESCARREGAMENTO') || upper.includes('DESCARGA') || upper.includes('PALETE') || upper.includes('BOLETOS E PEDIDOS')) {
        if (!isBuyerCompanyData(cellVal) && !observacoesList.includes(cellVal)) {
          observacoesList.push(cellVal);
        }
      }
    }
  }

  // Fallbacks e formatações de dados
  const dataPedido = parseExcelDate(dataPedidoVal, 0);
  const dataEntregaPrevista = parseExcelDate(dataEntregaVal, 15);

  telefoneContato = telefoneEmpresa || telefoneVendedor || '';
  const contatoVendedor = telefoneVendedor || telefoneContato || email || '';

  return {
    numeroPedido,
    fornecedorNome: fornecedorNome || '',
    cnpj,
    email,
    telefoneContato,
    telefoneEmpresa,
    vendedor,
    telefoneVendedor,
    contatoVendedor,
    condicaoPagamento: condicaoPagamento || '30/60/90 Dias',
    percentualDescontoOff,
    percentualNota,
    dataPedido,
    dataEntregaPrevista,
    observacoes: observacoesList.join(' | '),
    tipoFrete
  };
}

/**
 * Localiza a linha do cabeçalho da tabela de itens e extrai os produtos.
 */
function extractItemsFromMatrix(matrix: any[][]): ExcelImportRawItem[] {
  let headerRowIndex = -1;
  let colMap: Record<string, number> = {};

  // Procurar a linha onde estão as colunas (CODIGO, DESCRICAO, VALOR TOTAL...)
  for (let r = 0; r < Math.min(matrix.length, 25); r++) {
    const row = matrix[r] || [];
    const rowText = row.map(c => String(c).toUpperCase().trim());
    
    if (rowText.some(t => t.includes('CODIGO') || t.includes('CÓDIGO') || t.includes('DESCRICAO') || t.includes('DESCRIÇÃO') || t.includes('REFER'))) {
      headerRowIndex = r;
      row.forEach((cell, c) => {
        const clean = String(cell).toUpperCase().trim();
        if (!clean) return;

        // 1. CÓDIGO FORNECEDOR / REFERÊNCIA
        if (
          (clean.includes('FORNECEDOR') && (clean.includes('COD') || clean.includes('CÓD') || clean.includes('REF'))) ||
          (clean.includes('REF') && (clean.includes('FABRICA') || clean.includes('FÁBRICA') || clean.includes('FORNEC') || clean.includes('PRODUTO'))) ||
          clean === 'REF. FÁBRICA' || clean === 'REF FABRICA' || clean === 'REF.' || clean === 'REF' ||
          clean === 'CÓD. FORNECEDOR' || clean === 'COD. FORNECEDOR' || clean === 'COD FORN' || clean === 'REF FORN' ||
          clean === 'REFERÊNCIA DE FÁBRICA' || clean === 'REFERENCIA DE FABRICA' || clean === 'REFERENCIA' || clean === 'REFERÊNCIA'
        ) {
          colMap['codigoFornecedor'] = c;
        }
        // 2. CÓDIGO INTERNO (PRD)
        else if (clean.includes('INTERNO') || clean.includes('PRD') || clean.includes('MEGA12') || clean.includes('REDE')) {
          colMap['codigoInterno'] = c;
        }
        // 3. CÓDIGO DE BARRAS (EAN-13)
        else if (clean.includes('EAN') || clean.includes('BARRAS') || clean.includes('BARCODE') || clean.includes('GTIN')) {
          colMap['ean'] = c;
        }
        // 4. CÓDIGO GENÉRICO
        else if (clean.includes('CODIGO') || clean.includes('CÓDIGO') || clean.includes('COD.') || clean.includes('CÓD.')) {
          if (colMap['codigo'] === undefined) colMap['codigo'] = c;
        }
        // 5. DESCRIÇÃO DO PRODUTO
        else if (
          clean.includes('DESCRICAO') || clean.includes('DESCRIÇÃO') ||
          (clean.includes('PRODUTO') && !clean.includes('COD') && !clean.includes('CÓD') && !clean.includes('VALOR') && !clean.includes('PRECO') && !clean.includes('PREÇO')) ||
          clean === 'ITEM' || clean === 'DISCRIMINAÇÃO' || clean === 'DISCRIMINACAO' || clean === 'DESC' || clean === 'PRODUTO' || clean === 'PRODUTOS'
        ) {
          colMap['descricao'] = c;
        }
        // 6. NCM
        else if (clean === 'NCM' || clean.includes('NCM') || clean.includes('CLASSIFICA')) {
          colMap['ncm'] = c;
        }
        // 7. UNIDADE DE MEDIDA
        else if (
          clean === 'UNID.' || clean === 'UNID' || clean === 'UN' || clean === 'UND' || 
          clean === 'UNIDADE' || clean.includes('UNIDADE DE MEDIDA') || clean === 'UM' || clean === 'U.M.' || clean === 'MEDIDA'
        ) {
          colMap['unidade'] = c;
        }
        // 8. QUANTIDADE POR EMBALAGEM / QTD NO PAC
        else if (
          clean.includes('EMBALAGEM') || clean.includes('QTD/CX') || clean.includes('QTD NO PAC') || 
          clean.includes('QTD NO PEC') || clean.includes('QTD POR PACOTE') || clean.includes('UN/CX') || 
          clean.includes('UN/PAC') || clean === 'EMB' || clean === 'CX' || clean.includes('QTD/PAC') || 
          clean.includes('QTD POR CX') || clean.includes('PECAS/CX') || clean.includes('PEÇAS/CX') || 
          clean.includes('UNIDADES/CX') || clean.includes('QTD EMB') || clean.includes('QTD/EMB')
        ) {
          colMap['embalagem'] = c;
        }
        // 9. QUANTIDADE DE PACOTES / CAIXAS / QTD DE PAC
        else if (
          clean.includes('PACOTES') || clean.includes('PACOTE') || clean.includes('QTD CX') || 
          clean.includes('QTD DE PEC') || clean.includes('QTD DE PAC') || clean.includes('QTD PAC') || 
          clean.includes('QTD. PAC') || clean.includes('QTD CAIXA') || clean.includes('QTD CAIXAS') || 
          clean.includes('QTDE CX') || clean.includes('QTDE CAIXAS') || clean.includes('TOTAL CX') || 
          clean.includes('TOTAL PAC') || clean.includes('TOTAL CAIXAS') || clean.includes('NUM CAIXAS') || 
          clean.includes('Nº CAIXAS') || clean.includes('QTD DE PACOTES') || clean.includes('QTD DE PACOTE')
        ) {
          colMap['pacotes'] = c;
        }
        // 10. VALOR TOTAL / TOTAL R$ (avaliado antes de preço unitário e unidades)
        else if (
          clean.includes('VALOR TOTAL') || clean.includes('TOTAL R$') || clean.includes('TOTAL (R$)') || 
          clean.includes('PREÇO TOTAL') || clean.includes('PRECO TOTAL') || clean.includes('VLR TOTAL') || 
          clean.includes('VL TOTAL') || clean.includes('VR TOTAL') || clean.includes('SUBTOTAL') || 
          clean === 'TOTAL LIQUIDO' || clean === 'TOTAL LÍQUIDO' || clean === 'TOTAL'
        ) {
          colMap['total'] = c;
        }
        // 11. QUANTIDADE TOTAL DE PEÇAS / UNIDADES (TOTAL PEÇAS)
        // Regra anti-conflito: não pode conter termos monetários
        else if (
          !clean.includes('R$') && !clean.includes('VALOR') && !clean.includes('PRECO') && 
          !clean.includes('PREÇO') && !clean.includes('CUSTO') && !clean.includes('$') && (
            clean.includes('TOTAL PEÇAS') || clean.includes('TOTAL PECAS') || clean.includes('TOTAL DE PEÇAS') || 
            clean.includes('TOTAL DE PECAS') || clean.includes('TOTAL UNIDADE') || clean.includes('TOTAL UNIDADES') || 
            clean.includes('QTD UNI') || clean === 'UNIDADES' || clean.includes('QTD TOTAL') || 
            clean.includes('QTDE TOTAL') || clean.includes('QUANTIDADE TOTAL') || clean.includes('QTD PEDIDA') || 
            clean.includes('QUANTIDADE PEDIDA') || clean.includes('TOTAL PEC') || clean.includes('TOTAL PAC')
          )
        ) {
          colMap['unidades'] = c;
        }
        // 12. PREÇO UNITÁRIO / VALOR
        // Suporte abrangente a todos os formatos de preço unitário
        else if (
          !clean.includes('TOTAL') && !clean.includes('IPI') && !clean.includes('DESC') && (
            clean.includes('R$ UNIT') || clean === 'UNIT' || clean === 'UNIT.' || clean.includes('PRECO UNIT') || 
            clean.includes('PREÇO UNIT') || clean.includes('VALOR UNIT') || clean === 'PREÇO' || clean === 'PRECO' || 
            clean === 'PREÇO (R$)' || clean === 'PRECO (R$)' || clean === 'VALOR' || clean === 'VALOR (R$)' || 
            clean === 'VALOR DO ITEM' || clean === 'VALOR ITEM' || clean.includes('VR UNIT') || clean.includes('VL UNIT') || 
            clean.includes('VLR UNIT') || clean.includes('VR. UNIT') || clean.includes('VL. UNIT') || clean.includes('VLR. UNIT') || 
            clean.includes('PREÇO TABELA') || clean.includes('PRECO TABELA') || clean.includes('VALOR TABELA') || 
            clean.includes('PREÇO LIQ') || clean.includes('PREÇO LÍQUIDO') || clean.includes('PRECO LIQUIDO') || 
            clean === 'UNITÁRIO' || clean === 'UNITARIO' || clean === 'R$' || clean === 'R$/UN' || clean === 'R$/UND' || 
            clean.includes('CUSTO UNIT') || clean === 'CUSTO'
          )
        ) {
          colMap['unit'] = c;
        }
        // 13. VALOR IPI
        else if (
          clean.includes('VALOR IPI') || clean.includes('TOTAL IPI') || clean.includes('IPI (R$)') || 
          clean.includes('IPI R$') || clean.includes('VR IPI') || clean.includes('VL IPI') || clean.includes('VLR IPI')
        ) {
          colMap['valorIpi'] = c;
        }
        // 14. % IPI
        else if (
          clean.includes('% IPI') || clean.includes('IPI %') || clean === 'IPI' || clean.includes('ALIQ IPI') || 
          clean.includes('ALÍQUOTA IPI') || clean.includes('ALIQUOTA IPI') || clean === 'IPI (%)' || clean.includes('% DE IPI')
        ) {
          colMap['ipi'] = c;
        }
        // 15. PDV SUGERIDO
        else if (
          clean === 'PDV' || clean.includes('PDV SUGERIDO') || clean.includes('PREÇO VENDA') || 
          clean.includes('PRECO VENDA') || clean.includes('VALOR VENDA') || clean.includes('SUGESTÃO VENDA') || 
          clean.includes('SUGESTAO VENDA') || clean === 'VENDA'
        ) {
          colMap['pdv'] = c;
        }
        // 16. CUSTO TOTAL
        else if (clean.includes('CUSTO TOTAL') || clean.includes('CUSTO LOJA') || clean.includes('CUSTO FORN')) {
          colMap['custoTotal'] = c;
        }
        // 17. MARGEM
        else if (clean.includes('MARGEM')) {
          colMap['margem'] = c;
        }
        // 18. DESCONTO EM VALOR (R$)
        else if (
          clean.includes('VALOR DESC') || clean === 'DESC (R$)' || clean.includes('DESCONTO (R$)') || 
          clean.includes('DESC R$') || clean.includes('DESCONTO R$')
        ) {
          colMap['descontoValor'] = c;
        }
        // 19. DESCONTO EM PERCENTUAL (%)
        else if (
          (clean.includes('DESC') || clean.includes('DESCONTO') || clean.includes('OFF')) && 
          !clean.includes('DESCR') && !clean.includes('R$') && !clean.includes('VALOR')
        ) {
          colMap['descontoPct'] = c;
        }
      });

      if (colMap['codigo'] === undefined) {
        colMap['codigo'] = colMap['codigoFornecedor'] ?? colMap['codigoInterno'] ?? 0;
      }

      // Se a coluna de preço unitário não tiver título explícito mas estiver entre unidades e valor total
      if (colMap['unit'] === undefined && colMap['unidades'] !== undefined && colMap['total'] !== undefined && colMap['total'] - colMap['unidades'] === 2) {
        colMap['unit'] = colMap['unidades'] + 1;
      }
      break;
    }
  }

  // Se não achou pelos nomes das colunas, usa o layout padrão observado em CONECTA 210726.xlsx
  if (headerRowIndex === -1) {
    headerRowIndex = 7; // Linha 8
    colMap = {
      codigo: 0,
      descricao: 1,
      embalagem: 5,
      pacotes: 6,
      unidades: 7,
      unit: 8,
      total: 9
    };
  }

  const items: ExcelImportRawItem[] = [];

  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    
    const codFornecRaw = colMap['codigoFornecedor'] !== undefined ? String(row[colMap['codigoFornecedor']] || '').trim() : '';
    const codInternoRaw = colMap['codigoInterno'] !== undefined ? String(row[colMap['codigoInterno']] || '').trim() : '';
    const codigoRaw = String(row[colMap['codigo'] ?? 0] || '').trim() || codFornecRaw || codInternoRaw;
    const descRaw = String(row[colMap['descricao'] ?? 1] || '').trim();

    // Se a descrição indicar resumo de total ou for linha vazia, encerra a leitura de itens
    if (!descRaw && !codigoRaw) continue;
    const upperDesc = descRaw.toUpperCase();
    const upperCod = codigoRaw.toUpperCase();
    if (upperDesc.startsWith('TOTAL') || upperCod.startsWith('TOTAL') || upperDesc.startsWith('RESUMO') ||
        upperCod.startsWith('POSSUI AVARIAS') || upperDesc.startsWith('POSSUI AVARIAS') ||
        upperCod.startsWith('PREÇO MÉDIO') || upperDesc.startsWith('PREÇO MÉDIO') ||
        upperCod.startsWith('**') || upperDesc.startsWith('**')) {
      break;
    }

    // Leitura das colunas identificadas (sem fallbacks arbitrários de índices deslocados)
    const qtdNoPacote = (colMap['embalagem'] !== undefined ? parseNumber(row[colMap['embalagem']]) : 0) || 1;
    let qtdPacotes = colMap['pacotes'] !== undefined ? parseNumber(row[colMap['pacotes']]) : 0;
    let precoUnitario = colMap['unit'] !== undefined ? parseNumber(row[colMap['unit']]) : 0;
    let qtdTotalUnidades = colMap['unidades'] !== undefined ? parseNumber(row[colMap['unidades']]) : 0;
    let valorTotalBruto = colMap['total'] !== undefined ? parseNumber(row[colMap['total']]) : 0;

    // Sincronização e Inteligência Recíproca:
    // 1. Se informou pacotes e embalagem mas não unidades: calcula unidades = pacotes * embalagem
    if (!qtdTotalUnidades && qtdPacotes > 0) {
      qtdTotalUnidades = qtdPacotes * qtdNoPacote;
    }
    // 2. Se informou unidades mas não pacotes: calcula pacotes = unidades / embalagem
    else if (!qtdPacotes && qtdTotalUnidades > 0 && qtdNoPacote > 0) {
      qtdPacotes = Math.round((qtdTotalUnidades / qtdNoPacote) * 100) / 100;
    }

    // 3. Se não tem preço unitário mas tem valor total e unidades: calcula preço = total / unidades
    if (!precoUnitario && valorTotalBruto > 0 && qtdTotalUnidades > 0) {
      precoUnitario = Number((valorTotalBruto / qtdTotalUnidades).toFixed(4));
    }
    // 4. Se não tem valor total mas tem preço e unidades: calcula total = unidades * preço
    if (!valorTotalBruto && precoUnitario > 0 && qtdTotalUnidades > 0) {
      valorTotalBruto = Number((qtdTotalUnidades * precoUnitario).toFixed(2));
    }

    // Heurística Anti-Inversão:
    // Se precoUnitario é 0 e qtdTotalUnidades > 0, mas colMap['unit'] não foi achado na planilha
    // e o usuário colocou o preço em uma coluna adjacente não mapeada:
    if (precoUnitario === 0 && colMap['unit'] === undefined) {
      for (let c = 0; c < row.length; c++) {
        if (c !== colMap['embalagem'] && c !== colMap['pacotes'] && c !== colMap['unidades'] && c !== colMap['codigo'] && c !== colMap['descricao']) {
          const possiblePrice = parseNumber(row[c]);
          if (possiblePrice > 0) {
            precoUnitario = possiblePrice;
            if (!valorTotalBruto && qtdTotalUnidades > 0) {
              valorTotalBruto = Number((qtdTotalUnidades * precoUnitario).toFixed(2));
            }
            break;
          }
        }
      }
    }

    // Linha vazia ou sem identificação de produto: ignora
    if (!descRaw && !codFornecRaw && !codInternoRaw) {
      continue;
    }

    if (!valorTotalBruto) {
      valorTotalBruto = (colMap['total'] !== undefined ? parseNumber(row[colMap['total']]) : 0) || (qtdTotalUnidades * precoUnitario);
    }
    const pdvSugerido = colMap['pdv'] !== undefined ? parseNumber(row[colMap['pdv']]) : 0;
    const ncm = colMap['ncm'] !== undefined ? String(row[colMap['ncm']] || '').trim() : '';
    const eanBarcode = colMap['ean'] !== undefined ? String(row[colMap['ean']] || '').trim() : '';
    const unidadeMedida = colMap['unidade'] !== undefined ? String(row[colMap['unidade']] || '').trim() : undefined;
    const aliquotaIpiRaw = colMap['ipi'] !== undefined ? parseNumber(row[colMap['ipi']]) : undefined;
    const aliquotaIpi = aliquotaIpiRaw !== undefined ? (aliquotaIpiRaw <= 1 && aliquotaIpiRaw > 0 ? aliquotaIpiRaw * 100 : aliquotaIpiRaw) : undefined;
    const valorIpi = colMap['valorIpi'] !== undefined ? parseNumber(row[colMap['valorIpi']]) : undefined;
    const percentualDesconto = colMap['descontoPct'] !== undefined ? parsePercentage(row[colMap['descontoPct']]) : undefined;
    const valorDescontoItem = colMap['descontoValor'] !== undefined ? parseNumber(row[colMap['descontoValor']]) : undefined;
    const custoTotalInformado = colMap['custoTotal'] !== undefined ? parseNumber(row[colMap['custoTotal']]) : undefined;
    const margemInformada = colMap['margem'] !== undefined ? parseNumber(row[colMap['margem']]) : undefined;

    items.push({
      rowNumber: r + 1,
      codigo: codigoRaw || `ITEM-${items.length + 1}`,
      codigoFornecedor: codFornecRaw || codigoRaw || undefined,
      codigoInterno: codInternoRaw || undefined,
      descricao: descRaw,
      ncm: ncm || undefined,
      eanBarcode: eanBarcode || undefined,
      unidadeMedida: unidadeMedida || undefined,
      qtdNoPacote,
      qtdPacotes,
      qtdTotalUnidades: Math.round(qtdTotalUnidades),
      precoUnitario,
      aliquotaIpi,
      valorIpi,
      percentualDesconto: percentualDesconto || undefined,
      valorDescontoItem: valorDescontoItem || undefined,
      valorTotalBruto,
      pdvSugerido,
      custoTotalInformado: custoTotalInformado || undefined,
      margemInformada: margemInformada || undefined
    });
  }

  return items;
}

/**
 * Extrai parâmetros fiscais se houver aba de configuração fiscal como "LIMITE DE PRECO".
 */
function extractFiscalParams(workbook: XLSX.WorkBook): ExcelImportFiscalParams | undefined {
  const fiscalSheetName = workbook.SheetNames.find(n => {
    const up = n.toUpperCase();
    return up.includes('LIMITE DE PRECO') || up.includes('LIMITE DE PREÇO') || up.includes('PARAMETROS');
  });

  if (!fiscalSheetName) return undefined;

  const worksheet = workbook.Sheets[fiscalSheetName];
  if (!worksheet) return undefined;

  const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: '' });
  const params: ExcelImportFiscalParams = {};

  for (const row of matrix) {
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').toUpperCase().trim();
      const val = parseNumber(row[c + 1]);

      if (cell.includes('ICMS') && !cell.includes('CREDITO') && !cell.includes('CRÉDITO')) {
        params.icmsAliquota = val <= 1 ? val : val / 100;
      } else if (cell.includes('IPI')) {
        params.ipiAliquota = val <= 1 ? val : val / 100;
      } else if (cell.includes('PIS') || cell.includes('COFINS')) {
        params.pisCofinsAliquota = val <= 1 ? val : val / 100;
      } else if (cell.includes('FIXOS') || cell.includes('CUSTOS FIXOS')) {
        params.custosFixos = val <= 1 ? val : val / 100;
      } else if (cell.includes('CREDITO') || cell.includes('CRÉDITO')) {
        params.creditoEntradaICMS = val <= 1 ? val : val / 100;
      }
    }
  }

  return Object.keys(params).length > 0 ? params : undefined;
}

/**
 * Extrai alocações de lojas da aba "SEPARACAO", se presente e preenchida.
 */
function extractStoreSeparation(workbook: XLSX.WorkBook): Record<string, Record<string, number>> | undefined {
  const sepSheetName = workbook.SheetNames.find(n => {
    const up = n.toUpperCase();
    return up.includes('SEPARACAO') || up.includes('SEPARAÇÃO');
  });

  if (!sepSheetName) return undefined;

  const worksheet = workbook.Sheets[sepSheetName];
  if (!worksheet) return undefined;

  const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: '' });
  if (matrix.length < 5) return undefined;

  // Localizar linha de cabeçalho das lojas (linha com lojas ou códigos de lojas)
  let headerRow = -1;
  let storeCols: { name: string; col: number }[] = [];
  let codCol = 0;

  for (let r = 0; r < Math.min(matrix.length, 12); r++) {
    const row = matrix[r] || [];
    const rowText = row.map(c => String(c).toUpperCase().trim());
    // Pula linhas de agrupamento visual de clusters ("CLUSTER A", etc.)
    if (rowText.some(t => t.includes('CLUSTER'))) continue;

    const storesFound: { name: string; col: number }[] = [];
    
    row.forEach((cell, c) => {
      const txt = String(cell).trim();
      const up = txt.toUpperCase();
      if (up.includes('CODIGO') || up.includes('CÓDIGO')) {
        codCol = c;
      } else if (c >= 5 && txt && !up.includes('TOTAL') && !up.includes('CONFER') && !up.includes('STATUS') && !up.includes('AUDITORIA')) {
        storesFound.push({ name: txt, col: c });
      } else if (up.includes('LOJA') || up.startsWith('LJ') || /^\d{2}\s*-\s*[A-Z]+/.test(txt)) {
        storesFound.push({ name: txt, col: c });
      }
    });

    if (storesFound.length >= 3) {
      headerRow = r;
      storeCols = storesFound;
      break;
    }
  }

  if (headerRow === -1 || storeCols.length === 0) return undefined;

  const allocations: Record<string, Record<string, number>> = {};
  storeCols.forEach(sc => {
    allocations[sc.name] = {};
  });

  let totalAllocated = 0;

  for (let r = headerRow + 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    const itemCode = String(row[codCol] || '').trim();
    if (!itemCode || itemCode.toUpperCase().startsWith('TOTAL')) continue;

    storeCols.forEach(sc => {
      const qty = parseNumber(row[sc.col]);
      if (qty > 0) {
        allocations[sc.name][itemCode] = qty;
        totalAllocated += qty;
      }
    });
  }

  return totalAllocated > 0 ? allocations : undefined;
}

/**
 * Converte valor de célula para número com segurança (trata vírgulas, moedas e strings).
 */
function parseNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  let str = String(val).trim();
  // Remove "R$", "%", espaços
  str = str.replace(/R\$\s?|\s|%/g, '');

  // Trata formato brasileiro (1.234,56 -> 1234.56)
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Converte valor de porcentagem com segurança.
 * - Trata strings com "%" (ex: "5%", "50%", "1%", "0%")
 * - Trata números decimais (ex: 0.05 -> 5, 0.5 -> 50)
 * - Trata números inteiros (ex: 5 -> 5, 10 -> 10)
 * - Trata multiplicadores de atacado legados (ex: Fator 1.0 = sem desconto = 0% OFF)
 */
function parsePercentage(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  
  // Se for string com símbolo "%" explícito (ex: "5%", "1%", "50%"):
  if (typeof val === 'string' && val.includes('%')) {
    const clean = val.replace(/%/g, '').trim();
    const num = parseNumber(clean);
    return isNaN(num) ? 0 : num;
  }

  // Se for número puro ou string sem "%":
  const num = typeof val === 'number' ? (isNaN(val) ? 0 : val) : parseNumber(val);
  if (num <= 0) return 0;

  // Se for fração decimal entre 0 e 1 (ex: 0.05 -> 5%, 0.5 -> 50%):
  if (num > 0 && num < 1) {
    return Number((num * 100).toFixed(2));
  }

  // Caso especial: número 1 puro sem "%" em cabeçalho legado de atacado ("Fator 1" = 100% de preço = 0% de desconto)
  if (num === 1 && typeof val === 'number') {
    return 0;
  }

  return num;
}
