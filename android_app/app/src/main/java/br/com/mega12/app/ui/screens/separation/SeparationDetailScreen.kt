package br.com.mega12.app.ui.screens.separation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.mega12.app.data.model.AvariaItem
import br.com.mega12.app.domain.SeparationEngine
import br.com.mega12.app.ui.components.Mega12TopBar
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun SeparationDetailScreen(
    orderId: String,
    viewModel: Mega12ViewModel,
    onNavigateBack: () -> Unit
) {
    val orders by viewModel.orders.collectAsState()
    val order = orders.find { it.id == orderId }

    var showAvariaDialog by remember { mutableStateOf(false) }
    var selectedStoreForAvaria by remember { mutableStateOf("") }
    var selectedItemForAvaria by remember { mutableStateOf("") }
    var avariaQtd by remember { mutableStateOf("1") }
    var avariaMotivo by remember { mutableStateOf("Caixa Amassada / Peça Quebrada") }

    val avariasList = remember { mutableStateListOf<AvariaItem>() }

    Scaffold(
        topBar = {
            Mega12TopBar(
                title = "Romaneio ${order?.header?.numeroPedido ?: ""}",
                subtitle = order?.header?.fornecedor,
                onBackClick = onNavigateBack
            )
        },
        containerColor = Slate900
    ) { padding ->
        if (order == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Text("Pedido não encontrado", color = Slate400)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Status e Resumo do Pedido
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
                                Text(
                                    text = "Conferência de Doca",
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                )
                                Button(
                                    onClick = { showAvariaDialog = true },
                                    colors = ButtonDefaults.buttonColors(containerColor = Amber500),
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                ) {
                                    Icon(Icons.Default.Warning, contentDescription = null, modifier = Modifier.size(16.dp), tint = Slate900)
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Apontar Avaria", color = Slate900, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            Text(
                                text = "Total de Itens: ${order.items.size} | Total de Peças: ${order.totalPecas}",
                                style = MaterialTheme.typography.bodyMedium.copy(color = Slate400)
                            )
                        }
                    }
                }

                // Lista de Avarias Apontadas
                if (avariasList.isNotEmpty()) {
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Rose500.copy(alpha = 0.15f)),
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = "Avarias Registradas no Descarregamento (${avariasList.size})",
                                    style = MaterialTheme.typography.titleSmall.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = Rose500
                                    )
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                avariasList.forEach { av ->
                                    Text(
                                        text = "• ${av.storeName}: -${av.quantidade} un (${av.itemDescricao}) - ${av.motivo}",
                                        style = MaterialTheme.typography.bodySmall.copy(color = Color.White)
                                    )
                                }
                            }
                        }
                    }
                }

                // Grade das 20 Lojas
                item {
                    Text(
                        text = "Grade de Separação por Loja (20 Filiais)",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    )
                }

                items(SeparationEngine.DEFAULT_STORES) { store ->
                    val totalPecasLoja = order.items.sumOf { item ->
                        val sep = SeparationEngine.calculateBoxesSeparation(item.caixas, item.qtdPorCaixa)
                        sep.allocations[store.id] ?: 0
                    }
                    val totalCaixasLoja = order.items.sumOf { item ->
                        val sep = SeparationEngine.calculateBoxesSeparation(item.caixas, item.qtdPorCaixa)
                        sep.allocationsBoxes[store.id] ?: 0
                    }

                    Card(
                        colors = CardDefaults.cardColors(containerColor = Slate800),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(
                                    color = when (store.cluster) {
                                        "A" -> Emerald500.copy(alpha = 0.2f)
                                        "B" -> Blue500.copy(alpha = 0.2f)
                                        else -> Purple500.copy(alpha = 0.2f)
                                    },
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = store.cluster,
                                        color = when (store.cluster) {
                                            "A" -> Emerald400
                                            "B" -> Blue500
                                            else -> Purple500
                                        },
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                        fontSize = 12.sp
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    text = store.name,
                                    style = MaterialTheme.typography.bodyLarge.copy(
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color.White
                                    )
                                )
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = "$totalCaixasLoja CX",
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = Emerald400
                                    )
                                )
                                Text(
                                    text = "$totalPecasLoja peças",
                                    style = MaterialTheme.typography.labelMedium.copy(color = Slate400)
                                )
                            }
                        }
                    }
                }
            }
        }

        // Diálogo de Avaria
        if (showAvariaDialog && order != null) {
            AlertDialog(
                onDismissRequest = { showAvariaDialog = false },
                title = { Text("Registrar Avaria na Doca", color = Color.White) },
                containerColor = Slate800,
                text = {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text("Selecione a loja e informe as peças avariadas:", color = Slate400, fontSize = 13.sp)

                        OutlinedTextField(
                            value = avariaQtd,
                            onValueChange = { avariaQtd = it },
                            label = { Text("Quantidade Avariada (Peças)", color = Slate400) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Amber500,
                                unfocusedBorderColor = Slate700,
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        OutlinedTextField(
                            value = avariaMotivo,
                            onValueChange = { avariaMotivo = it },
                            label = { Text("Motivo / Observação", color = Slate400) },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Amber500,
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
                            val qtd = avariaQtd.toIntOrNull() ?: 1
                            avariasList.add(
                                AvariaItem(
                                    storeId = "pg_centro",
                                    storeName = "Ponta Grossa Centro",
                                    itemCodigo = order.items.firstOrNull()?.codigo ?: "PRD",
                                    itemDescricao = order.items.firstOrNull()?.descricao ?: "Item",
                                    quantidade = qtd,
                                    motivo = avariaMotivo,
                                    timestamp = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
                                )
                            )
                            showAvariaDialog = false
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Amber500)
                    ) {
                        Text("Registrar Avaria", color = Slate900, fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showAvariaDialog = false }) {
                        Text("Cancelar", color = Slate400)
                    }
                }
            )
        }
    }
}
