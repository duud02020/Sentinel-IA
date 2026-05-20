// Global State
const state = {
    activeTab: 'dashboard',
    variables: {
        weather: 'sunny', // sunny, rainy, storm
        event: 'none',    // none, festive, protest
        economy: 'normal' // normal (standard flow), inflation (20% drop in pedestrian flow)
    },
    systemMetrics: {
        precision: 94.2,
        simulationsRate: 10000,
        coherence: 96.8,
        totalReports: 1489,
        anomaliesCount: 3
    },
    nlpReports: [
        {
            id: 1,
            author: "Morador_Centro",
            reliability: 92,
            text: "Há um grupo de pessoas observando a entrada do banco comercial, parece que estão forçando a porta dos fundos ou rondando há uns 15 minutos.",
            urgency: "alta",
            analysis: {
                sentiment: "Crítico / Suspeito",
                keywords: ["banco", "rondando", "porta dos fundos"],
                location: "Banco Comercial - Centro",
                timestamp: "13:42"
            }
        },
        {
            id: 2,
            author: "Sentinela_Vigilancia",
            reliability: 98,
            text: "Lâmpadas apagadas na travessa da Rua Augusta, Zona Sul. Visibilidade reduzida a menos de 5 metros.",
            urgency: "media",
            analysis: {
                sentiment: "Preocupado",
                keywords: ["Lâmpadas apagadas", "Visibilidade reduzida"],
                location: "Rua Augusta - Zona Sul",
                timestamp: "13:30"
            }
        },
        {
            id: 3,
            author: "Anonimo_823",
            reliability: 45,
            text: "Algum barulho estranho vindo do galpão abandonado na Av. Principal. Pode ser só lixo caindo ou animais.",
            urgency: "baixa",
            analysis: {
                sentiment: "Dúbio",
                keywords: ["barulho estranho", "galpão"],
                location: "Av. Principal",
                timestamp: "13:15"
            }
        }
    ],
    anomalies: [
        {
            id: 1,
            title: "Queda Crítica de Fluxo de Pedestres",
            type: "danger",
            text: "Rua Augusta (Zona Sul) registrou queda repentina de 22% no fluxo de pedestres sem ocorrências climáticas atípicas.",
            time: "13:51",
            stat: "Variância Estocástica: σ=4.2"
        },
        {
            id: 2,
            title: "Desvio Comportamental Coletivo",
            type: "warning",
            text: "Padrão de dispersão acelerada detectado próximo à Praça da República após barulho de estouro de escapamento.",
            time: "13:45",
            stat: "Nível de Hesitação: Médio"
        },
        {
            id: 3,
            title: "Incoerência Climático-Predicional",
            type: "warning",
            text: "Correlação histórica indica diminuição de crimes patrimoniais durante tempestades, mas relatórios mostram atividade constante.",
            time: "13:20",
            stat: "Margem de Erro: 1.8%"
        }
    ],
    brainRiskMap: [], // 8x8 grid of risk values
    monteCarlo: {
        isRunning: false,
        progress: 0,
        probB: 0,
        probC: 0,
        incidentPoint: { x: 120, y: 220 }, // Node location
        routes: [],
        escapeCount: 0
    },
    humanSymbiosis: {
        weights: {
            "Clima": [0.35, 0.15, 0.45],
            "Iluminação": [0.65, 0.50, 0.20],
            "Relatos": [0.85, 0.70, 0.90],
            "Fluxo": [0.40, 0.80, 0.35]
        },
        feedbackHistory: []
    }
};

// Canvas references
let brainCanvas, brainCtx;
let quickCanvas, quickCtx;
let twinCanvas, twinCtx;
let cam1Canvas, cam1Ctx;
let cam2Canvas, cam2Ctx;
let networkCanvas, networkCtx;

// Active variables text dictionary for briefing
const briefings = {
    default: "Equipe, hoje o risco na <span class='briefing-highlight'>Zona Sul</span> subiu devido à baixa iluminação reportada na Rua Augusta. Sugiro patrulha preventiva reforçada entre 18h e 20h. O fluxo de pedestres na região comercial está normal, mas requer monitoramento estocástico.",
    rainy: "Briefing Tático: <span class='briefing-highlight'>Chuva Leve</span> detectada. O modelo preditivo indica maior chance de furtos em pontos de ônibus devido ao agrupamento de pessoas. Redobrem atenção nas avenidas centrais. O fluxo social reduziu levemente nas praças.",
    storm: "ALERTA TÁTICO: <span class='briefing-highlight'>Tempestade severa</span> em andamento. O tráfego urbano está saturado. O Sentinel prevê risco de incidentes secundários. Foco em rotas de escape do metrô e travessas escuras. Câmeras ativaram filtro infravermelho.",
    festive: "Briefing Tático: <span class='briefing-highlight'>Evento na Praça Principal</span>. Alta densidade populacional. Risco de furtos e pequenas ocorrências subiu 45%. A Sentinel sugere posicionamento tático nos pontos de acesso norte e leste.",
    protest: "ALERTA CRÍTICO: <span class='briefing-highlight'>Manifestação reportada</span>. O fluxo de pedestres está altamente errático. Desvio comportamental coletivo de nível 8 detectado. Mantenham o gêmeo digital atualizado com rotas alternativas de escoamento.",
    inflation: "Briefing de Anomalia: <span class='briefing-highlight'>Queda Incomum de Fluxo (-20%)</span>. Ruas vazias sem justificativa climática. O Sentinel detecta isso como indicativo de insegurança subjetiva/percebida. Intensificar rondas silenciosas na área residencial da Zona Sul."
};

// Initialize Application
window.addEventListener('DOMContentLoaded', () => {
    initClock();
    initTabNavigation();
    initSelectors();
    initCanvases();
    generateBrainMap();
    renderNLPReports();
    renderAnomalies();
    updateBriefingText();
    
    // Animation Loops
    requestAnimationFrame(mainLoop);
    
    // Auto-update dashboard metrics slowly to feel alive
    setInterval(slowMetricUpdater, 8000);
});

