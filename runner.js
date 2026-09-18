const { spawn, exec } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const portalBackendDir = path.join(rootDir, 'portal-backend');
const backendDir = path.join(rootDir, 'backend');
const webDir = path.join(rootDir, 'web');

console.log('================================================================');
console.log('           PORTAL ERP JÓIA — SERVIDOR MULTI-TENANT');
console.log('================================================================\n');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

// 1. Iniciar Portal Backend (Porta 3000)
console.log('[1/3] Iniciando Portal Backend API (Porta 3000)...');
const portalBackend = spawn(npmCmd, ['start'], {
  cwd: portalBackendDir,
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe']
});

portalBackend.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[35m[PORTAL API]\x1b[0m ${data.toString()}`);
});
portalBackend.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[31m[PORTAL AVISO]\x1b[0m ${data.toString()}`);
});

// 2. Iniciar ERP Backend API (Porta 3001)
console.log('[2/3] Iniciando ERP Backend Multi-Tenant (Porta 3001)...');
const backend = spawn(npmCmd, ['start'], {
  cwd: backendDir,
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe']
});

backend.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[36m[ERP API]\x1b[0m ${data.toString()}`);
});
backend.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[31m[ERP AVISO]\x1b[0m ${data.toString()}`);
});

// 3. Iniciar Frontend Web (Porta 5173)
console.log('[3/3] Iniciando Frontend Web (Vite)...');
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: webDir,
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe']
});

frontend.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[32m[FRONTEND]\x1b[0m ${data.toString()}`);
});
frontend.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[33m[FRONTEND AVISO]\x1b[0m ${data.toString()}`);
});

// 4. Abrir navegador automaticamente no Portal
setTimeout(() => {
  const startCmd = isWin ? 'start' : (process.platform === 'darwin' ? 'open' : 'xdg-open');
  exec(`${startCmd} http://localhost:5173`);
  console.log('\n\x1b[32m================================================================\x1b[0m');
  console.log('\x1b[32m>>> Sistema aberto no navegador: http://localhost:5173\x1b[0m');
  console.log('\x1b[35m>>> Portal API (Tenants & Root): http://localhost:3000/api/health\x1b[0m');
  console.log('\x1b[36m>>> ERP Backend API (Multi-Tenant): http://localhost:3001/api/health\x1b[0m');
  console.log('\x1b[33m>>> Pressione Ctrl+C nesta tela para encerrar todos os serviços.\x1b[0m');
  console.log('\x1b[32m================================================================\x1b[0m\n');
}, 3500);

let exiting = false;
const cleanExit = () => {
  if (exiting) return;
  exiting = true;
  console.log('\nEncerrando todos os servidores...');
  if (isWin) {
    if (portalBackend.pid) exec(`taskkill /pid ${portalBackend.pid} /T /F 2>nul`);
    if (backend.pid) exec(`taskkill /pid ${backend.pid} /T /F 2>nul`);
    if (frontend.pid) exec(`taskkill /pid ${frontend.pid} /T /F 2>nul`);
  } else {
    portalBackend.kill();
    backend.kill();
    frontend.kill();
  }
  process.exit(0);
};

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
