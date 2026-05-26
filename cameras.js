/**
 * SENTINEL IA — cameras.js
 * ========================
 * Lógica de integração com o servidor proxy RTSP (server.js porta 3001).
 * Gerencia câmeras IP: adicionar, remover, monitorar status e exibir streams HLS ao vivo.
 */

const SERVER_URL = 'http://localhost:3001';

// Mapa de instâncias HLS ativas { cameraId: Hls instance }
const hlsInstances = {};

// ──────────────────────────────────────────────
//  STATUS DO SERVIDOR
// ──────────────────────────────────────────────
async function checkServerStatus() {
    const dot  = document.getElementById('server-status-dot');
    const text = document.getElementById('server-status-text');

    dot.className  = 'server-dot loading';
    text.textContent = 'Conectando ao servidor proxy...';

    try {
        const res  = await fetch(`${SERVER_URL}/api/status`, { signal: AbortSignal.timeout(3000) });
        const data = await res.json();

        dot.className  = 'server-dot online';
        const ffmpegBadge = data.ffmpeg === 'instalado'
            ? '<span style="color:var(--color-success)">✅ FFmpeg OK</span>'
            : '<span style="color:var(--color-danger)">❌ FFmpeg ausente</span>';

        text.innerHTML = `Servidor online | ${ffmpegBadge} | ${data.activeCameras} câmera(s) ativa(s)`;

        // Atualiza lista ao conectar
        refreshIPCameraList();
    } catch (e) {
        dot.className  = 'server-dot offline';
        text.innerHTML = '⚠️ <span style="color:var(--text-muted)">Modo Frontend Isolado:</span> Conexão com câmeras físicas desativada. (Recurso disponível apenas no ambiente local executando o Proxy HLS).';
    }
}

// ──────────────────────────────────────────────
//  ADICIONAR CÂMERA
// ──────────────────────────────────────────────
async function addIPCamera() {
    const id   = document.getElementById('ip-cam-id').value.trim().replace(/\s+/g, '_');
    const name = document.getElementById('ip-cam-name').value.trim();
    const rtsp = document.getElementById('ip-cam-rtsp').value.trim();
    const msg  = document.getElementById('ip-cam-msg');

    if (!id || !rtsp) {
        showCamMsg('⚠️ Preencha o ID e a URL RTSP da câmera.', 'warn');
        return;
    }
    if (!rtsp.startsWith('rtsp://') && !rtsp.startsWith('rtsps://')) {
        showCamMsg('⚠️ A URL deve começar com rtsp:// ou rtsps://', 'warn');
        return;
    }

    showCamMsg('📡 Enviando para o servidor...', 'info');

    try {
        const res  = await fetch(`${SERVER_URL}/api/cameras`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ id, name: name || `Câmera ${id}`, rtsp })
        });
        const data = await res.json();

        if (res.ok) {
            showCamMsg(`✅ Câmera iniciando! O stream ficará disponível em ~5 segundos.`, 'ok');
            // Limpa campos
            document.getElementById('ip-cam-id').value   = '';
            document.getElementById('ip-cam-name').value = '';
            document.getElementById('ip-cam-rtsp').value = '';
            // Aguarda e atualiza lista + player
            setTimeout(() => {
                refreshIPCameraList();
                refreshHLSViewers();
            }, 5500);
        } else {
            showCamMsg(`❌ Erro: ${data.error}`, 'error');
        }
    } catch (e) {
        showCamMsg('❌ Não foi possível conectar ao servidor. Certifique-se de que o <code>node server.js</code> está em execução.', 'error');
    }
}

// ──────────────────────────────────────────────
//  REMOVER CÂMERA
// ──────────────────────────────────────────────
async function removeIPCamera(id) {
    try {
        await fetch(`${SERVER_URL}/api/cameras/${id}`, { method: 'DELETE' });
        // Destrói instância HLS se existir
        if (hlsInstances[id]) {
            hlsInstances[id].destroy();
            delete hlsInstances[id];
        }
        refreshIPCameraList();
        refreshHLSViewers();
    } catch (e) {
        console.warn(`Falha ao remover câmera ${id}:`, e);
    }
}

