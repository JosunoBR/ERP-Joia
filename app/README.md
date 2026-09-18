# 📱 Módulo Mobile (App Compras & Romaneio de Galpão)

Este módulo contemplará o aplicativo móvel para **Android e iOS** utilizando **React Native + Expo (TypeScript)**.

## 🎯 Objetivos do Aplicativo
1. **Comprador na Feira / Fornecedor:**
   - Cotação instantânea de preços e cálculo de limite de preço de compra em tempo real no smartphone.
   - Multiplicador de caixas e pacotes.
   - Funcionamento offline com persistência local.
2. **Conferência & Separação no Galpão (Romaneio Mobile):**
   - Visualização da grade de separação das 20 lojas (Clusters A, B e C - 39 pontos).
   - Check-list de conferência por loja durante o carregamento de caminhões.

## 🔄 Lógica Compartilhada
O aplicativo importará diretamente o motor fiscal (`shared/fiscalEngine.ts`) e o motor de separação de lojas (`shared/separationEngine.ts`), garantindo 100% de precisão idêntica ao sistema Web.
