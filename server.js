/**
 * SENTINEL IA — Servidor Proxy de Câmeras RTSP
 * ============================================
 * Converte streams RTSP de câmeras IP (Intelbras, Hikvision, Dahua, etc.)
 * para o formato HLS que o navegador lê nativamente.
 *
 * Requisitos:
 *   - FFmpeg instalado no sistema (https://ffmpeg.org/download.html)
 *   - Node.js 18+
 *
 * Como usar:
 *   node server.js
 *   (ou: npm run server)
 *
 * Porta padrão do servidor: 3001
 */

const express    = require('express');
const cors       = require('cors');
const { spawn }  = require('child_process');
const path       = require('path');
const fs         = require('fs');
const os         = require('os');
const sqlite3    = require('sqlite3');
const { open }   = require('sqlite');

const app  = express();
const PORT = 3001;

// ──────────────────────────────────────────────
//  Middleware
// ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Pasta temporária para os segmentos HLS
const HLS_DIR = path.join(os.tmpdir(), 'sentinel_hls');
if (!fs.existsSync(HLS_DIR)) fs.mkdirSync(HLS_DIR, { recursive: true });

// Serve os arquivos HLS gerados (.m3u8 e .ts)
app.use('/hls', express.static(HLS_DIR, {
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store');
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
}));

// ──────────────────────────────────────────────
//  Estado das câmeras ativas
// ──────────────────────────────────────────────
const cameras = {};   // { id: { process, rtsp, name, status, startTime, outputDir } }

