package br.com.mega12.app.ui.screens.buyer

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
import br.com.mega12.app.ui.components.Mega12TopBar
import br.com.mega12.app.ui.components.MetricCard
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

@Composable
fun BuyerHomeScreen(
    viewModel: Mega12ViewModel,
    onNavigateToCalculator: () -> Unit,
    onNavigateToNewOrder: () -> Unit,
    onNavigateToSeparation: () -> Unit,
    onLogout: () -> Unit
) {
    val currentUser by viewModel.currentUser.collectAsState()
    val orders by viewModel.orders.collectAsState()
    val products by viewModel.products.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    val totalInvestido = orders.sumOf { it.totalLiquido }
    val totalPecas = orders.sumOf { it.totalPecas }

    Scaffold(
        topBar = {
            Mega12TopBar(
                title = "Mega 12 Compras",
                subtitle = "Olá, ${currentUser?.nome ?: "Comprador"}",
                actions = {
                    IconButton(onClick = { viewModel.refreshData() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Atualizar", tint = Color.White)
                    }
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Default.ExitToApp, contentDescription = "Sair", tint = Rose500)
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onNavigateToNewOrder,
                containerColor = Emerald500,
                contentColor = Slate900,
                shape = RoundedCornerShape(16.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Novo Pedido", fontWeight = FontWeight.Bold)
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
            // Ações Rápidas
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Botão Calculadora de Margem
                    Card(
                        onClick = onNavigateToCalculator,
                        colors = CardDefaults.cardColors(containerColor = Emerald500.copy(alpha = 0.15f)),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            horizontalAlignment = Alignment.Start
                        ) {
                            Icon(
                                imageVector = Icons.Default.Calculate,
                                contentDescription = null,
                                tint = Emerald400,
                                modifier = Modifier.size(32.dp)
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Calculadora",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            )
                            Text(
                                text = "Termômetro de Margem & ST",
                                style = MaterialTheme.typography.labelMedium.copy(color = Slate400)
                            )
                        }
                    }

                    // Botão Galpão / Separação
                    Card(
                        onClick = onNavigateToSeparation,
                        colors = CardDefaults.cardColors(containerColor = Slate800),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            horizontalAlignment = Alignment.Start
                        ) {
                            Icon(
                                imageVector = Icons.Default.Inventory2,
                                contentDescription = null,
                                tint = Blue500,
                                modifier = Modifier.size(32.dp)
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Separação",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            )
                            Text(
                                text = "Romaneio das 20 Lojas",
                                style = MaterialTheme.typography.labelMedium.copy(color = Slate400)
                            )
                        }
                    }
                }
            }

            // Cards de Resumo
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    MetricCard(
                        title = "Investimento Total",
                        value = "R$ %.2f".format(totalInvestido),
                        subtitle = "${orders.size} pedidos",
                        icon = Icons.Default.AttachMoney,
                        containerColor = Slate800,
                        modifier = Modifier.weight(1f)
                    )

                    MetricCard(
                        title = "Peças Compradas",
                        value = "%,d".format(totalPecas),
                        subtitle = "${products.size} produtos catálogo",
                        icon = Icons.Default.ShoppingBag,
                        containerColor = Slate800,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // Cabeçalho Lista de Pedidos
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Últimos Pedidos Lançados",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    )
                    Text(
                        text = "${orders.size} no total",
                        style = MaterialTheme.typography.labelMedium.copy(color = Slate400)
                    )
                }
            }

            // Lista de Pedidos
            if (orders.isEmpty()) {
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
                            Icon(
                                imageVector = Icons.Default.ReceiptLong,
                                contentDescription = null,
                                tint = Slate600,
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Nenhum pedido lançado ainda",
                                style = MaterialTheme.typography.bodyMedium.copy(color = Slate400)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Toque em + Novo Pedido para começar a comprar na viagem.",
                                style = MaterialTheme.typography.labelMedium.copy(color = Slate500),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                        }
                    }
                }
            } else {
                items(orders) { order ->
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
                                    text = order.header.numeroPedido.ifEmpty { "PEDIDO" },
                                    style = MaterialTheme.typography.titleSmall.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = Emerald400
                                    )
                                )
                                Surface(
                                    color = if (order.separationStatus == "Finalizado") Emerald500.copy(alpha = 0.2f) else Amber500.copy(alpha = 0.2f),
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = order.separationStatus,
                                        color = if (order.separationStatus == "Finalizado") Emerald400 else Amber500,
                                        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(6.dp))

                            Text(
                                text = order.header.fornecedor.ifEmpty { "Fornecedor não informado" },
                                style = MaterialTheme.typography.bodyLarge.copy(
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color.White
                                )
                            )

                            Spacer(modifier = Modifier.height(8.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "${order.items.size} itens | ${order.totalPecas} peças",
                                    style = MaterialTheme.typography.bodyMedium.copy(color = Slate400)
                                )
                                Text(
                                    text = "R$ %.2f".format(order.totalLiquido),
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
