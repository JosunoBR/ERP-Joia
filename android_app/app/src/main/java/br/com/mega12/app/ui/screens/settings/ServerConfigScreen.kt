package br.com.mega12.app.ui.screens.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.mega12.app.data.api.ApiClient
import br.com.mega12.app.ui.components.Mega12TopBar
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

@Composable
fun ServerConfigScreen(
    viewModel: Mega12ViewModel,
    onNavigateBack: () -> Unit
) {
    var serverUrl by remember { mutableStateOf(viewModel.preferencesManager.serverUrl) }
    var savedMessage by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            Mega12TopBar(
                title = "Configuração do Servidor",
                subtitle = "IP da API Backend",
                onBackClick = onNavigateBack
            )
        },
        containerColor = Slate900
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(20.dp)
        ) {
            Text(
                text = "Endereço da API Backend",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Informe o endereço IP do computador onde o backend Node.js está rodando.",
                style = MaterialTheme.typography.bodyMedium.copy(color = Slate400)
            )

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = serverUrl,
                onValueChange = { 
                    serverUrl = it
                    savedMessage = null
                },
                label = { Text("URL Base da API", color = Slate400) },
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

            Spacer(modifier = Modifier.height(12.dp))

            // Presets Rápidos
            Text(
                text = "Atalhos rápidos:",
                style = MaterialTheme.typography.labelMedium.copy(color = Slate400)
            )

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = { serverUrl = "http://10.0.2.2:3001/api/" },
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Emerald400),
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Emulador (10.0.2.2)", fontSize = 11.sp)
                }

                OutlinedButton(
                    onClick = { serverUrl = "http://192.168.1.100:3001/api/" },
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Emerald400),
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Rede Wi-Fi Local", fontSize = 11.sp)
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            if (savedMessage != null) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Emerald500.copy(alpha = 0.2f)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = savedMessage ?: "",
                        color = Emerald400,
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            Button(
                onClick = {
                    viewModel.preferencesManager.serverUrl = serverUrl
                    ApiClient.resetClient()
                    savedMessage = "Configuração salva com sucesso!"
                },
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Emerald500),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                Text(
                    text = "SALVAR CONFIGURAÇÃO",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = Slate900
                    )
                )
            }
        }
    }
}