// 1. CLOCK WIDGET
function initClock() {
    const timeDisplay = document.getElementById('current-time');
    const updateTime = () => {
        const now = new Date();
        // Force the date format required or standard formatted
        const formatted = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
        timeDisplay.textContent = formatted;
    };
    updateTime();
    setInterval(updateTime, 1000);
}

// 2. TAB SWITCHER
function initTabNavigation() {
    const items = document.querySelectorAll('.nav-item');
    items.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
}

function switchTab(tabId) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(el => {
        if(el.getAttribute('data-tab') === tabId) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });

    // Update active content
    document.querySelectorAll('.tab-content').forEach(el => {
        if(el.id === `tab-${tabId}`) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });

    state.activeTab = tabId;
    
    // Specific tab activations
    if (tabId === 'cerebro') {
        resizeCanvas('brain-map-canvas');
    } else if (tabId === 'twin') {
        resizeCanvas('twin-canvas');
        resizeCanvas('cam-1-canvas');
        resizeCanvas('cam-2-canvas');
    } else if (tabId === 'simbiose') {
        resizeCanvas('network-canvas');
    } else if (tabId === 'dashboard') {
        resizeCanvas('quick-map-canvas');
    }
}

// 3. CANVAS SETUP
function initCanvases() {
    brainCanvas = document.getElementById('brain-map-canvas');
    brainCtx = brainCanvas.getContext('2d');
    
    quickCanvas = document.getElementById('quick-map-canvas');
    quickCtx = quickCanvas.getContext('2d');
    
    twinCanvas = document.getElementById('twin-canvas');
    twinCtx = twinCanvas.getContext('2d');
    
    cam1Canvas = document.getElementById('cam-1-canvas');
    cam1Ctx = cam1Canvas.getContext('2d');
    
    cam2Canvas = document.getElementById('cam-2-canvas');
    cam2Ctx = cam2Canvas.getContext('2d');
    
    networkCanvas = document.getElementById('network-canvas');
    networkCtx = networkCanvas.getContext('2d');
    
    // Make sure they have initial width and height
    resizeAllCanvases();
    window.addEventListener('resize', resizeAllCanvases);
    
    // Brain Map Interactions
    brainCanvas.addEventListener('mousemove', handleBrainMapHover);
    brainCanvas.addEventListener('click', handleBrainMapClick);
}

function resizeCanvas(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight || 300;
}

function resizeAllCanvases() {
    resizeCanvas('brain-map-canvas');
    resizeCanvas('quick-map-canvas');
    resizeCanvas('twin-canvas');
    resizeCanvas('cam-1-canvas');
    resizeCanvas('cam-2-canvas');
    resizeCanvas('network-canvas');
}

// 4. SELECTORS (Brain correlation variables)
function initSelectors() {
    const setSelectorEvents = (containerId, stateKey) => {
        const container = document.getElementById(containerId);
        const buttons = container.querySelectorAll('.selector-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.variables[stateKey] = btn.getAttribute('data-value');
                
                // Recalculate everything
                generateBrainMap();
                updateBriefingText();
                triggerDynamicAnomaly();
            });
        });
    };
    
    setSelectorEvents('weather-selectors', 'weather');
    setSelectorEvents('event-selectors', 'event');
    setSelectorEvents('economy-selectors', 'economy');
}

// 5. STOCHASTIC BRAIN GRID GENERATION
function generateBrainMap() {
    state.brainRiskMap = [];
    const size = 8;
    
    // Variable modifiers
    let climateMod = 0;
    if(state.variables.weather === 'rainy') climateMod = 12;
    else if(state.variables.weather === 'storm') climateMod = 28;
    
    let eventMod = 0;
    if(state.variables.event === 'festive') eventMod = 35;
    else if(state.variables.event === 'protest') eventMod = 45;
    
    let economyMod = 0;
    if(state.variables.economy === 'inflation') economyMod = 20;

    for (let r = 0; r < size; r++) {
        state.brainRiskMap[r] = [];
        for (let c = 0; c < size; c++) {
            // Base pattern simulating city streets vs empty spots
            let base = ((r * c + r * 4 + c * 3) % 45) + 10;
            
            // Add specific hot zones
            if (r === 4 && c === 4) base += 30; // Center Plaza
            if (r === 2 && c === 6) base += 25; // Augusta corner
            
            // Apply modifiers
            let finalVal = base + climateMod + eventMod + economyMod;
            
            // If protest, shift risk toward top-left (e.g. government district)
            if (state.variables.event === 'protest' && r < 3 && c < 3) {
                finalVal += 20;
            }
            
            // Keep bounds
            finalVal = Math.min(Math.max(Math.round(finalVal), 5), 98);
            
            state.brainRiskMap[r][c] = finalVal;
        }
    }
}

// Update text breakdown of correlations
function updateBriefingText() {
    const textEl = document.getElementById('correlation-analysis-text');
    const briefingEl = document.getElementById('cognitive-briefing-text');
    
    let w = state.variables.weather;
    let e = state.variables.event;
    let ec = state.variables.economy;
    
    let analysis = "";
    let brief = "";
    
    if (w === 'sunny' && e === 'none' && ec === 'normal') {
        analysis = "O clima está estável e o fluxo de pessoas na região comercial está em conformidade. O Sentinel trabalha com risco basal de 12%. As variáveis econômicas não indicam estresse na malha.";
        brief = briefings.default;
    } else {
        analysis = "SENTINEL DETECTOU CORRELAÇÕES AUMENTADAS: ";
        
        if (w === 'storm') {
            analysis += "Tempestades severas diminuem crimes nas ruas (-30% ao ar livre), mas criam gargalos em hubs subterrâneos de transporte (Metrô: +45% risco estocástico). ";
            brief = briefings.storm;
        } else if (w === 'rainy') {
            analysis += "Chuva leve aumenta roubos de pertences e aparelhos móveis próximos a paradas de ônibus em 15% devido à distração e ao agrupamento de pedestres. ";
            brief = briefings.rainy;
        }
        
        if (e === 'festive') {
            analysis += "O evento festivo na Praça central atrai grandes massas, concentrando o risco de furto oportunista na coordenada (4,4). ";
            brief = briefings.festive;
        } else if (e === 'protest') {
            analysis += "A manifestação perturba o fluxo social regular. Detectados agrupamentos anômalos nas adjacências do polo administrativo (2,2). ";
            brief = briefings.protest;
        }
        
        if (ec === 'inflation') {
            analysis += "Alerta estocástico: A queda de 20% no fluxo de pedestres remove a vigilância social natural das vias residenciais, elevando a probabilidade de intrusões em 22%. ";
            if (!brief) brief = briefings.inflation;
        }
    }
    
    textEl.innerHTML = analysis;
    briefingEl.innerHTML = brief;
}