// ──────────────────────────────────────────────
//  Banco de Dados (SQLite)
// ──────────────────────────────────────────────
let db;
async function initDB() {
    db = await open({
        filename: path.join(__dirname, 'sentinel.db'),
        driver: sqlite3.Database
    });
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author TEXT,
            reliability INTEGER,
            text TEXT,
            urgency TEXT,
            sentiment TEXT,
            keywords TEXT,
            location TEXT,
            lat REAL,
            lng REAL,
            timestamp TEXT
        )
    `);
    console.log('[DB] Banco de dados SQLite inicializado.');
}

// ──────────────────────────────────────────────
//  Detecta se o FFmpeg está instalado
// ──────────────────────────────────────────────
function checkFFmpeg() {
    return new Promise((resolve) => {
        const proc = spawn('ffmpeg', ['-version'], { stdio: 'pipe', shell: true });
        proc.on('close', (code) => resolve(code === 0));
        proc.on('error', () => resolve(false));
    });
}

// ──────────────────────────────────────────────
//  Inicia stream de uma câmera
// ──────────────────────────────────────────────
function startCamera(id, rtspUrl, name = 'Câmera') {
    if (cameras[id]) stopCamera(id);

    const outputDir = path.join(HLS_DIR, id);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const playlistPath = path.join(outputDir, 'stream.m3u8');

    // FFmpeg: RTSP → HLS com baixa latência
    const ffmpegArgs = [
        '-rtsp_transport', 'tcp',          // Usa TCP (mais estável que UDP para câmeras IP)
        '-i', rtspUrl,                      // URL da câmera RTSP
        '-c:v', 'libx264',                  // Codec de vídeo H.264
        '-preset', 'ultrafast',             // Preset mais rápido (prioriza velocidade)
        '-tune', 'zerolatency',             // Otimiza para latência mínima
        '-crf', '28',                       // Qualidade (18=alta, 28=média, 35=baixa)
        '-b:v', '800k',                     // Bitrate máximo
        '-maxrate', '800k',
        '-bufsize', '1600k',
        '-vf', 'scale=640:360',             // Resolução de saída 360p (leve e rápido)
        '-an',                              // Sem áudio (opcional, remove se precisar de som)
        '-f', 'hls',                        // Formato de saída HLS
        '-hls_time', '2',                   // Duração de cada segmento (segundos)
        '-hls_list_size', '5',              // Número de segmentos mantidos no playlist
        '-hls_flags', 'delete_segments+append_list', // Limpa segmentos antigos automaticamente
        '-hls_segment_filename', path.join(outputDir, 'seg%03d.ts'),
        playlistPath
    ];

    console.log(`[CAM ${id}] Iniciando "${name}" → ${rtspUrl}`);

    const proc = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'pipe', 'pipe'], shell: true });

    proc.stderr.on('data', (data) => {
        const line = data.toString();
        // Log apenas linhas relevantes para evitar spam
        if (line.includes('Error') || line.includes('error') || line.includes('fps=')) {
            if (cameras[id]) {
                cameras[id].lastLog = line.slice(0, 120);
            }
        }
    });

    proc.on('close', (code) => {
        console.log(`[CAM ${id}] Processo FFmpeg encerrado (código ${code})`);
        if (cameras[id]) {
            cameras[id].status = 'stopped';
            cameras[id].process = null;
        }
    });

    proc.on('error', (err) => {
        console.error(`[CAM ${id}] Erro ao iniciar FFmpeg: ${err.message}`);
        if (cameras[id]) cameras[id].status = 'error';
    });

    cameras[id] = {
        id,
        name,
        rtsp: rtspUrl,
        process: proc,
        status: 'starting',
        startTime: new Date().toISOString(),
        outputDir,
        playlistUrl: `/hls/${id}/stream.m3u8`,
        lastLog: ''
    };

    // Após 3s verifica se o m3u8 foi criado (FFmpeg rodando)
    setTimeout(() => {
        if (cameras[id] && fs.existsSync(playlistPath)) {
            cameras[id].status = 'active';
            console.log(`[CAM ${id}] Stream HLS ativo → /hls/${id}/stream.m3u8`);
        } else if (cameras[id] && cameras[id].status === 'starting') {
            cameras[id].status = 'error';
            console.warn(`[CAM ${id}] Timeout: stream não iniciou. Verifique a URL RTSP e o FFmpeg.`);
        }
    }, 4000);

    return cameras[id];
}

// ──────────────────────────────────────────────
//  Para uma câmera
// ──────────────────────────────────────────────
function stopCamera(id) {
    const cam = cameras[id];
    if (!cam) return;

    if (cam.process) {
        try {
            cam.process.kill('SIGTERM');
            setTimeout(() => {
                if (cam.process && !cam.process.killed) cam.process.kill('SIGKILL');
            }, 2000);
        } catch (e) {}
    }

    // Limpa segmentos do disco
    const dir = cam.outputDir;
    if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(file => {
            try { fs.unlinkSync(path.join(dir, file)); } catch(e) {}
        });
    }

    delete cameras[id];
    console.log(`[CAM ${id}] Stream encerrado.`);
}

// ──────────────────────────────────────────────
//  ROTAS DA API REST
// ──────────────────────────────────────────────

// GET /api/status — Status geral do servidor
app.get('/api/status', async (req, res) => {
    const ffmpegOk = await checkFFmpeg();
    res.json({
        server: 'online',
        version: '1.0.0',
        ffmpeg: ffmpegOk ? 'instalado' : 'NÃO ENCONTRADO — instale em https://ffmpeg.org',
        activeCameras: Object.keys(cameras).length,
        timestamp: new Date().toISOString()
    });
});

// GET /api/cameras — Lista câmeras ativas
app.get('/api/cameras', (req, res) => {
    const list = Object.values(cameras).map(cam => ({
        id: cam.id,
        name: cam.name,
        status: cam.status,
        startTime: cam.startTime,
        playlistUrl: cam.playlistUrl,
        hlsFullUrl: `http://localhost:${PORT}${cam.playlistUrl}`
    }));
    res.json({ cameras: list });
});