// ──────────────────────────────────────────────
//  LISTAR CÂMERAS ATIVAS (painel lateral)
// ──────────────────────────────────────────────
async function refreshIPCameraList() {
    const listEl = document.getElementById('ip-camera-list');
    if (!listEl) return;

    try {
        const res  = await fetch(`${SERVER_URL}/api/cameras`, { signal: AbortSignal.timeout(3000) });
        const data = await res.json();

        if (!data.cameras || data.cameras.length === 0) {
            listEl.innerHTML = '<div style="color:var(--text-dark); font-size:0.85rem; text-align:center; padding:2rem 0;">Nenhuma câmera IP conectada.</div>';
            return;
        }

        listEl.innerHTML = data.cameras.map(cam => {
            const badgeClass = cam.status === 'active'   ? 'badge-active'
                             : cam.status === 'error'    ? 'badge-error'
                             : 'badge-starting';
            const badgeLabel = cam.status === 'active'   ? '● AO VIVO'
                             : cam.status === 'error'    ? '✕ ERRO'
                             : '◌ INICIANDO';

            return `
            <div class="ip-cam-item">
                <div class="ip-cam-header">
                    <div>
                        <div class="ip-cam-name">${cam.name}</div>
                        <div class="ip-cam-id-label">ID: ${cam.id}</div>
                    </div>
                    <span class="badge ${badgeClass}">${badgeLabel}</span>
                </div>
                <div class="ip-cam-url">${cam.hlsFullUrl}</div>
                <div class="ip-cam-actions">
                    <button class="btn btn-success" style="font-size:0.7rem; padding:0.2rem 0.6rem;"
                        onclick="refreshHLSViewers()">▶ Atualizar Player</button>
                    <button class="btn btn-danger" style="font-size:0.7rem; padding:0.2rem 0.6rem;"
                        onclick="removeIPCamera('${cam.id}')">✕ Remover</button>
                </div>
            </div>`;
        }).join('');

    } catch (e) {
        listEl.innerHTML = '<div style="color:var(--color-danger); font-size:0.8rem; padding:1rem;">Servidor offline ou inacessível.</div>';
    }
}

// ──────────────────────────────────────────────
//  PLAYERS HLS AO VIVO (grid inferior)
// ──────────────────────────────────────────────
async function refreshHLSViewers() {
    const grid = document.getElementById('hls-viewers-grid');
    if (!grid) return;

    try {
        const res  = await fetch(`${SERVER_URL}/api/cameras`, { signal: AbortSignal.timeout(3000) });
        const data = await res.json();

        if (!data.cameras || data.cameras.length === 0) {
            // Destrói todos os players pendentes
            Object.values(hlsInstances).forEach(h => h.destroy());
            Object.keys(hlsInstances).forEach(k => delete hlsInstances[k]);
            grid.innerHTML = '<div style="color:var(--text-dark); font-size:0.85rem; text-align:center; padding:2rem 0;">Os feeds de vídeo ao vivo aparecerão aqui assim que as câmeras forem conectadas.</div>';
            return;
        }

        // Identifica quais câmeras ainda não têm player
        const existingIds = new Set([...grid.querySelectorAll('.hls-cell')].map(el => el.dataset.camId));
        const serverIds   = new Set(data.cameras.map(c => c.id));

        // Remove players de câmeras removidas do servidor
        existingIds.forEach(id => {
            if (!serverIds.has(id)) {
                const cell = grid.querySelector(`.hls-cell[data-cam-id="${id}"]`);
                if (cell) cell.remove();
                if (hlsInstances[id]) { hlsInstances[id].destroy(); delete hlsInstances[id]; }
            }
        });

        // Adiciona players para câmeras novas
        data.cameras.forEach(cam => {
            if (!existingIds.has(cam.id)) {
                const cell = document.createElement('div');
                cell.className  = 'hls-cell';
                cell.dataset.camId = cam.id;

                const statusLabel = cam.status === 'active' ? '● AO VIVO' : '◌ AGUARDANDO STREAM';
                const statusColor = cam.status === 'active' ? 'var(--color-success)' : 'var(--color-warning)';

                cell.innerHTML = `
                    <div class="hls-cam-header">
                        <span class="hls-cam-name">${cam.name}</span>
                        <span style="font-size:0.65rem; color:${statusColor}; font-weight:700;">${statusLabel}</span>
                    </div>
                    <div class="hls-video-wrapper">
                        <video id="hls-video-${cam.id}" class="hls-video" autoplay muted playsinline controls></video>
                        <div class="hls-loading-overlay" id="hls-overlay-${cam.id}">
                            <div class="hls-spinner"></div>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.5rem;">Aguardando stream...</div>
                        </div>
                    </div>
                    <div class="hls-cam-footer">
                        <span style="font-size:0.65rem; color:var(--text-dark); font-family:var(--font-mono);">${cam.hlsFullUrl}</span>
                        <button class="btn btn-danger" style="font-size:0.65rem; padding:0.15rem 0.5rem;" onclick="removeIPCamera('${cam.id}')">✕</button>
                    </div>`;

                grid.appendChild(cell);

                // Inicia o HLS.js player para essa câmera
                if (cam.status === 'active') {
                    initHLSPlayer(cam.id, cam.hlsFullUrl);
                } else {
                    // Câmera ainda iniciando, tenta novamente em 5s
                    setTimeout(() => initHLSPlayer(cam.id, cam.hlsFullUrl), 5000);
                }
            }
        });

    } catch (e) {
        grid.innerHTML = '<div style="color:var(--color-danger); font-size:0.8rem; padding:1rem;">Servidor offline ou inacessível.</div>';
    }
}

