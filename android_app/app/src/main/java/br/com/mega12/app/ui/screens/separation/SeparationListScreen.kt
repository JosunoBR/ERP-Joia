package br.com.mega12.app.ui.screens.separation

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
import br.com.mega12.app.ui.components.Mega12TopBar
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

@Composable
fun SeparationListScreen(
    viewModel: Mega12ViewModel,
    onNavigateToDetail: (String) -> Unit,
    onNavigateBack: () -> Unit
) {
    val orders by viewModel.orders.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    Scaffold(
        topBar = {
            Mega12TopBar(
                title = "Separação & Romaneio Doca",
                subtitle = "Conferência das 20 Lojas",
                onBackClick = onNavigateBack,
                actions = {
                    IconButton(onClick = { viewModel.refreshData() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Atualizar", tint = Color.White)
                    }
                }
            )
        },
        containerColor = Slate900
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Text(
                    text = "Pedidos Prontos para Conferência",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                )
            }

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
                                imageVector = Icons.Default.Inventory,
                                contentDescription = null,
                                tint = Slate600,
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Nenhum pedido pendente de separação",
                                style = MaterialTheme.typography.bodyMedium.copy(color = Slate400)
                            )
                        }
                    }
                }
            } else {
                items(orders) { order ->
                    Card(
                        onClick = { onNavigateToDetail(order.id) },
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
                                    style = MaterialTheme.typography.titleMedium.copy(
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
                                text = order.header.fornecedor,
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
                                Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Slate400)
                            }
                        }
                    }
                }
            }
        }
    }
}