// POST /api/cameras — Adiciona nova câmera
// Body: { id, rtsp, name }
// Exemplo: { "id": "cam1", "rtsp": "rtsp://admin:senha@192.168.1.100:554/stream1", "name": "Câmera Entrada" }
app.post('/api/cameras', (req, res) => {
    const { id, rtsp, name } = req.body;

    if (!id || !rtsp) {
        return res.status(400).json({ error: 'Campos obrigatórios: id e rtsp' });
    }

    // Valida URL RTSP
    if (!rtsp.startsWith('rtsp://') && !rtsp.startsWith('rtsps://')) {
        return res.status(400).json({ error: 'URL deve começar com rtsp:// ou rtsps://' });
    }

    const cam = startCamera(id, rtsp, name || `Câmera ${id}`);

    res.status(201).json({
        message: 'Câmera iniciando...',
        camera: {
            id: cam.id,
            name: cam.name,
            status: cam.status,
            hlsFullUrl: `http://localhost:${PORT}${cam.playlistUrl}`,
            info: 'O stream HLS ficará disponível em ~5 segundos. Use a URL acima no player.'
        }
    });
});

// DELETE /api/cameras/:id — Remove câmera
app.delete('/api/cameras/:id', (req, res) => {
    const { id } = req.params;
    if (!cameras[id]) return res.status(404).json({ error: 'Câmera não encontrada' });
    stopCamera(id);
    res.json({ message: `Câmera ${id} removida.` });
});

// GET /api/cameras/:id — Status de câmera específica
app.get('/api/cameras/:id', (req, res) => {
    const cam = cameras[req.params.id];
    if (!cam) return res.status(404).json({ error: 'Câmera não encontrada' });
    res.json({
        id: cam.id,
        name: cam.name,
        status: cam.status,
        startTime: cam.startTime,
        hlsFullUrl: `http://localhost:${PORT}${cam.playlistUrl}`,
        lastLog: cam.lastLog
    });
});

// ──────────────────────────────────────────────
//  ROTAS DO BANCO DE DADOS (Relatos NLP)
// ──────────────────────────────────────────────

