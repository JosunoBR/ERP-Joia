# Diretrizes de Desenvolvimento do Sistema
> **Pilares Fundamentais: Segurança da Informação (Security by Design) e Clean Code & Design**
> Este documento é a referência normativa do projeto e deve ser consultado e respeitado em todas as etapas de desenvolvimento, arquitetura, codificação e revisão.

---

## 1. 🛡️ Pilares de Segurança (Security by Design)

### 1.1 Autenticação e Autorização Robustas
- **Autenticação Moderna**: Implemente fluxos modernos e seguros (OAuth2, OIDC, JWT com rotação e expiração curta).
- **Controle de Acesso Granular (RBAC / ABAC)**: Utilize RBAC (*Role-Based Access Control*) ou ABAC (*Attribute-Based Access Control*) garantindo o princípio do menor privilégio (usuários acessam estritamente o que suas funções/perfis permitem).
- **Criptografia de Senhas**: Sempre utilize algoritmos de derivação de chave e hash robustos para senhas (ex: **Argon2id** ou **bcrypt**).

### 1.2 Tratamento de Dados e Validação de Entrada
- **Zero Trust em Entradas do Cliente**: Nunca confie em dados recebidos do cliente. Valide tipos, tamanhos, formatos e regras de negócio no front-end e **obrigatoriamente no back-end**.
- **Prevenção a SQL Injection**: Use sempre *Prepared Statements* / *Queries Parametrizadas* ou ORMs adequados, eliminando riscos de concatenação de strings em queries.
- **Prevenção a XSS (Cross-Site Scripting)**: Sanitize e escape saídas de texto e entradas de usuário antes de renderizar no DOM.

### 1.3 Gestão de Segredos e Variáveis de Ambiente
- **Sem Credenciais no Repositório**: Jamais faça commit de chaves de API, senhas de banco de dados, certificados ou tokens no controle de versão.
- **Ambientes Isolados & Cofres**: Utilize arquivos `.env` locais devidamente ignorados no `.gitignore` e soluções de cofre de segredos em produção (ex: Vault, AWS Secrets Manager, Azure Key Vault).

### 1.4 Criptografia e Comunicação Segura
- **Criptografia em Trânsito**: Force HTTPS/TLS em todos os endpoints e configure headers de segurança recomendados (`Content-Security-Policy`, `HSTS`, `X-Frame-Options`, etc.).
- **Criptografia em Repouso (LGPD/GDPR)**: Criptografe dados sensíveis em repouso, incluindo documentos pessoais, dados financeiros e credenciais de acesso.

### 1.5 Auditoria e Logs Seguros
- **Trilha de Auditoria Completa**: Registre eventos e ações críticas do sistema (quem executou, qual ação, quando ocorreu e identificador de origem).
- **Sanitização de Logs**: Nunca registre senhas, tokens de autenticação, dados de cartão ou informações de identificação pessoal (PII) nos arquivos de log.

### 1.6 Controle de Dependências
- **Monitoramento de Vulnerabilidades**: Monitore ativamente vulnerabilidades conhecidas em bibliotecas e dependências de terceiros utilizando ferramentas como `npm audit`, `pip-audit`, `Snyk` ou `Dependabot`.

---

## 2. 💎 Código Limpo e Arquitetura Sustentável (Clean Code & Design)

### 2.1 Legibilidade e Nomenclatura Clara
- **Nomes Autoexplicativos**: Variáveis, funções, classes e módulos devem ter nomes claros que comuniquem sua intenção sem necessidade de comentários supérfluos.
- **Evitar Abreviações Crípticas**: Prefira nomes completos e expressivos (ex: prefira `calcular_total_pedido()` ou `calculateOrderTotal()` a `calc()`).

### 2.2 Princípios SOLID
- **S (Responsabilidade Única / Single Responsibility)**: Cada classe, função ou componente deve ter uma única razão para mudar.
- **O (Aberto/Fechado / Open-Closed)**: Entidades de software devem ser abertas para extensão, mas fechadas para modificação.
- **D (Inversão de Dependência / Dependency Inversion)**: Dependa de abstrações/interfaces e não de implementações concretas, facilitando testes, mocks e desacoplamento.

### 2.3 Separação de Camadas (Clean Architecture / MVC)
- **Isolamento de Regra de Negócio**: Separe estritamente a lógica de negócio das camadas de persistência/banco e de apresentação (rotas, controllers, UI).
- **Independência Tecnológica**: Alterações no framework web, banco de dados ou biblioteca de interface não devem quebrar ou exigir refatoração na regra de negócio.

### 2.4 Tratamento Adequado de Erros
- **Tratamento Explícito e Elegante**: Capture e trate exceções de maneira controlada; evite falhas silenciosas ou genéricas que interrompam o fluxo inesperadamente.
- **Mensagens Seguras ao Cliente**: Retorne mensagens amigáveis e padronizadas para o cliente/front-end e mantenha detalhes técnicos e *stack traces* restritos aos logs internos seguros.
