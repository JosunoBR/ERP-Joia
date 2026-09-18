package br.com.mega12.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.navigation.compose.rememberNavController
import br.com.mega12.app.ui.navigation.NavGraph
import br.com.mega12.app.ui.navigation.Screen
import br.com.mega12.app.ui.theme.Mega12AppTheme
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: Mega12ViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            Mega12AppTheme {
                val navController = rememberNavController()
                val currentUser = viewModel.currentUser.value
                val startDestination = if (currentUser != null) {
                    if (currentUser.role == "conferente") Screen.SeparationList.route else Screen.BuyerHome.route
                } else {
                    Screen.Login.route
                }

                NavGraph(
                    navController = navController,
                    viewModel = viewModel,
                    startDestination = startDestination
                )
            }
        }
    }
}
