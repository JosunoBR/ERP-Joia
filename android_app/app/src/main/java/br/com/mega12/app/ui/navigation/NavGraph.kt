package br.com.mega12.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import br.com.mega12.app.ui.screens.buyer.BuyerHomeScreen
import br.com.mega12.app.ui.screens.buyer.OrderCreationScreen
import br.com.mega12.app.ui.screens.buyer.QuickCalculatorScreen
import br.com.mega12.app.ui.screens.login.LoginScreen
import br.com.mega12.app.ui.screens.separation.SeparationDetailScreen
import br.com.mega12.app.ui.screens.separation.SeparationListScreen
import br.com.mega12.app.ui.screens.settings.ServerConfigScreen
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

@Composable
fun NavGraph(
    navController: NavHostController,
    viewModel: Mega12ViewModel,
    startDestination: String = Screen.Login.route
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Login.route) {
            LoginScreen(
                viewModel = viewModel,
                onLoginSuccess = { role ->
                    if (role == "conferente") {
                        navController.navigate(Screen.SeparationList.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    } else {
                        navController.navigate(Screen.BuyerHome.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    }
                },
                onNavigateToSettings = {
                    navController.navigate(Screen.ServerConfig.route)
                }
            )
        }

        composable(Screen.ServerConfig.route) {
            ServerConfigScreen(
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.BuyerHome.route) {
            BuyerHomeScreen(
                viewModel = viewModel,
                onNavigateToCalculator = { navController.navigate(Screen.QuickCalculator.route) },
                onNavigateToNewOrder = { navController.navigate(Screen.OrderCreation.route) },
                onNavigateToSeparation = { navController.navigate(Screen.SeparationList.route) },
                onLogout = {
                    viewModel.logout()
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.QuickCalculator.route) {
            QuickCalculatorScreen(
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.OrderCreation.route) {
            OrderCreationScreen(
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.SeparationList.route) {
            SeparationListScreen(
                viewModel = viewModel,
                onNavigateToDetail = { orderId ->
                    navController.navigate(Screen.SeparationDetail.createRoute(orderId))
                },
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Screen.SeparationDetail.route,
            arguments = listOf(navArgument("orderId") { type = NavType.StringType })
        ) { backStackEntry ->
            val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
            SeparationDetailScreen(
                orderId = orderId,
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