// GET /api/reports — Lista todos os relatórios salvos
app.get('/api/reports', async (req, res) => {
    try {
        const rows = await db.all('SELECT * FROM reports ORDER BY id DESC');
        // Converte as strings de volta para arrays (keywords)
        const reports = rows.map(r => ({
            id: r.id,
            author: r.author,
            reliability: r.reliability,
            text: r.text,
            urgency: r.urgency,
            analysis: {
                sentiment: r.sentiment,
                keywords: JSON.parse(r.keywords || '[]'),
                location: r.location,
                coords: [r.lat, r.lng],
                timestamp: r.timestamp
            }
        }));
        res.json({ reports });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/reports — Salva um novo relato
app.post('/api/reports', async (req, res) => {
    const { author, reliability, text, urgency, sentiment, keywords, location, coords, timestamp } = req.body;
    try {
        const result = await db.run(`
            INSERT INTO reports (author, reliability, text, urgency, sentiment, keywords, location, lat, lng, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [author, reliability, text, urgency, sentiment, JSON.stringify(keywords), location, coords[0], coords[1], timestamp]);
        res.status(201).json({ id: result.lastID, message: 'Relato salvo com sucesso.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/reports — Limpa todo o banco de dados (Limpar Logs)
app.delete('/api/reports', async (req, res) => {
    try {
        await db.run('DELETE FROM reports');
        res.json({ message: 'Todos os logs foram apagados.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ──────────────────────────────────────────────
//  Página de gerenciamento embutida
// ──────────────────────────────────────────────
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Sentinel IA — Servidor de Câmeras</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #060913; color: #f1f5f9; font-family: 'Segoe UI', sans-serif; min-height: 100vh; padding: 2rem; }
  h1 { font-size: 1.8rem; background: linear-gradient(90deg, #00d2ff, #7000ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 0.25rem; }
  .sub { color: #64748b; font-size: 0.85rem; margin-bottom: 2rem; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  .card { background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 1.5rem; }
  h2 { font-size: 1rem; color: #00d2ff; margin-bottom: 1rem; }
  label { font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 0.3rem; margin-top: 0.75rem; }
  input { width: 100%; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); color: #f1f5f9; padding: 0.6rem 0.8rem; border-radius: 6px; font-size: 0.85rem; }
  input:focus { outline: none; border-color: #00d2ff; }
  button { margin-top: 1rem; padding: 0.65rem 1.2rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
  .btn-add { background: linear-gradient(135deg, #00d2ff, #7000ff); color: white; }
  .btn-del { background: rgba(255,56,96,0.15); color: #ff3860; border: 1px solid rgba(255,56,96,0.3); margin-left: 0.5rem; }
  .status-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .cam-item { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 0.75rem; }
  .cam-name { font-weight: 600; font-size: 0.9rem; }
  .cam-url { font-size: 0.7rem; color: #00d2ff; word-break: break-all; margin-top: 0.25rem; }
  .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 10px; font-size: 0.65rem; font-weight: 600; margin-left: 0.5rem; }
  .badge-active { background: rgba(0,255,136,0.15); color: #00ff88; }
  .badge-starting { background: rgba(255,184,0,0.15); color: #ffb800; }
  .badge-error { background: rgba(255,56,96,0.15); color: #ff3860; }
  .endpoint { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); padding: 0.5rem 0.75rem; border-radius: 6px; font-family: monospace; font-size: 0.78rem; color: #7dd3fc; margin-bottom: 0.5rem; }
  .msg { margin-top: 0.75rem; padding: 0.6rem; border-radius: 6px; font-size: 0.8rem; display:none; }
  .msg-ok { background: rgba(0,255,136,0.1); color: #00ff88; border: 1px solid rgba(0,255,136,0.2); }
  .msg-err { background: rgba(255,56,96,0.1); color: #ff3860; border: 1px solid rgba(255,56,96,0.2); }
  #ffmpeg-status { padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.8rem; margin-bottom: 1.5rem; font-weight: 600; }
</style>
</head>
<body>
<h1>⚙ SENTINEL IA — Servidor de Câmeras</h1>
<p class="sub">Proxy RTSP → HLS | Porta ${PORT}</p>
<div id="ffmpeg-status">Verificando FFmpeg...</div>
<div class="grid">
  <div class="card">
    <h2>📡 Adicionar Câmera IP (RTSP)</h2>
    <label>ID único da câmera</label>
    <input id="in-id" placeholder="Ex: cam1" />
    <label>Nome descritivo</label>
    <input id="in-name" placeholder="Ex: Câmera Entrada Principal" />
    <label>URL RTSP</label>
    <input id="in-rtsp" placeholder="rtsp://admin:senha@192.168.1.100:554/stream1" />
    <button class="btn-add" onclick="addCam()">▶ Iniciar Câmera</button>
    <div class="msg" id="msg"></div>
  </div>
  <div class="card">
    <h2>📺 Câmeras Ativas</h2>
    <div class="status-list" id="cam-list"><p style="color:#64748b;font-size:0.85rem">Nenhuma câmera ativa.</p></div>
  </div>
</div>
<br>
<div class="card">
  <h2>📌 URLs de API para o Frontend (Sentinel IA Dashboard)</h2>
  <div class="endpoint">GET  http://localhost:${PORT}/api/status</div>
  <div class="endpoint">GET  http://localhost:${PORT}/api/cameras</div>
  <div class="endpoint">POST http://localhost:${PORT}/api/cameras   → { id, rtsp, name }</div>
  <div class="endpoint">DEL  http://localhost:${PORT}/api/cameras/:id</div>
  <div class="endpoint">Exemplo HLS: http://localhost:${PORT}/hls/cam1/stream.m3u8</div>
</div>

<script>
async function init() {
  const r = await fetch('/api/status').then(r=>r.json());
  const el = document.getElementById('ffmpeg-status');
  if (r.ffmpeg === 'instalado') {
    el.style.background = 'rgba(0,255,136,0.1)';
    el.style.color = '#00ff88';
    el.style.border = '1px solid rgba(0,255,136,0.2)';
    el.textContent = '✅ FFmpeg detectado — Servidor pronto para transcodificar câmeras RTSP';
  } else {
    el.style.background = 'rgba(255,56,96,0.1)';
    el.style.color = '#ff3860';
    el.style.border = '1px solid rgba(255,56,96,0.2)';
    el.textContent = '❌ FFmpeg NÃO encontrado! Baixe em: https://www.gyan.dev/ffmpeg/builds/ e adicione ao PATH';
  }
  loadCams();
}

async function addCam() {
  const id   = document.getElementById('in-id').value.trim();
  const name = document.getElementById('in-name').value.trim();
  const rtsp = document.getElementById('in-rtsp').value.trim();
  const msg  = document.getElementById('msg');
  if (!id || !rtsp) { showMsg('Preencha o ID e a URL RTSP.', false); return; }
  const r = await fetch('/api/cameras', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name, rtsp })
  });
  const data = await r.json();
  if (r.ok) {
    showMsg('Câmera iniciando! URL HLS: ' + data.camera.hlsFullUrl, true);
    setTimeout(loadCams, 2000);
  } else {
    showMsg('Erro: ' + data.error, false);
  }
}

async function loadCams() {
  const { cameras } = await fetch('/api/cameras').then(r=>r.json());
  const el = document.getElementById('cam-list');
  if (!cameras.length) { el.innerHTML = '<p style="color:#64748b;font-size:0.85rem">Nenhuma câmera ativa.</p>'; return; }
  el.innerHTML = cameras.map(c => {
    const badge = c.status === 'active' ? 'active' : c.status === 'error' ? 'error' : 'starting';
    return '<div class="cam-item">' +
      '<div class="cam-name">' + c.name + '<span class="badge badge-' + badge + '">' + c.status + '</span></div>' +
      '<div class="cam-url">' + c.hlsFullUrl + '</div>' +
      '<div style="margin-top:0.5rem">' +
        '<button class="btn-del" onclick="delCam(\\'' + c.id + '\\')">✕ Remover</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

async function delCam(id) {
  await fetch('/api/cameras/' + id, { method: 'DELETE' });
  loadCams();
}

function showMsg(text, ok) {
  const el = document.getElementById('msg');
  el.className = 'msg ' + (ok ? 'msg-ok' : 'msg-err');
  el.textContent = text;
  el.style.display = 'block';
}

init();
setInterval(loadCams, 5000);
</script>
</body>
</html>
`);
});

// ──────────────────────────────────────────────
//  Limpeza ao encerrar o servidor
// ──────────────────────────────────────────────
function shutdown() {
    console.log('\n[SENTINEL] Encerrando servidor — parando todos os streams...');
    Object.keys(cameras).forEach(stopCamera);
    process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ──────────────────────────────────────────────
//  Inicialização
// ──────────────────────────────────────────────
app.listen(PORT, async () => {
    await initDB();
    const ffmpegOk = await checkFFmpeg();
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║  SENTINEL IA — Servidor de Câmeras RTSP  ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(`  Interface:  http://localhost:${PORT}`);
    console.log(`  API REST:   http://localhost:${PORT}/api/cameras`);
    console.log(`  FFmpeg:     ${ffmpegOk ? '✅ Instalado' : '❌ NÃO ENCONTRADO (necessário!)'}`);
    if (!ffmpegOk) {
        console.log('');
        console.log('  ⚠️  Instale o FFmpeg: https://www.gyan.dev/ffmpeg/builds/');
        console.log('     Baixe "ffmpeg-release-essentials.zip", extraia e adicione a pasta bin ao PATH do Windows.');
    }
    console.log('');
    console.log('  Para adicionar uma câmera, faça um POST para /api/cameras:');
    console.log('  { "id": "cam1", "rtsp": "rtsp://admin:senha@IP:554/stream1", "name": "Câmera 1" }');
    console.log('');
});
