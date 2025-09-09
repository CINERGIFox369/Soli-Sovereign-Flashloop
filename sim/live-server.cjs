#!/usr/bin/env node
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = process.env.LIVE_PORT || 3000;
const SIM_PATH = path.join(__dirname, 'simulator.ts');

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/dashboard') {
    const html = fs.readFileSync(path.join(__dirname, 'dashboard.html'));
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'info', message: 'Connected to simulator live feed' }));
});

function broadcast(obj) {
  const s = JSON.stringify(obj);
  wss.clients.forEach((c) => { if (c.readyState === WebSocket.OPEN) c.send(s); });
}

function startSimulator() {
  const child = spawn(process.execPath, ['--loader', 'ts-node/esm', SIM_PATH], { env: { ...process.env, LIVE: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (data) => {
    const lines = data.toString().split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        broadcast(obj);
      } catch (e) {
        broadcast({ type: 'log', message: line });
      }
    }
  });
  child.stderr.on('data', (d) => broadcast({ type: 'stderr', message: d.toString() }));
  child.on('exit', (c) => broadcast({ type: 'exit', code: c }));
}

server.listen(PORT, () => {
  console.log(`Live simulator server running at http://localhost:${PORT}/dashboard`);
  startSimulator();
});