// Dynamically trigger anomalies on variable shift
function triggerDynamicAnomaly() {
    if (state.variables.economy === 'inflation') {
        // Add low flow anomaly
        const exists = state.anomalies.some(a => a.title.includes("Fluxo de Pedestres"));
        if (!exists) {
            state.anomalies.unshift({
                id: Date.now(),
                title: "Queda Crítica de Fluxo de Pedestres",
                type: "danger",
                text: "Rua Augusta (Zona Sul) registrou queda repentina de 22% no fluxo de pedestres sem ocorrências climáticas atípicas.",
                time: getShortTime(),
                stat: "Variância Estocástica: σ=4.2"
            });
            renderAnomalies();
        }
    }
    
    if (state.variables.event === 'protest') {
        const exists = state.anomalies.some(a => a.title.includes("Comportamental Coletivo"));
        if (!exists) {
            state.anomalies.unshift({
                id: Date.now(),
                title: "Desvio Comportamental Coletivo",
                type: "danger",
                text: "Movimento errático em massa detectado nas vias de acesso à praça central. Vetores de dispersão atípicos.",
                time: getShortTime(),
                stat: "Grau de Dispersão: 8.4"
            });
            renderAnomalies();
        }
    }
}

// 6. MAP HOVER & CLICKS (Brain Canvas)
let hoveredCell = null;
function handleBrainMapHover(e) {
    const canvas = brainCanvas;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const size = 8;
    const cellW = canvas.width / size;
    const cellH = canvas.height / size;
    
    const c = Math.floor(x / cellW);
    const r = Math.floor(y / cellH);
    
    if (r >= 0 && r < size && c >= 0 && c < size) {
        hoveredCell = { r, c };
    } else {
        hoveredCell = null;
    }
}

function handleBrainMapClick(e) {
    if (!hoveredCell) return;
    const { r, c } = hoveredCell;
    
    // Inject a manual anomaly/incident
    state.brainRiskMap[r][c] = 95; // Risk spiked
    
    // Add anomaly report
    state.anomalies.unshift({
        id: Date.now(),
        title: `Alerta no Sensor (${r},${c})`,
        type: "danger",
        text: `Spike de risco manual inserido no quadrante urbano da coordenada de grade [${r}, ${c}]. Análise preditiva recalculando rotas.`,
        time: getShortTime(),
        stat: "Risco Spiked: 95%"
    });
    
    renderAnomalies();
    
    // Trigger effect in twin too if available
    state.monteCarlo.incidentPoint = {
        x: 50 + c * 50,
        y: 50 + r * 45
    };
}

// 7. NLP REPORT PIPELINE
function renderNLPReports() {
    const quickFeed = document.getElementById('quick-nlp-feed');
    const fullFeed = document.getElementById('full-nlp-feed');
    
    const generateHtml = (rep) => {
        const uClass = `urgency-${rep.urgency}`;
        const repClass = rep.reliability >= 80 ? 'rep-high' : (rep.reliability >= 50 ? 'rep-med' : 'rep-low');
        
        return `
            <div class="nlp-card">
                <div class="nlp-card-header">
                    <div class="source-info">
                        <div class="source-avatar">${rep.author.charAt(0)}</div>
                        <div>
                            <div style="font-weight: 600;">${rep.author}</div>
                            <div style="font-size: 0.65rem; color: var(--text-dark)">Confiança Fonte: <span class="source-rep ${repClass}">${rep.reliability}%</span></div>
                        </div>
                    </div>
                    <span class="urgency-badge ${uClass}">${rep.urgency}</span>
                </div>
                <div class="nlp-content">${rep.text}</div>
                <div class="nlp-analysis-box">
                    <div><span style="color: var(--text-muted)">NLP Sentimento:</span> <span class="nlp-term">${rep.analysis.sentiment}</span></div>
                    <div><span style="color: var(--text-muted)">Entidades:</span> <span class="nlp-entities">${rep.analysis.keywords.join(', ')}</span></div>
                    <div style="display: flex; justify-content: space-between; margin-top: 0.25rem; font-size: 0.7rem; color: var(--text-dark);">
                        <span>Localização: ${rep.analysis.location}</span>
                        <span>${rep.analysis.timestamp}</span>
                    </div>
                </div>
            </div>
        `;
    };
    
    // Render to dashboard (quick view - first 2 reports)
    if (quickFeed) {
        quickFeed.innerHTML = state.nlpReports.slice(0, 2).map(generateHtml).join('');
    }
    
    // Render to full tab view
    if (fullFeed) {
        fullFeed.innerHTML = state.nlpReports.map(generateHtml).join('');
    }
    
    // Update dashboard counter
    const counter = document.getElementById('dash-nlp-count');
    if (counter) counter.textContent = state.nlpReports.length + 1486; // add base dummy count
}

function updateSliderVal(val) {
    document.getElementById('reliability-val').textContent = val + '%';
}

