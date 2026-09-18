package br.com.mega12.app.ui.screens.login

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

@Composable
fun LoginScreen(
    viewModel: Mega12ViewModel,
    onLoginSuccess: (String) -> Unit,
    onNavigateToSettings: () -> Unit
) {
    var email by remember { mutableStateOf("compras@mega12.com.br") }
    var password by remember { mutableStateOf("123456") }

    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val currentUser by viewModel.currentUser.collectAsState()

    LaunchedEffect(currentUser) {
        currentUser?.let { user ->
            onLoginSuccess(user.role)
        }
    }

    Scaffold(
        containerColor = Slate900
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
            // Botão de Configuração de Servidor no Topo Direito
            IconButton(
                onClick = onNavigateToSettings,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Settings,
                    contentDescription = "Configurar Servidor",
                    tint = Slate400
                )
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
                modifier = Modifier.fillMaxWidth()
            ) {
                // Logo & Ícone
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Emerald500.copy(alpha = 0.15f),
                    modifier = Modifier.size(72.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.ShoppingCart,
                            contentDescription = "Mega 12",
                            tint = Emerald400,
                            modifier = Modifier.size(36.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "REDE MEGA 12",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        letterSpacing = 1.sp
                    )
                )
                Text(
                    text = "App Nativo de Compras & Galpão",
                    style = MaterialTheme.typography.bodyMedium.copy(color = Slate400)
                )

                Spacer(modifier = Modifier.height(32.dp))

                // Mensagem de Erro
                if (errorMessage != null) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Rose500.copy(alpha = 0.2f)),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = errorMessage ?: "",
                            color = Rose500,
                            modifier = Modifier.padding(12.dp),
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                }

                // Campo Email
                OutlinedTextField(
                    value = email,
                    onValueChange = { 
                        email = it
                        viewModel.clearMessages()
                    },
                    label = { Text("E-mail corporativo", color = Slate400) },
                    leadingIcon = {
                        Icon(Icons.Default.Email, contentDescription = null, tint = Slate400)
                    },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Emerald500,
                        unfocusedBorderColor = Slate700,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        cursorColor = Emerald500
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Campo Senha
                OutlinedTextField(
                    value = password,
                    onValueChange = { 
                        password = it
                        viewModel.clearMessages()
                    },
                    label = { Text("Senha", color = Slate400) },
                    leadingIcon = {
                        Icon(Icons.Default.Lock, contentDescription = null, tint = Slate400)
                    },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Emerald500,
                        unfocusedBorderColor = Slate700,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        cursorColor = Emerald500
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Botão de Login
                Button(
                    onClick = {
                        viewModel.login(email, password) {
                            val role = viewModel.currentUser.value?.role ?: "comprador"
                            onLoginSuccess(role)
                        }
                    },
                    enabled = !isLoading && email.isNotBlank() && password.isNotBlank(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Emerald500),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(color = Slate900, modifier = Modifier.size(24.dp))
                    } else {
                        Text(
                            text = "ENTRAR NO SISTEMA",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = Slate900
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Atalhos Rápidos de Demonstração
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    TextButton(onClick = { 
                        email = "compras@mega12.com.br"
                        password = "123456" 
                    }) {
                        Text("Comprador", color = Slate400, fontSize = 12.sp)
                    }
                    TextButton(onClick = { 
                        email = "separacao@mega12.com.br"
                        password = "123456" 
                    }) {
                        Text("Conferente Doca", color = Slate400, fontSize = 12.sp)
                    }
                    TextButton(onClick = { 
                        email = "diretoria@mega12.com.br"
                        password = "123456" 
                    }) {
                        Text("Diretoria", color = Slate400, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}
