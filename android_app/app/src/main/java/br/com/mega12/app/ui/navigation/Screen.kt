package br.com.mega12.app.ui.navigation

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object ServerConfig : Screen("server_config")
    
    // Módulo Comprador
    object BuyerHome : Screen("buyer_home")
    object QuickCalculator : Screen("quick_calculator")
    object OrderCreation : Screen("order_creation")
    
    // Módulo Separação / Doca
    object SeparationList : Screen("separation_list")
    object SeparationDetail : Screen("separation_detail/{orderId}") {
        fun createRoute(orderId: String) = "separation_detail/$orderId"
    }
}
