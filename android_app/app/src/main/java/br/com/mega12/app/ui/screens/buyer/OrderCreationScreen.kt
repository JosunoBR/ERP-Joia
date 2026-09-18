package br.com.mega12.app.ui.screens.buyer

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.mega12.app.data.model.Product
import br.com.mega12.app.data.model.Supplier
import br.com.mega12.app.ui.components.MarginBadge
import br.com.mega12.app.ui.components.Mega12TopBar
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderCreationScreen(
    viewModel: Mega12ViewModel,
    onNavigateBack: () -> Unit
) {
    val suppliers by viewModel.suppliers.collectAsState()
    val products by viewModel.products.collectAsState()
    val draftOrder by viewModel.currentDraftOrder.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val successMessage by viewModel.successMessage.collectAsState()

    var selectedSupplier by remember { mutableStateOf("") }
    var isSupplierDropdownExpanded by remember { mutableStateOf(false) }
    var condicaoPagamento by remember { mutableStateOf("30/60/90 Dias") }

    // Diálogo de Adição de Item
    var showAddItemDialog by remember { mutableStateOf(false) }
    var itemDescricao by remember { mutableStateOf("") }
    var itemCodigoInterno by remember { mutableStateOf("") }
    var itemCodigoFornecedor by remember { mutableStateOf("") }
    var itemCaixas by remember { mutableStateOf("5") }
    var itemQtdPorCaixa by remember { mutableStateOf("12") }
    var itemPrecoCompra by remember { mutableStateOf("10.00") }
    var itemPdvAlvo by remember { mutableStateOf("25.00") }

    LaunchedEffect(suppliers) {
        if (selectedSupplier.isEmpty() && suppliers.isNotEmpty()) {
            selectedSupplier = suppliers.first().razaoSocial
        }
    }

    Scaffold(
        topBar = {
            Mega12TopBar(
                title = "Novo Pedido de Compras",
                subtitle = "Lançamento Mobile em Viagem",
                onBackClick = onNavigateBack
            )
        },
        bottomBar = {
            Surface(
                color = Slate800,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .padding(16.dp)
                        .fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "TOTAL DO PEDIDO",
                            style = MaterialTheme.typography.labelMedium.copy(color = Slate400, fontWeight = FontWeight.Bold)
                        )
                        Text(
                            text = "R$ %.2f".format(draftOrder.totalLiquido),
                            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold, color = Emerald400)
                        )
                        Text(
                            text = "${draftOrder.totalPecas} peças • ${draftOrder.items.size} itens",
                            style = MaterialTheme.typography.labelSmall.copy(color = Slate400)
                        )
                    }

                    Button(
                        onClick = {
                            val supName = selectedSupplier.ifBlank { "Fornecedor Geral" }
                            viewModel.saveDraftOrder(supName, condicaoPagamento) {
                                onNavigateBack()
                            }
                        },
                        enabled = !isLoading && draftOrder.items.isNotEmpty(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Emerald500,
                            disabledContainerColor = Slate700
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(color = Slate900, modifier = Modifier.size(20.dp))
                        } else {
                            Icon(Icons.Default.Check, contentDescription = null, tint = Slate900)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("SALVAR NOVO PEDIDO", fontWeight = FontWeight.Bold, color = Slate900)
                        }
                    }
                }
            }
        },
        containerColor = Slate900
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Cabeçalho do Pedido (Fornecedor e Condições)
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Slate800),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.Business, contentDescription = null, tint = Emerald400, modifier = Modifier.size(20.dp))
                            Text(
                                text = "Dados do Fornecedor & Condições",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Seletor Inteligente de Fornecedor
                        ExposedDropdownMenuBox(
                            expanded = isSupplierDropdownExpanded,
                            onExpandedChange = { isSupplierDropdownExpanded = !isSupplierDropdownExpanded }
                        ) {
                            OutlinedTextField(
                                value = selectedSupplier,
                                onValueChange = { selectedSupplier = it },
                                label = { Text("Fornecedor / Razão Social", color = Slate400) },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = isSupplierDropdownExpanded) },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Emerald500,
                                    unfocusedBorderColor = Slate700,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .menuAnchor()
                            )

                            if (suppliers.isNotEmpty()) {
                                ExposedDropdownMenu(
                                    expanded = isSupplierDropdownExpanded,
                                    onDismissRequest = { isSupplierDropdownExpanded = false }
                                ) {
                                    suppliers.forEach { sup ->
                                        DropdownMenuItem(
                                            text = {
                                                Column {
                                                    Text(sup.razaoSocial, fontWeight = FontWeight.Bold)
                                                    if (!sup.vendedorPadrao.isNullOrBlank()) {
                                                        Text("Vendedor: ${sup.vendedorPadrao}", style = MaterialTheme.typography.bodySmall, color = Slate400)
                                                    }
                                                }
                                            },
                                            onClick = {
                                                selectedSupplier = sup.razaoSocial
                                                if (!sup.condicaoPagamentoPadrao.isNullOrBlank()) {
                                                    condicaoPagamento = sup.condicaoPagamentoPadrao!!
                                                }
                                                isSupplierDropdownExpanded = false
                                            }
                                        )
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = condicaoPagamento,
                            onValueChange = { condicaoPagamento = it },
                            label = { Text("Condição de Pagamento (Ex: 30/60/90 Dias)", color = Slate400) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Emerald500,
                                unfocusedBorderColor = Slate700,
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            ),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }

            // Ação Adicionar Item
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Itens do Pedido (${draftOrder.items.size})",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    )

                    Button(
                        onClick = { showAddItemDialog = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald500),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp), tint = Slate900)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Adicionar Item", fontWeight = FontWeight.Bold, color = Slate900)
                    }
                }
            }

            // Lista de Itens no Pedido
            if (draftOrder.items.isEmpty()) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Slate800),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(Icons.Default.ShoppingCart, contentDescription = null, tint = Slate600, modifier = Modifier.size(48.dp))
                            Spacer(modifier = Modifier.height(10.dp))
                            Text("Nenhum item adicionado ao pedido", color = Slate300, fontWeight = FontWeight.Bold)
                            Text("Toque em '+ Adicionar Item' acima para incluir produtos", color = Slate500, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            } else {
                items(draftOrder.items) { item ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Slate800),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = item.descricao,
                                        style = MaterialTheme.typography.titleSmall.copy(
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                    )
                                    val codInt = item.codigoInterno.ifBlank { item.codigo }
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        if (codInt.isNotBlank()) {
                                            Text(
                                                text = "Cód: $codInt",
                                                style = MaterialTheme.typography.labelSmall.copy(color = Emerald400, fontWeight = FontWeight.Bold)
                                            )
                                        }
                                        if (!item.codigoFornecedor.isNullOrBlank()) {
                                            Text(
                                                text = "• Ref: ${item.codigoFornecedor}",
                                                style = MaterialTheme.typography.labelSmall.copy(color = Amber400)
                                            )
                                        }
                                    }
                                }

                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = "R$ %.2f".format(item.subtotal),
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            fontWeight = FontWeight.Bold,
                                            color = Emerald400
                                        )
                                    )
                                    IconButton(
                                        onClick = { viewModel.removeItemFromDraftOrder(item.id) },
                                        modifier = Modifier.size(32.dp)
                                    ) {
                                        Icon(Icons.Default.Delete, contentDescription = "Remover", tint = Rose500, modifier = Modifier.size(18.dp))
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(6.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "${item.caixas} CX (${item.totalPecas} un) x R$ %.2f".format(item.precoCompraUnitario),
                                    style = MaterialTheme.typography.bodyMedium.copy(color = Slate400)
                                )
                                Text(
                                    text = "PDV: R$ %.2f".format(item.pdvAlvo),
                                    style = MaterialTheme.typography.bodyMedium.copy(color = Slate300, fontWeight = FontWeight.SemiBold)
                                )
                            }
                        }
                    }
                }
            }
        }

        // Modal de Adicionar Item com Sugestões do Catálogo
        if (showAddItemDialog) {
            AlertDialog(
                onDismissRequest = { showAddItemDialog = false },
                title = { Text("Adicionar Produto ao Pedido", color = Color.White, fontWeight = FontWeight.Bold) },
                containerColor = Slate800,
                text = {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // Chips de Produtos Cadastrados para auto-preenchimento
                        if (products.isNotEmpty()) {
                            Text("Selecionar do Catálogo:", color = Slate400, style = MaterialTheme.typography.labelSmall)
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                items(products.take(6)) { prod ->
                                    Surface(
                                        color = Slate700,
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier.clickable {
                                            itemDescricao = prod.descricao
                                            itemCodigoInterno = prod.codigoInterno.ifBlank { prod.codigo }
                                            itemCodigoFornecedor = prod.codigoFornecedor ?: ""
                                            itemQtdPorCaixa = prod.qtdPorPacote.toString()
                                            itemPrecoCompra = "%.2f".format(prod.precoUnitarioPadrao).replace(',', '.')
                                            itemPdvAlvo = "%.2f".format(prod.pdvSugerido).replace(',', '.')
                                        }
                                    ) {
                                        Text(
                                            text = prod.descricao.take(18) + "...",
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                            style = MaterialTheme.typography.labelSmall.copy(color = Emerald400, fontWeight = FontWeight.Bold)
                                        )
                                    }
                                }
                            }
                        }

                        // Códigos Interno e Fornecedor
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedTextField(
                                value = itemCodigoInterno,
                                onValueChange = { itemCodigoInterno = it },
                                label = { Text("Cód. Interno", color = Slate400) },
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Emerald500,
                                    unfocusedBorderColor = Slate700,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = itemCodigoFornecedor,
                                onValueChange = { itemCodigoFornecedor = it },
                                label = { Text("Ref. Fornecedor", color = Slate400) },
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Emerald500,
                                    unfocusedBorderColor = Slate700,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.weight(1f)
                            )
                        }

                        OutlinedTextField(
                            value = itemDescricao,
                            onValueChange = { itemDescricao = it },
                            label = { Text("Descrição do Produto", color = Slate400) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Emerald500,
                                unfocusedBorderColor = Slate700,
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedTextField(
                                value = itemCaixas,
                                onValueChange = { itemCaixas = it },
                                label = { Text("Qtd (Unidades)", color = Slate400) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Emerald500,
                                    unfocusedBorderColor = Slate700,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedTextField(
                                value = itemPrecoCompra,
                                onValueChange = { itemPrecoCompra = it },
                                label = { Text("Compra Unit. (R$)", color = Slate400) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Emerald500,
                                    unfocusedBorderColor = Slate700,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = "12.00",
                                onValueChange = { },
                                readOnly = true,
                                label = { Text("PDV (Fixo Mega 12)", color = Slate400) },
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Emerald500,
                                    unfocusedBorderColor = Slate700,
                                    focusedTextColor = Emerald400,
                                    unfocusedTextColor = Emerald400
                                ),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            if (itemDescricao.isNotBlank()) {
                                viewModel.addItemToDraftOrder(
                                    descricao = itemDescricao,
                                    codigo = itemCodigoInterno,
                                    codigoInterno = itemCodigoInterno,
                                    codigoFornecedor = itemCodigoFornecedor.ifBlank { null },
                                    totalUnidades = itemCaixas.toIntOrNull() ?: 100,
                                    precoCompra = itemPrecoCompra.toDoubleOrNull() ?: 0.0,
                                    pdvAlvo = 12.00
                                )
                                itemDescricao = ""
                                itemCodigoInterno = ""
                                itemCodigoFornecedor = ""
                                showAddItemDialog = false
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald500)
                    ) {
                        Text("Adicionar", color = Slate900, fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showAddItemDialog = false }) {
                        Text("Cancelar", color = Slate400)
                    }
                }
            )
        }
    }
}