function handleNewReportSubmit(event) {
    event.preventDefault();
    
    const author = document.getElementById('report-author').value;
    const reliability = parseInt(document.getElementById('report-reliability').value);
    const text = document.getElementById('report-text').value;
    
    // MOCK NLP PIPELINE
    let sentiment = "Neutro";
    let urgency = "baixa";
    let keywords = [];
    
    const textLower = text.toLowerCase();
    
    if (textLower.includes('assalto') || textLower.includes('arma') || textLower.includes('roubo') || textLower.includes('faca') || textLower.includes('invadindo') || textLower.includes('arrastão')) {
        urgency = "alta";
        sentiment = "Crítico / Urgente";
        keywords.push("Ameaça Física");
    } else if (textLower.includes('suspeito') || textLower.includes('rondando') || textLower.includes('escuro') || textLower.includes('quebrada') || textLower.includes('estranho') || textLower.includes('banco')) {
        urgency = "media";
        sentiment = "Alerta Comportamental";
        keywords.push("Prevenção / Suspeita");
    } else {
        urgency = "baixa";
        sentiment = "Informativo";
        keywords.push("Infraestrutura");
    }
    
    // Extract location mock
    let location = "Não identificada";
    if (textLower.includes('augusta') || textLower.includes('zona sul')) {
        location = "Rua Augusta - Zona Sul";
    } else if (textLower.includes('centro') || textLower.includes('praça') || textLower.includes('república')) {
        location = "Praça da República - Centro";
    } else if (textLower.includes('principal') || textLower.includes('avenida')) {
        location = "Av. Principal";
    } else {
        location = "Coordenadas Dinâmicas GPS";
    }
    
    // Extract keywords
    const matches = text.match(/\b(banco|poste|farmácia|rua|loja|escuro|barulho|grupo|carro|moto)\b/gi);
    if (matches) {
        keywords = [...keywords, ...matches.map(m => m.toLowerCase())];
    }
    keywords = [...new Set(keywords)]; // remove duplicates
    
    const newReport = {
        id: Date.now(),
        author: author,
        reliability: reliability,
        text: text,
        urgency: urgency,
        analysis: {
            sentiment: sentiment,
            keywords: keywords,
            location: location,
            timestamp: getShortTime()
        }
    };
    
    // Push report
    state.nlpReports.unshift(newReport);
    
    // Render and reset form
    renderNLPReports();
    document.getElementById('report-input-form').reset();
    document.getElementById('reliability-val').textContent = '85%';
    
    // Affect risk grid directly where location matches
    if (location.includes("Zona Sul")) {
        state.brainRiskMap[6][2] = Math.min(state.brainRiskMap[6][2] + 40, 99);
    } else if (location.includes("Centro")) {
        state.brainRiskMap[4][4] = Math.min(state.brainRiskMap[4][4] + 35, 99);
    } else {
        // Random spot
        const randR = Math.floor(Math.random() * 8);
        const randC = Math.floor(Math.random() * 8);
        state.brainRiskMap[randR][randC] = Math.min(state.brainRiskMap[randR][randC] + 30, 99);
    }
    
    // Trigger anomaly
    state.anomalies.unshift({
        id: Date.now(),
        title: `Relato Triado: Urgência ${urgency.toUpperCase()}`,
        type: urgency === 'alta' ? 'danger' : 'warning',
        text: `NLP analisou relato de ${author} (${reliability}% conf.). Extraído risco na área: ${location}.`,
        time: getShortTime(),
        stat: `Entidades: ${keywords.join(', ')}`
    });
    renderAnomalies();
    
    // Highlight dashboard count
    state.systemMetrics.totalReports++;
}

function clearReportLogs() {
    state.nlpReports = [];
    renderNLPReports();
}

// 8. ANOMALIES RENDERING
function renderAnomalies() {
    const feed = document.getElementById('brain-anomaly-feed');
    if (!feed) return;
    
    feed.innerHTML = state.anomalies.map(anom => {
        const warningClass = anom.type === 'warning' ? 'warning' : '';
        return `
            <div class="anomaly-card ${warningClass}">
                <div class="anomaly-header">
                    <span class="anomaly-title">${anom.title}</span>
                    <span class="anomaly-time">${anom.time}</span>
                </div>
                <div class="anomaly-body">${anom.text}</div>
                <div class="anomaly-stat">
                    <span>Métrica: ${anom.stat}</span>
                    <span>Status: Em Investigação</span>
                </div>
            </div>
        `;
    }).join('');
    
    const countEl = document.getElementById('dash-anomaly-count');
    if (countEl) countEl.textContent = state.anomalies.length;
}

// 9. MONTE CARLO SIMULATOR & DIGITAL TWIN
// Let's model a graph city grid
const twinNodes = {
    A: { x: 80, y: 220, label: "Incidente A" },
    B: { x: 300, y: 120, label: "Bloqueio B" },
    C: { x: 320, y: 320, label: "Bloqueio C" },
    D: { x: 180, y: 150 },
    E: { x: 220, y: 280 },
    F: { x: 420, y: 220, label: "Escape Central" },
    G: { x: 480, y: 90, label: "Fuga Norte" },
    H: { x: 500, y: 350, label: "Fuga Sul" }
};

const twinEdges = [
    ['A', 'D'], ['A', 'E'],
    ['D', 'B'], ['D', 'E'],
    ['E', 'C'], ['E', 'D'],
    ['B', 'F'], ['C', 'F'],
    ['B', 'G'], ['F', 'G'],
    ['C', 'H'], ['F', 'H']
];

function triggerIncident() {
    // Generate incident at a random node, or pick Node A
    state.monteCarlo.incidentPoint = { x: 80, y: 220 };
    
    state.anomalies.unshift({
        id: Date.now(),
        title: "Incidente Tático Ativado",
        type: "danger",
        text: "Gêmeo digital disparou alerta de fuga coordenada a partir do Ponto A. Rodar simulações de Monte Carlo.",
        time: getShortTime(),
        stat: "Nós de interceptação: B e C"
    });
    renderAnomalies();
    
    // Automatically start simulation
    startMonteCarloSimulation();
}

