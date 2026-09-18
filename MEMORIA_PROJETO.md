# 🧠 MEMÓRIA DO PROJETO: APP & SISTEMA DE COMPRAS (REDE MEGA 12)

## 📌 1. Visão Geral e Contexto
- **Cliente:** Rafael (Rede Mega 12) - Rede de Varejo / Bazar (20 Lojas no PR).
- **Origem dos Dados:** Planilha `MATRIZ.xlsx`.
- **Identidade Visual:** Mesma linguagem do **App Érica** (Tema *Emerald Green* `#10B981`, *Dark Slate* `#0F172A`, *Surface* `#F8FAFC`, Material Design 3, bordas arredondadas e modo Claro/Escuro).
- **Navegação & Arquitetura:** **Single Page Application (SPA)** com **Menu Lateral Fixo (Sidebar)** à esquerda com 6 páginas dedicadas.
- **Persistência:** Banco de dados físico **SQLite (`backend/data/mega12.db`)**.

---

## 👥 2. Autenticação & Níveis de Acesso Planejados (RBAC)
- **Página de Login:** Autenticação de usuários cadastrados com controle de sessão.
- **Perfis de Acesso:**
  1. 👑 **Diretoria / Admin:** Acesso total a todas as telas, margens, faturamento, BI, usuários e fiscal.
  2. 🛒 **Comprador:** Cotações, pedidos, histórico, fornecedores e App Mobile de Compras em Viagens.
  3. 📦 **Conferente de Doca:** Separação das 20 lojas, Romaneio Digital Mobile e Avarias de Doca (*sem acesso a custos e margens de lucro*).
  4. 🚚 **Motorista / Expedição:** Romaneios de Carga por Roteiro de Lojas e Guias de Entrega da sua rota.

---

## 📱 3. Módulo Mobile Planejado (Celular / Tablet / PWA)
- **Modo 1 - Comprador em Viagens (Mesa do Fornecedor / Feiras):** Digitação rápida touch, multiplicador de caixas, termômetro de margem em tempo real no celular e botão de compartilhamento do espelho do pedido/PDF por WhatsApp.
- **Modo 2 - Romaneio Digital de Bolso (Galpão / Doca / Caminhões):** Substituição da prancheta de papel, check-in de caixas por loja e lançamento de avarias no celular durante o descarregamento.
- **Instalação PWA:** Ícone nativo na tela inicial do celular com sincronização com a API SQLite.

---

## 🤝 4. Painel de Barganha & Inteligência de Negociação com Fornecedores (`/dashboard`)
- **Filtro de Fornecedor Dedicado:** Dropdown permite selecionar um parceiro específico ou ver o ranking geral.
- **Dossiê Completo de Negociação:**
  1. **Volume Total Acumulado:** Total investido em R$, peças e caixas compradas.
  2. **Ticket Médio & Frequência:** Média por cotação e histórico de pedidos.
  3. **ST & Desconto Médio Real:** Calculado sobre o histórico efetivo de compras.
  4. **Gráfico Mensal Exclusivo:** Evolução de compras mês a mês (Jan a Dez/2026) com aquele fornecedor específico.
  5. **Recomendações Estratégicas de Barganha:**
     - *Alavancagem de Volume:* Argumento para pedir **+3% a +5% de desconto comercial OFF**.
     - *Ampliação de Prazo:* Proposta de extensão de 30/60/90 para **30/60/90/120 Dias**.
     - *Compensação de ST:* Bonificação em peças para neutralizar alíquotas de ST.
     - *Conferência de Doca:* Histórico de peças avariadas para exigir paletização PBR e abatimento em duplicata.
  6. **Produtos Mais Comprados:** Lista detalhada dos itens adquiridos daquele fornecedor.

---

## 🗄️ 5. Banco de Dados SQLite (`backend/data/mega12.db`)
- **Arquivo físico no disco:** `backend/data/mega12.db`.
- **Tabelas Existentes & Planejadas:**
  1. `purchase_orders`: Pedidos de compra, conferente e apontamento de avarias.
  2. `order_items`: Produtos, caixas, total de peças, preços, PDV alvo, custo real e grade das 20 lojas.
  3. `order_avarias`: Tabela de Perdas & Avarias.
  4. `suppliers`: Cadastro de fornecedores com ST padrão, IPI, vendedor, telefone e paletização.
  5. `fiscal_config`: Alíquotas fiscais globais (ICMS, PIS/COFINS, Custos Fixos, Crédito ICMS).
  6. `stores`: 20 Lojas ativas, clusters A/B/C e pesos de rateio (39 pontos).
  7. `order_sequence`: Controle do número sequencial automático (`PED-0001`, `PED-0002`...).
  8. `users` (Planejado): Usuários, perfis (roles) e senhas criptografadas.

---

## 📦 6. Regras de Avarias, Unidades de Medida & Destaque Visual na Matriz
- **Dedução Real na Grade:** Toda avaria apontada para uma loja desconta imediatamente a quantidade daquela filial na matriz de 20 lojas, no Excel e no PDF.
- **Conversão por Unidade de Medida:** `UN` (×1), `CX` (×qtdPorPacote), `PCT` (×qtdPorPacote), `PAR` (×2), `JG` (×qtdPorPacote).
- **Destaque Visual das Células com Avaria:** Fundo amarelo com borda âmbar e indicação `-X avaria`.

---

## 🛡️ 7. Diretrizes Normativas do Projeto (Segurança & Clean Code)
- O projeto segue obrigatoriamente as diretrizes registradas em [AGENTS.md](file:///c:/Users/Josu%C3%A9/Documents/App%20Rafael/AGENTS.md) e [.agents/rules/security_and_clean_code.md](file:///c:/Users/Josu%C3%A9/Documents/App%20Rafael/.agents/rules/security_and_clean_code.md), abrangendo:
  1. **Segurança (Security by Design):** Autenticação/RBAC, validação obrigatória no back-end, queries parametrizadas (anti-SQL Injection), sanitização anti-XSS, gestão estrita de segredos (.env fora do Git), criptografia em trânsito/repouso e logs sanitizados sem PII/senhas.
  2. **Código Limpo (Clean Code & SOLID):** Nomenclatura autoexplicativa sem abreviações confusas, Princípios SOLID, isolamento de regras de negócio (Clean Architecture / MVC) e tratamento elegante de erros.