// ──────────────────────────────────────────────
//  INIT HLS.JS PLAYER
// ──────────────────────────────────────────────
function initHLSPlayer(camId, hlsUrl) {
    const video   = document.getElementById(`hls-video-${camId}`);
    const overlay = document.getElementById(`hls-overlay-${camId}`);
    if (!video) return;

    // Destrói instância anterior se existir
    if (hlsInstances[camId]) {
        hlsInstances[camId].destroy();
        delete hlsInstances[camId];
    }

    if (Hls.isSupported()) {
        const hls = new Hls({
            lowLatencyMode:     true,
            backBufferLength:   5,
            maxBufferLength:    10,
            maxMaxBufferLength: 30
        });
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {});
            if (overlay) overlay.style.display = 'none';
            // Atualiza status badge
            const cell = document.querySelector(`.hls-cell[data-cam-id="${camId}"]`);
            if (cell) {
                const badge = cell.querySelector('.hls-cam-header span:last-child');
                if (badge) { badge.textContent = '● AO VIVO'; badge.style.color = 'var(--color-success)'; }
            }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                console.warn(`[HLS ${camId}] Erro fatal, tentando reconectar em 5s...`, data);
                hls.destroy();
                setTimeout(() => initHLSPlayer(camId, hlsUrl), 5000);
            }
        });

        hlsInstances[camId] = hls;

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Fallback nativo para Safari / iOS
        video.src = hlsUrl;
        video.addEventListener('loadedmetadata', () => {
            video.play().catch(() => {});
            if (overlay) overlay.style.display = 'none';
        });
    } else {
        if (overlay) overlay.innerHTML = '<div style="color:var(--color-danger); font-size:0.8rem;">HLS não suportado neste navegador.</div>';
    }
}

// ──────────────────────────────────────────────
//  UTILITÁRIOS DA INTERFACE
// ──────────────────────────────────────────────
function showCamMsg(html, type) {
    const el = document.getElementById('ip-cam-msg');
    if (!el) return;
    el.style.display  = 'block';
    el.style.padding  = '0.5rem 0.75rem';
    el.style.borderRadius = '6px';

    const styles = {
        ok:    { bg: 'rgba(0,255,136,0.1)',  border: 'rgba(0,255,136,0.25)',  color: 'var(--color-success)' },
        error: { bg: 'rgba(255,56,96,0.1)',  border: 'rgba(255,56,96,0.25)', color: 'var(--color-danger)'  },
        warn:  { bg: 'rgba(255,184,0,0.1)', border: 'rgba(255,184,0,0.25)', color: 'var(--color-warning)' },
        info:  { bg: 'rgba(0,210,255,0.08)', border: 'rgba(0,210,255,0.2)',  color: 'var(--color-primary)' }
    };
    const s = styles[type] || styles.info;
    el.style.background  = s.bg;
    el.style.border      = `1px solid ${s.border}`;
    el.style.color       = s.color;
    el.innerHTML         = html;
}

function fillRtsp(url) {
    const field = document.getElementById('ip-cam-rtsp');
    if (field) { field.value = url; field.focus(); }
}

// ──────────────────────────────────────────────
//  AUTO-VERIFICAÇÃO AO ABRIR A ABA
// ──────────────────────────────────────────────
// Escuta mudanças de aba e re-verifica ao entrar na aba Câmeras
const _origSwitchTab = window.switchTab;
window.switchTab = function(tabId) {
    _origSwitchTab && _origSwitchTab(tabId);
    if (tabId === 'cameras') {
        checkServerStatus();
        refreshHLSViewers();
    }
};

// Polling a cada 10s para atualizar status quando a aba estiver ativa
setInterval(() => {
    const bar = document.getElementById('server-status-bar');
    if (bar && bar.closest('.tab-content.active')) {
        refreshIPCameraList();
    }
}, 10000);