function startMonteCarloSimulation() {
    if (state.monteCarlo.isRunning) return;
    
    state.monteCarlo.isRunning = true;
    state.monteCarlo.progress = 0;
    state.monteCarlo.routes = [];
    state.monteCarlo.escapeCount = 0;
    
    const fillEl = document.getElementById('monte-carlo-fill');
    const statusEl = document.getElementById('monte-carlo-status');
    const btnEl = document.getElementById('btn-montecarlo');
    
    btnEl.disabled = true;
    btnEl.textContent = "Simulando...";
    statusEl.textContent = "Simulando caminhos...";
    statusEl.style.color = "var(--color-warning)";
    
    // Reset probabilities visual
    document.getElementById('prob-ptb').textContent = '--%';
    document.getElementById('prob-ptc').textContent = '--%';
    
    // Monte Carlo loops over multiple frames
    const totalSims = 10000;
    const simsPerFrame = 500;
    
    function runSimChunk() {
        if (state.monteCarlo.progress >= totalSims) {
            finishMonteCarlo();
            return;
        }
        
        // Generate simulated escape paths
        for (let i = 0; i < simsPerFrame; i++) {
            const path = simulateSingleEscapePath();
            state.monteCarlo.routes.push(path);
            state.monteCarlo.progress++;
        }
        
        // Calculate intermediate probabilities
        const currentProgress = state.monteCarlo.progress;
        const fillPercent = (currentProgress / totalSims) * 100;
        fillEl.style.width = `${fillPercent}%`;
        
        // Update counts
        let hitB = 0;
        let hitC = 0;
        state.monteCarlo.routes.forEach(p => {
            if (p.hitNode === 'B') hitB++;
            if (p.hitNode === 'C') hitC++;
        });
        
        const pb = Math.round((hitB / currentProgress) * 100);
        const pc = Math.round((hitC / currentProgress) * 100);
        
        document.getElementById('prob-ptb').textContent = `${pb}%`;
        document.getElementById('prob-ptc').textContent = `${pc}%`;
        
        requestAnimationFrame(runSimChunk);
    }
    
    requestAnimationFrame(runSimChunk);
}

function simulateSingleEscapePath() {
    // Escape starts at A and hops to nodes until it reaches G, H or F (exit nodes)
    let currentNode = 'A';
    const path = [currentNode];
    let hitNode = null;
    
    let iterations = 0;
    while (currentNode !== 'G' && currentNode !== 'H' && currentNode !== 'F' && iterations < 10) {
        iterations++;
        // Find edges connected to current
        const neighbors = [];
        twinEdges.forEach(edge => {
            if (edge[0] === currentNode) neighbors.push(edge[1]);
            else if (edge[1] === currentNode) neighbors.push(edge[0]);
        });
        
        // Pick a neighbor with weights favoring escaping (going right)
        // Nodes positions: A(80) -> D(180) -> B(300) -> F(420) -> G(480)
        // Make random choice biased toward larger X
        let nextNode = neighbors[Math.floor(Math.random() * neighbors.length)];
        
        // Dynamic barrier: if police are blockading, decrease probability of taking that path
        // For demonstration, let's say police at B blocked 85% of paths passing B, at C blocked 60%.
        if (nextNode === 'B' && Math.random() < 0.85) {
            hitNode = 'B';
            path.push('B');
            break; // Intercepted at B!
        }
        
        if (nextNode === 'C' && Math.random() < 0.60) {
            hitNode = 'C';
            path.push('C');
            break; // Intercepted at C!
        }
        
        currentNode = nextNode;
        path.push(currentNode);
    }
    
    if (!hitNode) {
        // Escaped successfully
        hitNode = 'ESCAPED';
    }
    
    return {
        path: path,
        hitNode: hitNode
    };
}

function finishMonteCarlo() {
    state.monteCarlo.isRunning = false;
    
    const statusEl = document.getElementById('monte-carlo-status');
    const btnEl = document.getElementById('btn-montecarlo');
    
    btnEl.disabled = false;
    btnEl.textContent = "Executar Monte Carlo";
    
    statusEl.textContent = "Concluído";
    statusEl.style.color = "var(--color-success)";
    
    // Calculate final results
    let hitB = 0;
    let hitC = 0;
    let escaped = 0;
    
    state.monteCarlo.routes.forEach(p => {
        if (p.hitNode === 'B') hitB++;
        else if (p.hitNode === 'C') hitC++;
        else escaped++;
    });
    
    const pb = Math.round((hitB / 10000) * 100);
    const pc = Math.round((hitC / 10000) * 100);
    
    document.getElementById('prob-ptb').textContent = `${pb}%`;
    document.getElementById('prob-ptc').textContent = `${pc}%`;
    
    // Update recommendation text
    const probBestEl = document.getElementById('prob-best');
    if (pb > pc) {
        probBestEl.textContent = `Ponto B (${pb}% Eficácia)`;
        probBestEl.className = "prob-val success";
    } else {
        probBestEl.textContent = `Ponto C (${pc}% Eficácia)`;
        probBestEl.className = "prob-val success";
    }
    
    // Add logs
    state.anomalies.unshift({
        id: Date.now(),
        title: "Monte Carlo Concluído",
        type: "warning",
        text: `10k simulações rodadas. Probabilidade de interceptação em B: ${pb}%, em C: ${pc}%. Recomendado reforçar Ponto ${pb > pc ? 'B' : 'C'}.`,
        time: getShortTime(),
        stat: `Taxa de Fuga: ${Math.round((escaped/10000)*100)}%`
    });
    renderAnomalies();
}

