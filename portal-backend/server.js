const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

// Carregar variáveis de ambiente (prioriza .env do backend para consistência de segredos)
const backendEnvPath = path.resolve(__dirname, '../backend/.env');
const localEnvPath = path.resolve(__dirname, '.env');
if (fs.existsSync(backendEnvPath)) {
  require('dotenv').config({ path: backendEnvPath });
} else if (fs.existsSync(localEnvPath)) {
  require('dotenv').config({ path: localEnvPath });
} else {
  require('dotenv').config();
}

const routes = require('./src/routes');
const { getPortalDb } = require('./src/config/portal-database');

const app = express();
const PORT = process.env.PORTAL_PORT || 3000;

// Middlewares de Segurança e Parsing com limite ampliado para upload de logotipo em base64
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Rotas da API
app.use('/api', routes);

// Middleware de Erro Global
app.use((err, req, res, next) => {
  console.error('[ERRO PORTAL]:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno no servidor do Portal.'
  });
});

// Inicialização
async function startServer() {
  try {
    await getPortalDb();
    app.listen(PORT, () => {
      console.log(`\n================================================================`);
      console.log(`   💎 PORTAL ERP JÓIA — API CENTRAL MULTI-TENANT`);
      console.log(`   🚀 Rodando em: http://localhost:${PORT}`);
      console.log(`   📡 API Health: http://localhost:${PORT}/api/health`);
      console.log(`================================================================\n`);
    });
  } catch (err) {
    console.error('Falha crítica ao iniciar Portal Backend:', err);
    process.exit(1);
  }
}

startServer();
