# 📱 Aplicativo Nativo Android - Rede Mega 12 (Android Studio)

Aplicativo Android Nativo construído em **Kotlin** com **Jetpack Compose (Material Design 3)**, Retrofit e Coroutines, projetado para execução direta no **Android Studio**.

---

## 🎯 Módulos Integrados

1. **🛒 Módulo Comprador em Viagens & Feiras:**
   - **Termômetro de Margem em Tempo Real:** Motor fiscal em Kotlin que calcula instantaneamente Lucro Líquido, Markup, Custo Real Efetivo (ICMS 11%, PIS/COFINS 3%, Custos Fixos 26%, Crédito ICMS 19.5%).
   - **Multiplicador de Caixas & Grade das 20 Lojas:** Distribuição automática e proporcional nos Clusters A, B e C (39 pontos).
   - **Lançamento Rápido de Pedidos:** Cadastro touch de itens com sincronização direta com o backend SQLite.

2. **📦 Módulo Conferente de Doca & Romaneio de Galpão:**
   - **Conferência Digital de Cargas:** Visualização da quantidade de caixas e peças destinadas a cada uma das 20 lojas.
   - **Registro de Avarias:** Apontamento imediato de peças avariadas durante o descarregamento de caminhões.

3. **⚙️ Configuração Dinâmica de Servidor:**
   - Tela para alterar o IP da API (`http://10.0.2.2:3001/api/` para emulador ou `http://192.168.X.X:3001/api/` para aparelho físico conectado no Wi-Fi).

---

## 🚀 Como Abrir e Executar no Android Studio

### Passo 1: Abrir o Projeto
1. Abra o **Android Studio**.
2. Clique em **File > Open...** (ou *Open Project* na tela inicial).
3. Selecione a pasta:
   ```
   c:\Users\Josué\Documents\App Rafael\android_app
   ```
4. Clique em **OK** e aguarde o Android Studio realizar a sincronização inicial do Gradle (*Gradle Sync*).

### Passo 2: Executar no Emulador ou Celular
1. Inicie o backend Node.js na raiz do projeto (`iniciar_servidor.bat`).
2. No Android Studio, selecione o dispositivo no topo (Emulador Virtual ou seu Celular conectado via cabo USB com Depuração USB ativada).
3. Clique no botão verde de **Play / Run ▶️ (Shift + F10)**.

### Passo 3: Login no Aplicativo
Utilize os usuários do sistema:
- **Comprador:** `compras@mega12.com.br` | Senha: `123456`
- **Conferente de Doca:** `separacao@mega12.com.br` | Senha: `123456`
- **Diretoria:** `diretoria@mega12.com.br` | Senha: `123456`
