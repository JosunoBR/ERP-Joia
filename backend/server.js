const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./src/config/environment');
const routes = require('./src/routes');
const { errorHandler } = require('./src/middlewares/error.middleware');

const app = express();

// 1. Headers de Segurança & Proteção HTTP
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false
}));

// 2. Middlewares de Requisição
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

const fs = require('fs');
const path = require('path');

// 3. Montagem das Rotas da API Modular
app.use('/api', routes);

// 4. Servir Frontend Web (React SPA em Produção/Nuvem)
const webDistPath = path.join(__dirname, '../web/dist');
if (fs.existsSync(webDistPath)) {
  app.use(express.static(webDistPath));

  // Qualquer rota GET que não seja /api entrega o index.html para o React Router
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(webDistPath, 'index.html'));
  });
}

// 5. Middleware Global de Tratamento de Erros
app.use(errorHandler);

// 6. Inicialização do Servidor
async function bootstrap() {
  try {
    const server = app.listen(config.PORT, () => {
      console.log(`🚀 Jóia ERP — Servidor Backend rodando na porta ${config.PORT}`);
      console.log(`🛡️ Segurança: Helmet, JWT e Bcrypt Ativos | Multi-Tenant | Clean Architecture`);
      console.log(`📂 Bancos de dados por tenant em: data/`);
      if (fs.existsSync(webDistPath)) {
        console.log(`🌐 Frontend Web Ativo e Integrado (Servindo de ${webDistPath})`);
      }
    });

    // 🛡️ Graceful Shutdown para Containers (Render / Railway / Docker SIGTERM e SIGINT)
    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 Sinal ${signal} recebido. Persistindo todos os bancos de dados de tenants no disco...`);
      try {
        const { saveAllTenantsToDisk } = require('./src/config/database');
        const savedCount = saveAllTenantsToDisk();
        console.log(`✔ ${savedCount} banco(s) de dados de tenant persistido(s) com sucesso antes do encerramento.`);
      } catch (saveErr) {
        console.error('Erro ao persistir bancos no encerramento:', saveErr.message);
      }
      server.close(() => {
        console.log('Servidor finalizado com segurança.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    console.error('Falha crítica na inicialização do servidor:', err);
    process.exit(1);
  }
}

bootstrap();

module.exports = app;