// 10. HUMAN FEEDBACK LOOP & BRAIN SYMBIOSE CALIBRATION
function submitHumanFeedback(type, element) {
    // Toggle active design class
    document.querySelectorAll('.feedback-card').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    
    const weightsStatusEl = document.getElementById('weights-status');
    weightsStatusEl.textContent = "Calibrando...";
    weightsStatusEl.style.color = "var(--color-warning)";
    
    // Adjust weights based on input
    // weights schema: InputVariable: [WeightRiscoGeral, WeightFurto, WeightAssalto]
    setTimeout(() => {
        if (type === 'confirm') {
            // Relatos input gets heavier weighting, flow anomaly increases
            state.humanSymbiosis.weights["Relatos"][0] = Math.min(state.humanSymbiosis.weights["Relatos"][0] + 0.08, 0.99);
            state.humanSymbiosis.weights["Fluxo"][1] = Math.min(state.humanSymbiosis.weights["Fluxo"][1] + 0.06, 0.99);
        } else if (type === 'deny') {
            // Relatos weights drop since it was a false alert
            state.humanSymbiosis.weights["Relatos"][0] = Math.max(state.humanSymbiosis.weights["Relatos"][0] - 0.12, 0.20);
        } else if (type === 'low_light') {
            // Light (Iluminação) node weight rises drastically
            state.humanSymbiosis.weights["Iluminação"][0] = Math.min(state.humanSymbiosis.weights["Iluminação"][0] + 0.15, 0.99);
            state.humanSymbiosis.weights["Iluminação"][2] = Math.min(state.humanSymbiosis.weights["Iluminação"][2] + 0.12, 0.99);
        }
        
        weightsStatusEl.textContent = "Readequada";
        weightsStatusEl.style.color = "var(--color-success)";
        
        // Trigger flash in network weights
        triggerNetworkCalibrationAnimation();
        
        // Add log
        state.anomalies.unshift({
            id: Date.now(),
            title: "Pesos Calibrados",
            type: "warning",
            text: `Feedback de campo recebido (${type.toUpperCase()}). Conexões neurais de correlação readequadas em tempo real.`,
            time: getShortTime(),
            stat: `Confiança Modelo: ${state.systemMetrics.precision}%`
        });
        renderAnomalies();
        
    }, 800);
}

// Spark calibration lines glow
let calibrationPulseTime = 0;
function triggerNetworkCalibrationAnimation() {
    calibrationPulseTime = 30; // 30 frames of bright pulse
}

// 11. MAIN RENDERING LOOP (Runs every frame to draw canvases)
function mainLoop(timestamp) {
    if (state.activeTab === 'dashboard') {
        drawRiskMap(quickCanvas, quickCtx);
    } else if (state.activeTab === 'cerebro') {
        drawRiskMap(brainCanvas, brainCtx);
    } else if (state.activeTab === 'twin') {
        drawDigitalTwin();
        drawCVCamera(cam1Canvas, cam1Ctx, 'South Zone', 0.002);
        drawCVCamera(cam2Canvas, cam2Ctx, 'Central Hub', 0.005, true); // contains anomalous activity
    } else if (state.activeTab === 'simbiose') {
        drawNeuralNetwork();
    }
    
    requestAnimationFrame(mainLoop);
}

// Helper to draw risk maps
function drawRiskMap(canvas, ctx) {
    if (!canvas || !ctx) return;
    
    const size = 8;
    const cellW = canvas.width / size;
    const cellH = canvas.height / size;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw cells
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const risk = state.brainRiskMap[r][c] || 10;
            
            // Choose color based on risk
            let color = 'rgba(0, 255, 136, 0.15)'; // Low
            if (risk > 75) {
                color = `rgba(255, 56, 96, ${0.2 + (risk-70)/60})`; // High
            } else if (risk > 35) {
                color = `rgba(255, 184, 0, ${0.15 + (risk-30)/100})`; // Medium
            }
            
            ctx.fillStyle = color;
            ctx.fillRect(c * cellW, r * cellH, cellW - 1, cellH - 1);
            
            // Draw grid line borders
            ctx.strokeStyle = 'rgba(255,255,255,0.02)';
            ctx.lineWidth = 1;
            ctx.strokeRect(c * cellW, r * cellH, cellW, cellH);
            
            // Text value inside cell (only if hovered or high resolution)
            if (canvas.width > 350) {
                ctx.fillStyle = risk > 75 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)';
                ctx.font = '9px JetBrains Mono';
                ctx.fillText(`${risk}%`, c * cellW + 6, r * cellH + 16);
            }
        }
    }
    
    // Hover styling
    if (hoveredCell && canvas === brainCanvas) {
        const { r, c } = hoveredCell;
        ctx.strokeStyle = 'var(--color-primary)';
        ctx.lineWidth = 2;
        ctx.strokeRect(c * cellW, r * cellH, cellW, cellH);
        
        ctx.fillStyle = 'rgba(0, 210, 255, 0.1)';
        ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
    }
    
    // Draw visual scanning overlay sweep bar
    const sweepY = (Math.sin(Date.now() / 800) * 0.5 + 0.5) * canvas.height;
    ctx.strokeStyle = 'rgba(0, 210, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, sweepY);
    ctx.lineTo(canvas.width, sweepY);
    ctx.stroke();
    
    // Scan line gradient glow
    const grad = ctx.createLinearGradient(0, sweepY - 30, 0, sweepY + 30);
    grad.addColorStop(0, 'rgba(0, 210, 255, 0)');
    grad.addColorStop(0.5, 'rgba(0, 210, 255, 0.06)');
    grad.addColorStop(1, 'rgba(0, 210, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, sweepY - 30, canvas.width, 60);
}

