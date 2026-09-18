package br.com.mega12.app.ui.screens.buyer

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import br.com.mega12.app.domain.SeparationEngine
import br.com.mega12.app.ui.components.MarginBadge
import br.com.mega12.app.ui.components.Mega12TopBar
import br.com.mega12.app.ui.components.MetricCard
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

@Composable
fun QuickCalculatorScreen(
    viewModel: Mega12ViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToOrder: (() -> Unit)? = null
) {
    val precoCompra by viewModel.calcPrecoCompra.collectAsState()
    val pdvAlvo by viewModel.calcPdvAlvo.collectAsState()
    val caixas by viewModel.calcCaixas.collectAsState()
    val qtdPorCaixa by viewModel.calcQtdPorCaixa.collectAsState()

    val fiscalResult by viewModel.fiscalResult.collectAsState()
    val separationResult by viewModel.separationResult.collectAsState()

    var showNameDialog by remember { mutableStateOf(false) }
    var prodNameInput by remember { mutableStateOf("Item da Negociação") }

    Scaffold(
        topBar = {
            Mega12TopBar(
                title = "Termômetro de Margem",
                subtitle = "Calculadora Rápida em Viagens",
                onBackClick = onNavigateBack
            )
        },
        bottomBar = {
            if (fiscalResult != null) {
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
                                text = "MARGEM OBTIDA",
                                style = MaterialTheme.typography.labelSmall.copy(color = Slate400, fontWeight = FontWeight.Bold)
                            )
                            Text(
                                text = "%.1f%%".format(fiscalResult!!.margemPercentual),
                                style = MaterialTheme.typography.titleLarge.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = if (fiscalResult!!.isLucrativo) Emerald400 else Rose500
                                )
                            )
                        }

                        Button(
                            onClick = { showNameDialog = true },
                            colors = ButtonDefaults.buttonColors(containerColor = Emerald500),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.AddShoppingCart, contentDescription = null, tint = Slate900)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("LANÇAR NO PEDIDO", fontWeight = FontWeight.Bold, color = Slate900)
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
            // Inputs de Preço e Volume
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Slate800),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Calculate, contentDescription = null, tint = Emerald400, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Valores da Negociação na Mesa",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            OutlinedTextField(
                                value = precoCompra,
                                onValueChange = { viewModel.updateCalcInputs(precoCompraStr = it) },
                                label = { Text("Preço Compra (R$)", color = Slate400, fontSize = 12.sp) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Emerald500,
                                    unfocusedBorderColor = Slate700,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1f)
                            )

                            OutlinedTextField(
                                value = "12.00",
                                onValueChange = { },
                                readOnly = true,
                                label = { Text("PDV (Fixo Mega 12)", color = Slate400, fontSize = 12.sp) },
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Emerald500,
                                    unfocusedBorderColor = Slate700,
                                    focusedTextColor = Emerald400,
                                    unfocusedTextColor = Emerald400
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            OutlinedTextField(
                                value = caixas,
                                onValueChange = { viewModel.updateCalcInputs(caixasStr = it) },
                                label = { Text("Total Caixas", color = Slate400, fontSize = 12.sp) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Emerald500,
                                    unfocusedBorderColor = Slate700,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1f)
                            )

                            OutlinedTextField(
                                value = qtdPorCaixa,
                                onValueChange = { viewModel.updateCalcInputs(qtdPorCaixaStr = it) },
                                label = { Text("Peças/Caixa", color = Slate400, fontSize = 12.sp) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Emerald500,
                                    unfocusedBorderColor = Slate700,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }

            // Resultado Fiscal / Termômetro
            if (fiscalResult != null) {
                val res = fiscalResult!!
                item {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = if (res.isLucrativo) Emerald900.copy(alpha = 0.35f) else Rose500.copy(alpha = 0.2f)
                        ),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "SIMULAÇÃO FISCAL & MARGEM",
                                    style = MaterialTheme.typography.labelMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = if (res.isLucrativo) Emerald400 else Rose500
                                    )
                                )
                                MarginBadge(marginPercent = res.margemPercentual, status = res.statusMargem)
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column {
                                    Text(text = "Custo Real Efetivo", style = MaterialTheme.typography.labelMedium.copy(color = Slate400))
                                    Text(
                                        text = "R$ %.2f".format(res.custoRealEfetivo),
                                        style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold, color = Color.White)
                                    )
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(text = "Lucro Líquido Unitário", style = MaterialTheme.typography.labelMedium.copy(color = Slate400))
                                    Text(
                                        text = "R$ %.2f".format(res.margemRealUnit),
                                        style = MaterialTheme.typography.titleLarge.copy(
                                            fontWeight = FontWeight.Bold,
                                            color = if (res.isLucrativo) Emerald400 else Rose500
                                        )
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))
                            Divider(color = Slate700)
                            Spacer(modifier = Modifier.height(10.dp))

                            Text(
                                text = "Engenharia Fiscal: ICMS 11% + PIS/COFINS 3% + Custos Fixos 26% (40% Total) - Crédito ICMS 19.5%",
                                style = MaterialTheme.typography.labelMedium.copy(color = Slate400, fontSize = 11.sp)
                            )
                        }
                    }
                }
            }

            // Grade de Rateio para as 20 Lojas
            if (separationResult != null) {
                val sep = separationResult!!
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Slate800),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Store, contentDescription = null, tint = Emerald400, modifier = Modifier.size(20.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "Rateio Automático (20 Lojas)",
                                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = Color.White)
                                    )
                                }
                                Text(
                                    text = "${sep.totalAllocatedBoxes} CX (${sep.totalAllocated} UN)",
                                    style = MaterialTheme.typography.labelMedium.copy(color = Emerald400, fontWeight = FontWeight.Bold)
                                )
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            Text(
                                text = "Estoque Central Reserva: ${sep.reserveStockBoxes} CX (${sep.reserveStock} UN)",
                                style = MaterialTheme.typography.bodyMedium.copy(color = Amber500, fontWeight = FontWeight.SemiBold)
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            // Resumo dos Clusters
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Surface(
                                    color = Slate900,
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Column(modifier = Modifier.padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text("Cluster A (8 Lojas)", color = Slate400, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        Text("${sep.clusterTotalsBoxes.A} CX", color = Color.White, fontWeight = FontWeight.Bold)
                                    }
                                }
                                Surface(
                                    color = Slate900,
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Column(modifier = Modifier.padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text("Cluster B (8 Lojas)", color = Slate400, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        Text("${sep.clusterTotalsBoxes.B} CX", color = Color.White, fontWeight = FontWeight.Bold)
                                    }
                                }
                                Surface(
                                    color = Slate900,
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Column(modifier = Modifier.padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text("Cluster C (4 Lojas)", color = Slate400, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        Text("${sep.clusterTotalsBoxes.C} CX", color = Color.White, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Modal para confirmar nome do produto ao lançar
        if (showNameDialog) {
            AlertDialog(
                onDismissRequest = { showNameDialog = false },
                title = { Text("Nome do Produto para o Pedido", color = Color.White, fontWeight = FontWeight.Bold) },
                containerColor = Slate800,
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Identifique o produto para incluí-lo na lista de compras:", color = Slate400, fontSize = 12.sp)
                        OutlinedTextField(
                            value = prodNameInput,
                            onValueChange = { prodNameInput = it },
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
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            val success = viewModel.addCurrentCalcToDraftOrder(descricao = prodNameInput.ifBlank { "Item Calculado" })
                            showNameDialog = false
                            if (success) {
                                onNavigateBack()
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald500)
                    ) {
                        Text("Confirmar Inclusão", color = Slate900, fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showNameDialog = false }) {
                        Text("Cancelar", color = Slate400)
                    }
                }
            )
        }
    }
}