// Helper to draw the isometric-ish 3D Digital Twin Map
function drawDigitalTwin() {
    const canvas = twinCanvas;
    const ctx = twinCtx;
    if (!canvas || !ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gridSpacing = 40;
    for (let x = 0; x < canvas.width; x += gridSpacing) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSpacing) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    
    // Draw building blocks (procedural visual polygons)
    const blocks = [
        { x: 130, y: 50, w: 90, h: 60 },
        { x: 50, y: 120, w: 70, h: 70 },
        { x: 230, y: 150, w: 60, h: 100 },
        { x: 130, y: 280, w: 80, h: 80 },
        { x: 350, y: 50, w: 100, h: 50 },
        { x: 380, y: 250, w: 70, h: 80 }
    ];
    
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    blocks.forEach(b => {
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        
        // Draw 3D extrusion top lines (flat pseudo-3D representation)
        ctx.strokeStyle = 'rgba(0, 210, 255, 0.08)';
        ctx.strokeRect(b.x - 3, b.y - 3, b.w, b.h);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - 3, b.y - 3);
        ctx.moveTo(b.x + b.w, b.y); ctx.lineTo(b.x + b.w - 3, b.y - 3);
        ctx.moveTo(b.x, b.y + b.h); ctx.lineTo(b.x - 3, b.y + b.h - 3);
        ctx.moveTo(b.x + b.w, b.y + b.h); ctx.lineTo(b.x + b.w - 3, b.y + b.h - 3);
        ctx.stroke();
    });
    
    // Draw Graph edges (Streets connection lines)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    twinEdges.forEach(edge => {
        const n1 = twinNodes[edge[0]];
        const n2 = twinNodes[edge[1]];
        if(n1 && n2) {
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
        }
    });
    
    // Draw Simulated Monte Carlo Paths if running or completed
    if (state.monteCarlo.routes.length > 0) {
        ctx.lineWidth = 1.5;
        // Limit paths drawn to keep performance high
        const drawLimit = Math.min(state.monteCarlo.routes.length, 180);
        
        for (let i = 0; i < drawLimit; i++) {
            const route = state.monteCarlo.routes[i];
            
            if (route.hitNode === 'B') ctx.strokeStyle = 'rgba(255, 56, 96, 0.18)';
            else if (route.hitNode === 'C') ctx.strokeStyle = 'rgba(255, 184, 0, 0.18)';
            else ctx.strokeStyle = 'rgba(0, 255, 136, 0.18)';
            
            ctx.beginPath();
            const startNode = twinNodes[route.path[0]];
            ctx.moveTo(startNode.x, startNode.y);
            
            for (let j = 1; j < route.path.length; j++) {
                const nodeVal = twinNodes[route.path[j]];
                if (nodeVal) {
                    ctx.lineTo(nodeVal.x, nodeVal.y);
                }
            }
            ctx.stroke();
        }
    }
    
    // Draw Incident point A glow
    const pA = twinNodes.A;
    const pulseRadius = 10 + Math.sin(Date.now() / 150) * 4;
    ctx.fillStyle = 'rgba(255, 56, 96, 0.2)';
    ctx.beginPath();
    ctx.arc(pA.x, pA.y, pulseRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'var(--color-danger)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Draw Blockade node labels B and C
    ['B', 'C'].forEach(lbl => {
        const node = twinNodes[lbl];
        ctx.fillStyle = lbl === 'B' ? 'var(--color-danger)' : 'var(--color-warning)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px var(--font-sans)';
        ctx.fillText(lbl, node.x - 3, node.y - 10);
    });
    
    // Draw exit nodes and others
    for (const key in twinNodes) {
        if(key !== 'A' && key !== 'B' && key !== 'C') {
            const node = twinNodes[key];
            ctx.fillStyle = 'rgba(0, 210, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            if (node.label) {
                ctx.fillStyle = 'var(--text-muted)';
                ctx.font = '8px var(--font-mono)';
                ctx.fillText(node.label, node.x + 8, node.y + 3);
            }
        }
    }
}

// Non-invasive CV Cameras Simulation Renderer
const cvPedestriansCam1 = [
    { x: 30, y: 150, vx: 0.2, vy: 0.1, radius: 8 },
    { x: 180, y: 80, vx: -0.15, vy: 0.25, radius: 9 },
    { x: 120, y: 180, vx: 0.3, vy: -0.05, radius: 7 }
];

const cvPedestriansCam2 = [
    { x: 140, y: 100, vx: 0, vy: 0, state: 'hesitate', angle: 0, radius: 9 }, // does circular movement
    { x: 50, y: 60, vx: 0.2, vy: 0.2, radius: 8 }
];

function drawCVCamera(canvas, ctx, label, speedMultiplier, isAnomalous = false) {
    if (!canvas || !ctx) return;
    
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Render scan lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
    ctx.lineWidth = 1;
    for(let y = 0; y < canvas.height; y += 4) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    
    // Update and draw CV vectors
    const pedestrians = isAnomalous ? cvPedestriansCam2 : cvPedestriansCam1;
    
    pedestrians.forEach(p => {
        if(p.state === 'hesitate') {
            // Circular patrol path (hesitation model)
            p.angle += 0.02;
            p.x = 130 + Math.cos(p.angle) * 35;
            p.y = 110 + Math.sin(p.angle) * 15;
        } else {
            p.x += p.vx * 60 * speedMultiplier * 10;
            p.y += p.vy * 60 * speedMultiplier * 10;
            
            // Screen bounce
            if(p.x < 10 || p.x > canvas.width - 10) p.vx *= -1;
            if(p.y < 10 || p.y > canvas.height - 10) p.vy *= -1;
        }
        
        // Draw pixelated non-invasive bounding box
        // We draw vector circles/shapes without faces, representing privacy
        const color = isAnomalous && p.state === 'hesitate' ? 'var(--color-danger)' : 'var(--color-success)';
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        // Bounding box rectangle
        const boxSize = p.radius * 2.8;
        ctx.strokeRect(p.x - boxSize/2, p.y - boxSize, boxSize, boxSize * 1.5);
        
        // Target bracket corners
        ctx.beginPath();
        // Label text
        ctx.fillStyle = color;
        ctx.font = '8px var(--font-mono)';
        const labelText = isAnomalous && p.state === 'hesitate' ? 'SUSP_HESIT' : 'ANON_PED';
        ctx.fillText(labelText, p.x - boxSize/2, p.y - boxSize - 3);
        
        // Draw abstract wireframe vector lines inside to represent skeletal data
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        // Draw head
        ctx.beginPath(); ctx.arc(p.x, p.y - boxSize*0.7, 4, 0, Math.PI*2); ctx.stroke();
        // Body spine
        ctx.beginPath(); ctx.moveTo(p.x, p.y - boxSize*0.7 + 4); ctx.lineTo(p.x, p.y + boxSize*0.2); ctx.stroke();
        // Limbs
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - boxSize*0.3); ctx.lineTo(p.x - 6, p.y - boxSize*0.1);
        ctx.moveTo(p.x, p.y - boxSize*0.3); ctx.lineTo(p.x + 6, p.y - boxSize*0.1);
        ctx.moveTo(p.x, p.y + boxSize*0.2); ctx.lineTo(p.x - 5, p.y + boxSize*0.5);
        ctx.moveTo(p.x, p.y + boxSize*0.2); ctx.lineTo(p.x + 5, p.y + boxSize*0.5);
        ctx.stroke();
    });
    
    // Draw crosshair grid lines
    ctx.strokeStyle = 'rgba(0, 210, 255, 0.05)';
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
}

// 12. NEURAL NETWORK WEIGHT VISUALIZER (Simbiose Humana)
const netNodes = {
    inputs: [
        { y: 50, label: "Clima" },
        { y: 110, label: "Iluminação" },
        { y: 170, label: "Relatos" },
        { y: 230, label: "Fluxo" }
    ],
    hidden: [
        { y: 70 },
        { y: 140 },
        { y: 210 }
    ],
    outputs: [
        { y: 80, label: "Risco Geral" },
        { y: 150, label: "Risco Furto" },
        { y: 220, label: "Risco Assalto" }
    ]
};

function drawNeuralNetwork() {
    const canvas = networkCanvas;
    const ctx = networkCtx;
    if (!canvas || !ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const xIn = 80;
    const xHidden = canvas.width / 2;
    const xOut = canvas.width - 80;
    
    // Decrease calibration pulse timer over frames
    if (calibrationPulseTime > 0) calibrationPulseTime--;
    
    // Draw connection lines with thickness representing weights
    // Input -> Hidden
    netNodes.inputs.forEach((input, iIdx) => {
        netNodes.hidden.forEach((hidden, hIdx) => {
            // Retrieve dynamic weight
            const varName = input.label;
            const wArray = state.humanSymbiosis.weights[varName] || [0.5, 0.5, 0.5];
            const weightVal = wArray[hIdx % wArray.length];
            
            const thickness = Math.max(weightVal * 4.5, 0.5);
            let color = `rgba(0, 210, 255, ${0.1 + weightVal * 0.4})`;
            
            // Pulse connection lines during calibration
            if (calibrationPulseTime > 0) {
                color = `rgba(0, 255, 136, ${0.4 + (calibrationPulseTime/30)*0.6})`;
            }
            
            ctx.strokeStyle = color;
            ctx.lineWidth = thickness;
            ctx.beginPath();
            ctx.moveTo(xIn, input.y);
            ctx.lineTo(xHidden, hidden.y);
            ctx.stroke();
        });
    });
    
    // Hidden -> Output
    netNodes.hidden.forEach((hidden, hIdx) => {
        netNodes.outputs.forEach((output, oIdx) => {
            const weightVal = (hIdx * 0.2 + oIdx * 0.15) % 0.8 + 0.1;
            const thickness = weightVal * 3;
            let color = `rgba(112, 0, 255, ${0.1 + weightVal * 0.4})`;
            
            if (calibrationPulseTime > 0) {
                color = `rgba(0, 255, 136, ${0.4 + (calibrationPulseTime/30)*0.6})`;
            }
            
            ctx.strokeStyle = color;
            ctx.lineWidth = thickness;
            ctx.beginPath();
            ctx.moveTo(xHidden, hidden.y);
            ctx.lineTo(xOut, output.y);
            ctx.stroke();
        });
    });
    
    // Draw Nodes
    const drawNodeGroup = (nodesList, xPos, isLabelLeft = false, hasLabels = true) => {
        nodesList.forEach(node => {
            // Pulse nodes
            let radius = 7;
            if (calibrationPulseTime > 0) {
                radius = 7 + (calibrationPulseTime / 30) * 4;
            }
            
            ctx.fillStyle = calibrationPulseTime > 0 ? '#00ff88' : 'var(--color-primary)';
            ctx.beginPath();
            ctx.arc(xPos, node.y, radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // Text Label
            if (hasLabels && node.label) {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 9px var(--font-sans)';
                const textX = isLabelLeft ? xPos - 68 : xPos + 14;
                ctx.fillText(node.label, textX, node.y + 3);
            }
        });
    };
    
    drawNodeGroup(netNodes.inputs, xIn, true);
    drawNodeGroup(netNodes.hidden, xHidden, false, false);
    drawNodeGroup(netNodes.outputs, xOut, false);
}

// 13. UTILS & SYSTEM SIMULATION SLOW UPDATE
function getShortTime() {
    const now = new Date();
    return now.toTimeString().split(' ')[0].slice(0, 5);
}

function slowMetricUpdater() {
    // Fluctuates accuracy and status weights to make it feel alive
    state.systemMetrics.precision = (93.5 + Math.random() * 1.5).toFixed(1);
    state.systemMetrics.coherence = (95.8 + Math.random() * 2.0).toFixed(1);
    
    // Update sidebar text
    const precEl = document.getElementById('sys-precision');
    const confEl = document.getElementById('sys-confidence');
    if (precEl) precEl.textContent = state.systemMetrics.precision + '%';
    if (confEl) confEl.textContent = state.systemMetrics.coherence + '%';
    
    // Clean old anomalies if list grows too large
    if(state.anomalies.length > 20) {
        state.anomalies.pop();
        renderAnomalies();
    }
}
