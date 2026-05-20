// Global State
const state = {
    activeTab: 'dashboard',
    variables: {
        weather: 'sunny', // sunny, rainy, storm
        event: 'none',    // none, festive, protest
        economy: 'normal' // normal, inflation
    },
    systemMetrics: {
        precision: 94.2,
        simulationsRate: 10000,
        coherence: 96.8,
        totalReports: 1489,
        anomaliesCount: 3
    },
    // Geographic Risk Locations around Av. Paulista, São Paulo
    riskLocations: [
        { name: "MASP (Epicentro Tático)", coords: [-23.5615, -46.6562], baseRisk: 42 },
        { name: "Av. Paulista x Rua Augusta", coords: [-23.5595, -46.6585], baseRisk: 55 },
        { name: "Av. Paulista x Al. Pamplona", coords: [-23.5632, -46.6542], baseRisk: 30 },
        { name: "Rua Augusta x Al. Santos", coords: [-23.5615, -46.6605], baseRisk: 48 },
        { name: "Al. Pamplona x Al. Santos", coords: [-23.5650, -46.6558], baseRisk: 22 },
        { name: "Al. Casa Branca x Al. Santos", coords: [-23.5638, -46.6582], baseRisk: 28 },
        { name: "Av. Paulista x R. Peixoto Gomide", coords: [-23.5608, -46.6571], baseRisk: 35 },
        { name: "Av. Paulista x R. Itapeva", coords: [-23.5623, -46.6552], baseRisk: 26 },
        { name: "Al. Casa Branca x Al. Lorena", coords: [-23.5662, -46.6602], baseRisk: 18 },
        { name: "Al. Pamplona x Al. Lorena", coords: [-23.5672, -46.6575], baseRisk: 15 }
    ],
    nlpReports: [
        {
            id: 1,
            author: "Morador_Paulista",
            reliability: 92,
            text: "Há um grupo de pessoas observando a entrada do MASP, parece que estão rondando há uns 15 minutos e observando as câmeras de segurança.",
            urgency: "alta",
            analysis: {
                sentiment: "Crítico / Suspeito",
                keywords: ["MASP", "rondando", "câmeras"],
                location: "MASP - Centro Tático",
                timestamp: "13:42"
            }
        },
        {
            id: 2,
            author: "Sentinela_Vigilancia",
            reliability: 98,
            text: "Lâmpadas apagadas na travessa da Al. Santos com Casa Branca. Visibilidade reduzida a menos de 5 metros.",
            urgency: "media",
            analysis: {
                sentiment: "Preocupado",
                keywords: ["Lâmpadas apagadas", "Al. Santos"],
                location: "Al. Santos x Casa Branca",
                timestamp: "13:30"
            }
        },
        {
            id: 3,
            author: "Anonimo_823",
            reliability: 45,
            text: "Algum barulho estranho vindo do canteiro de obras perto da Pamplona. Pode ser só vento.",
            urgency: "baixa",
            analysis: {
                sentiment: "Dúbio",
                keywords: ["barulho estranho", "Pampona"],
                location: "Al. Pamplona",
                timestamp: "13:15"
            }
        }
    ],
    anomalies: [
        {
            id: 1,
            title: "Queda Crítica de Fluxo de Pedestres",
            type: "danger",
            text: "Al. Santos registrou queda repentina de 22% no fluxo de pedestres sem ocorrências climáticas atípicas.",
            time: "13:51",
            stat: "Variância Estocástica: σ=4.2"
        },
        {
            id: 2,
            title: "Desvio Comportamental Coletivo",
            type: "warning",
            text: "Padrão de dispersão acelerada detectado próximo à Augusta após barulho de escapamento alto.",
            time: "13:45",
            stat: "Nível de Hesitação: Médio"
        },
        {
            id: 3,
            title: "Incoerência Climático-Predicional",
            type: "warning",
            text: "Correlação histórica indica diminuição de crimes durante tempestades, mas sensores mostram atividade constante.",
            time: "13:20",
            stat: "Margem de Erro: 1.8%"
        }
    ],
    monteCarlo: {
        isRunning: false,
        progress: 0,
        probB: 0,
        probC: 0,
        incidentPoint: [-23.5615, -46.6562], // MASP
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

// Leaflet Map References
let quickMap, brainMap, twinMap;
let quickMapRiskGroup, brainMapRiskGroup, twinMapGroup, twinMapRoutesGroup;
let twinIncidentMarker, twinBlockadeBMarker, twinBlockadeCMarker;

// Canvas references for other components
let cam1Canvas, cam1Ctx;
let cam2Canvas, cam2Ctx;
let networkCanvas, networkCtx;

// Active variables text dictionary for briefing
const briefings = {
    default: "Equipe, hoje o risco na <span class='briefing-highlight'>Al. Santos</span> subiu devido à baixa iluminação reportada na Al. Casa Branca. Sugiro patrulha preventiva reforçada entre 18h e 20h. O fluxo de pedestres na região está normal.",
    rainy: "Briefing Tático: <span class='briefing-highlight'>Chuva Leve</span> detectada. O modelo preditivo indica maior chance de furtos próximos a paradas de ônibus da Paulista devido ao agrupamento de pedestres.",
    storm: "ALERTA TÁTICO: <span class='briefing-highlight'>Tempestade severa</span> em andamento. Tráfego urbano saturado. Foco em saídas de metrô da Av. Paulista. Câmeras ativaram filtros de privacidade infravermelhos.",
    festive: "Briefing Tático: <span class='briefing-highlight'>Concentração no MASP</span>. Alta densidade populacional. Risco de furto oportunista subiu 45%. Sentinel sugere posicionamento nos cruzamentos norte e leste.",
    protest: "ALERTA CRÍTICO: <span class='briefing-highlight'>Manifestação na Augusta</span>. Fluxo de pedestres altamente errático. Desvio comportamental coletivo detectado. Mantenham rotas alternativas de escoamento ativas.",
    inflation: "Briefing de Anomalia: <span class='briefing-highlight'>Queda Incomum de Fluxo (-20%)</span>. Ruas vazias sem justificativa climática. O Sentinel detecta isso como indicativo de insegurança subjetiva."
};

// Node network coordinates on actual streets for Monte Carlo route graph
const twinGeographicNodes = {
    A: [-23.5615, -46.6562], // MASP (Start / Incident)
    D: [-23.5608, -46.6571], // Paulista x Peixoto Gomide
    E: [-23.5623, -46.6552], // Paulista x Itapeva
    B: [-23.5638, -46.6582], // Al. Casa Branca x Al. Santos (Police Blockade B)
    C: [-23.5650, -46.6558], // Al. Pamplona x Al. Santos (Police Blockade C)
    F: [-23.5592, -46.6558], // Escape North (Peixoto x Jaú)
    G: [-23.5595, -46.6585], // Escape West (Paulista x Augusta)
    H: [-23.5672, -46.6575]  // Escape South (Pamplona x Lorena)
};

// Graph connections for paths
const twinGeographicEdges = [
    ['A', 'D'], ['A', 'E'],
    ['D', 'B'], ['D', 'E'],
    ['E', 'C'], ['E', 'D'],
    ['B', 'G'], ['C', 'H'],
    ['B', 'F'], ['C', 'F']
];

// Initialize Application
window.addEventListener('DOMContentLoaded', () => {
    initClock();
    initTabNavigation();
    initSelectors();
    
    // Leaflet Init
    initLeafletMaps();
    updateGeographicRisks();
    
    // Non-map Canvas components
    initCanvases();
    
    renderNLPReports();
    renderAnomalies();
    updateBriefingText();
    
    // Animation Loops
    requestAnimationFrame(mainLoop);
    
    // Auto-update metrics
    setInterval(slowMetricUpdater, 8000);
});

// 1. CLOCK WIDGET
function initClock() {
    const timeDisplay = document.getElementById('current-time');
    const updateTime = () => {
        const now = new Date();
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
    document.querySelectorAll('.nav-item').forEach(el => {
        if(el.getAttribute('data-tab') === tabId) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });

    document.querySelectorAll('.tab-content').forEach(el => {
        if(el.id === `tab-${tabId}`) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });

    state.activeTab = tabId;
    
    // Leaflet map invalidateSize to prevent rendering glitches on hidden div display
    setTimeout(() => {
        if (tabId === 'cerebro' && brainMap) {
            brainMap.invalidateSize();
        } else if (tabId === 'twin' && twinMap) {
            twinMap.invalidateSize();
        } else if (tabId === 'dashboard' && quickMap) {
            quickMap.invalidateSize();
        }
    }, 50);
}

// 3. LEAFLET MAPS INITIALIZATION
function initLeafletMaps() {
    if (quickMap) return; // Already init
    
    const tileLayerUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    const tileAttribution = '&copy; OpenStreetMap &copy; CARTO';
    
    // 1. Quick Map (Dashboard view - stationary, no zoom controls)
    quickMap = L.map('quick-map', {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        touchZoom: false
    }).setView([-23.5615, -46.6562], 15);
    
    L.tileLayer(tileLayerUrl, { attribution: 'CARTO' }).addTo(quickMap);
    quickMapRiskGroup = L.layerGroup().addTo(quickMap);
    
    // 2. Brain Map (Cérebro tab - interactive)
    brainMap = L.map('brain-map', {
        zoomControl: true,
        preferCanvas: true
    }).setView([-23.5615, -46.6562], 15);
    
    L.tileLayer(tileLayerUrl, { attribution: tileAttribution }).addTo(brainMap);
    brainMapRiskGroup = L.layerGroup().addTo(brainMap);
    
    // Map Click handler to insert manual threat marker
    brainMap.on('click', handleGeographicBrainMapClick);
    
    // 3. Twin Map (Gêmeos Digitais tab - interactive)
    twinMap = L.map('twin-map', {
        zoomControl: true,
        preferCanvas: true
    }).setView([-23.5615, -46.6562], 15);
    
    L.tileLayer(tileLayerUrl, { attribution: tileAttribution }).addTo(twinMap);
    twinMapGroup = L.layerGroup().addTo(twinMap);
    twinMapRoutesGroup = L.layerGroup().addTo(twinMap);
    
    // Initialize Twin Base Nodes / Markers
    setupTwinGeographicMarkers();
}

function setupTwinGeographicMarkers() {
    // Incident Marker MASP
    const pulseIcon = L.divIcon({
        className: 'custom-pulse-icon',
        html: '<div style="width: 14px; height: 14px; background: #ff3860; border-radius:50%; box-shadow: 0 0 10px #ff3860; border: 2px solid white;"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    });
    twinIncidentMarker = L.marker(twinGeographicNodes.A, { icon: pulseIcon }).addTo(twinMapGroup)
        .bindPopup("<b>Epicentro do Incidente (MASP)</b><br>Ponto A");
        
    // Police Blockade B
    const iconB = L.divIcon({
        className: 'blockade-icon-b',
        html: '<div style="width:16px; height:16px; background:#ff3860; color:white; border-radius:50%; font-size:9px; font-weight:bold; text-align:center; line-height:16px; border:1px solid white;">B</div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
    twinBlockadeBMarker = L.marker(twinGeographicNodes.B, { icon: iconB }).addTo(twinMapGroup)
        .bindPopup("<b>Bloqueio Tático B</b><br>Al. Casa Branca x Al. Santos<br>Prob. Intercepção: 85%");
        
    // Police Blockade C
    const iconC = L.divIcon({
        className: 'blockade-icon-c',
        html: '<div style="width:16px; height:16px; background:#ffb800; color:black; border-radius:50%; font-size:9px; font-weight:bold; text-align:center; line-height:16px; border:1px solid white;">C</div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
    twinBlockadeCMarker = L.marker(twinGeographicNodes.C, { icon: iconC }).addTo(twinMapGroup)
        .bindPopup("<b>Bloqueio Tático C</b><br>Al. Pamplona x Al. Santos<br>Prob. Intercepção: 60%");
        
    // Draw Street Net Lines
    twinGeographicEdges.forEach(edge => {
        const start = twinGeographicNodes[edge[0]];
        const end = twinGeographicNodes[edge[1]];
        L.polyline([start, end], {
            color: 'rgba(255, 255, 255, 0.15)',
            weight: 2.5,
            dashArray: '5, 5'
        }).addTo(twinMapGroup);
    });
}

function updateTwinMapIncidentMarker(latlng) {
    if (twinIncidentMarker) {
        twinIncidentMarker.setLatLng(latlng);
        // Move camera to center
        twinMap.panTo(latlng);
        // Update coordinates in node A for Monte Carlo calculations
        twinGeographicNodes.A = [latlng.lat, latlng.lng];
    }
}

// 4. DYNAMIC HEATMAP UPDATE
function updateGeographicRisks() {
    if (!quickMapRiskGroup || !brainMapRiskGroup) return;
    
    quickMapRiskGroup.clearLayers();
    brainMapRiskGroup.clearLayers();
    
    // Add dynamic circles to represent risk hotspots
    state.riskLocations.forEach(loc => {
        let climateMod = 0;
        if(state.variables.weather === 'rainy') climateMod = 10;
        else if(state.variables.weather === 'storm') climateMod = 25;
        
        let eventMod = 0;
        if(state.variables.event === 'festive' && loc.name.includes("MASP")) eventMod = 35;
        else if(state.variables.event === 'protest' && loc.name.includes("Augusta")) eventMod = 45;
        
        let economyMod = 0;
        if(state.variables.economy === 'inflation') economyMod = 15;
        
        let risk = Math.min(Math.max(loc.baseRisk + climateMod + eventMod + economyMod, 5), 98);
        
        // Colors
        let color = '#00ff88';
        if (risk > 75) {
            color = '#ff3860';
        } else if (risk > 35) {
            color = '#ffb800';
        }
        
        const circleRadius = 35 + (risk * 0.9); // radius in meters
        
        // Render on Quick Map
        L.circle(loc.coords, {
            color: color,
            fillColor: color,
            fillOpacity: 0.15 + (risk / 300),
            weight: 1.5,
            radius: circleRadius
        }).addTo(quickMapRiskGroup);
        
        // Render on Brain Map
        const circle = L.circle(loc.coords, {
            color: color,
            fillColor: color,
            fillOpacity: 0.15 + (risk / 300),
            weight: 1.5,
            radius: circleRadius
        }).addTo(brainMapRiskGroup);
        
        circle.bindPopup(`
            <b>${loc.name}</b><br>
            Risco Espaçotemporal: <span style="color:${color}; font-weight:bold;">${risk}%</span><br>
            Clima: ${state.variables.weather.toUpperCase()}<br>
            Status Eventos: ${state.variables.event.toUpperCase()}
        `);
    });
}

function handleGeographicBrainMapClick(e) {
    const latlng = e.latlng;
    
    // Inject custom hotspot to Paulista region list
    const newHotspot = {
        name: `Sensor Customizado (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`,
        coords: [latlng.lat, latlng.lng],
        baseRisk: 80
    };
    
    state.riskLocations.push(newHotspot);
    updateGeographicRisks();
    
    // Add anomaly report
    state.anomalies.unshift({
        id: Date.now(),
        title: "Ponto de Risco Injetado",
        type: "danger",
        text: `Alerta manual de ameaça cadastrado nas coordenadas reais [${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}].`,
        time: getShortTime(),
        stat: `Coordenada: ${latlng.lat.toFixed(4)} N`
    });
    renderAnomalies();
    
    // Mirror incident coordinates to Twin Map
    updateTwinMapIncidentMarker(latlng);
}

// 5. SELECTORS VARIABLES CONTROLS
function initSelectors() {
    const setSelectorEvents = (containerId, stateKey) => {
        const container = document.getElementById(containerId);
        const buttons = container.querySelectorAll('.selector-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.variables[stateKey] = btn.getAttribute('data-value');
                
                // Redraw maps and calculate briefings
                updateGeographicRisks();
                updateBriefingText();
                triggerDynamicAnomaly();
            });
        });
    };
    
    setSelectorEvents('weather-selectors', 'weather');
    setSelectorEvents('event-selectors', 'event');
    setSelectorEvents('economy-selectors', 'economy');
}

// 6. BRIEFING GENERATION
function updateBriefingText() {
    const textEl = document.getElementById('correlation-analysis-text');
    const briefingEl = document.getElementById('cognitive-briefing-text');
    
    let w = state.variables.weather;
    let e = state.variables.event;
    let ec = state.variables.economy;
    
    let analysis = "";
    let brief = "";
    
    if (w === 'sunny' && e === 'none' && ec === 'normal') {
        analysis = "O clima na Av. Paulista está estável e o fluxo de pessoas na região comercial está em conformidade. O Sentinel trabalha com risco basal de 12%. As variáveis econômicas não indicam estresse na malha.";
        brief = briefings.default;
    } else {
        analysis = "SENTINEL DETECTOU CORRELAÇÕES AUMENTADAS: ";
        
        if (w === 'storm') {
            analysis += "Tempestades severas diminuem crimes nas ruas (-30% ao ar livre), mas criam gargalos em hubs subterrâneos de transporte (Metrô Consolação: +45% risco estocástico). ";
            brief = briefings.storm;
        } else if (w === 'rainy') {
            analysis += "Chuva leve aumenta roubos de pertences e aparelhos móveis próximos a paradas de ônibus em 15% devido à distração e ao agrupamento de pedestres na Av. Paulista. ";
            brief = briefings.rainy;
        }
        
        if (e === 'festive') {
            analysis += "O evento comemorativo no vão livre do MASP atrai grandes massas, concentrando o risco de furto oportunista na coordenada principal. ";
            brief = briefings.festive;
        } else if (e === 'protest') {
            analysis += "A manifestação bloqueia vias. Detectados desvios comportamentais coletivos na Augusta e imediações paulistas. ";
            brief = briefings.protest;
        }
        
        if (ec === 'inflation') {
            analysis += "Alerta estocástico: A queda de 20% no fluxo de pedestres remove a vigilância social natural das vias residenciais adjacentes, elevando risco de invasões residenciais secundárias em 22%. ";
            if (!brief) brief = briefings.inflation;
        }
    }
    
    textEl.innerHTML = analysis;
    briefingEl.innerHTML = brief;
}

function triggerDynamicAnomaly() {
    if (state.variables.economy === 'inflation') {
        const exists = state.anomalies.some(a => a.title.includes("Fluxo de Pedestres"));
        if (!exists) {
            state.anomalies.unshift({
                id: Date.now(),
                title: "Queda Crítica de Fluxo de Pedestres",
                type: "danger",
                text: "Al. Santos registrou queda repentina de 22% no fluxo de pedestres sem ocorrências climáticas atípicas.",
                time: getShortTime(),
                stat: "Variância Estocástica: σ=4.2"
            });
            renderAnomalies();
        }
    }
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
    
    if (quickFeed) {
        quickFeed.innerHTML = state.nlpReports.slice(0, 2).map(generateHtml).join('');
    }
    
    if (fullFeed) {
        fullFeed.innerHTML = state.nlpReports.map(generateHtml).join('');
    }
    
    const counter = document.getElementById('dash-nlp-count');
    if (counter) counter.textContent = state.nlpReports.length + 1486;
}

function updateSliderVal(val) {
    document.getElementById('reliability-val').textContent = val + '%';
}

function handleNewReportSubmit(event) {
    event.preventDefault();
    
    const author = document.getElementById('report-author').value;
    const reliability = parseInt(document.getElementById('report-reliability').value);
    const text = document.getElementById('report-text').value;
    
    let sentiment = "Neutro";
    let urgency = "baixa";
    let keywords = [];
    const textLower = text.toLowerCase();
    
    if (textLower.includes('assalto') || textLower.includes('arma') || textLower.includes('roubo') || textLower.includes('faca') || textLower.includes('invadindo')) {
        urgency = "alta";
        sentiment = "Crítico / Urgente";
        keywords.push("Ameaça Física");
    } else if (textLower.includes('suspeito') || textLower.includes('rondando') || textLower.includes('escuro') || textLower.includes('quebrada')) {
        urgency = "media";
        sentiment = "Alerta Comportamental";
        keywords.push("Suspeita");
    } else {
        urgency = "baixa";
        sentiment = "Informativo";
        keywords.push("Infraestrutura");
    }
    
    let location = "Av. Paulista - Geral";
    let coords = [-23.5615, -46.6562]; // MASP
    
    if (textLower.includes('augusta')) {
        location = "Rua Augusta";
        coords = [-23.5595, -46.6585];
    } else if (textLower.includes('pamplona')) {
        location = "Al. Pamplona";
        coords = [-23.5632, -46.6542];
    } else if (textLower.includes('santos')) {
        location = "Al. Santos";
        coords = [-23.5650, -46.6558];
    }
    
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
    
    state.nlpReports.unshift(newReport);
    renderNLPReports();
    document.getElementById('report-input-form').reset();
    document.getElementById('reliability-val').textContent = '85%';
    
    // Inject threat circle at coordinates derived from NLP
    state.riskLocations.push({
        name: `Relato NLP: ${author}`,
        coords: coords,
        baseRisk: urgency === 'alta' ? 85 : 55
    });
    updateGeographicRisks();
    
    state.anomalies.unshift({
        id: Date.now(),
        title: `NLP Alerta: ${urgency.toUpperCase()}`,
        type: urgency === 'alta' ? 'danger' : 'warning',
        text: `Relato sobre ${location} processado. Risco espacial adicionado ao sistema.`,
        time: getShortTime(),
        stat: `Score Fonte: ${reliability}%`
    });
    renderAnomalies();
    
    state.systemMetrics.totalReports++;
}

function clearReportLogs() {
    state.nlpReports = [];
    renderNLPReports();
}

// 8. ANOMALIES FEED
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
                    <span>Status: Ativo</span>
                </div>
            </div>
        `;
    }).join('');
    
    const countEl = document.getElementById('dash-anomaly-count');
    if (countEl) countEl.textContent = state.anomalies.length;
}

// 9. MONTE CARLO ESCAPE GRAPH ROUTINE
function triggerIncident() {
    // Incident MASP coordinate
    const maspCoords = twinGeographicNodes.A;
    updateTwinMapIncidentMarker(L.latLng(maspCoords[0], maspCoords[1]));
    
    state.anomalies.unshift({
        id: Date.now(),
        title: "Incidente Iniciado (MASP)",
        type: "danger",
        text: "Alerta de fuga a partir do vão livre do MASP. Iniciando simulações de rota de interceptação.",
        time: getShortTime(),
        stat: "Fuga: Av. Paulista"
    });
    renderAnomalies();
    
    startMonteCarloSimulation();
}

function startMonteCarloSimulation() {
    if (state.monteCarlo.isRunning) return;
    
    state.monteCarlo.isRunning = true;
    state.monteCarlo.progress = 0;
    state.monteCarlo.routes = [];
    
    const fillEl = document.getElementById('monte-carlo-fill');
    const statusEl = document.getElementById('monte-carlo-status');
    const btnEl = document.getElementById('btn-montecarlo');
    
    btnEl.disabled = true;
    btnEl.textContent = "Simulando...";
    statusEl.textContent = "Calculando caminhos...";
    statusEl.style.color = "var(--color-warning)";
    
    // Clear old route lines
    twinMapRoutesGroup.clearLayers();
    
    const totalSims = 10000;
    const simsPerFrame = 500;
    
    function runSimChunk() {
        if (state.monteCarlo.progress >= totalSims) {
            finishMonteCarlo();
            return;
        }
        
        for (let i = 0; i < simsPerFrame; i++) {
            const path = simulateSingleEscapePath();
            state.monteCarlo.routes.push(path);
            state.monteCarlo.progress++;
        }
        
        const currentProgress = state.monteCarlo.progress;
        const fillPercent = (currentProgress / totalSims) * 100;
        fillEl.style.width = `${fillPercent}%`;
        
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
        
        // Visually draw a subset of lines on Leaflet map dynamically during progress
        if (state.monteCarlo.progress % 1000 === 0) {
            drawVisualGeographicRoutes(5); // Draw a few lines to represent progress
        }
        
        requestAnimationFrame(runSimChunk);
    }
    
    requestAnimationFrame(runSimChunk);
}

function simulateSingleEscapePath() {
    let currentNode = 'A';
    const path = [currentNode];
    let hitNode = null;
    let loops = 0;
    
    while (currentNode !== 'G' && currentNode !== 'H' && currentNode !== 'F' && loops < 12) {
        loops++;
        const neighbors = [];
        twinGeographicEdges.forEach(edge => {
            if (edge[0] === currentNode) neighbors.push(edge[1]);
            else if (edge[1] === currentNode) neighbors.push(edge[0]);
        });
        
        if (neighbors.length === 0) break;
        let nextNode = neighbors[Math.floor(Math.random() * neighbors.length)];
        
        // Police check blockade rates
        if (nextNode === 'B' && Math.random() < 0.85) {
            hitNode = 'B';
            path.push('B');
            break;
        }
        if (nextNode === 'C' && Math.random() < 0.60) {
            hitNode = 'C';
            path.push('C');
            break;
        }
        
        currentNode = nextNode;
        path.push(currentNode);
    }
    
    if (!hitNode) hitNode = 'ESCAPED';
    
    return { path, hitNode };
}

function drawVisualGeographicRoutes(count) {
    // Select routes to plot on Leaflet
    const startIdx = Math.max(0, state.monteCarlo.routes.length - count);
    const endIdx = state.monteCarlo.routes.length;
    
    for (let i = startIdx; i < endIdx; i++) {
        const route = state.monteCarlo.routes[i];
        
        // Route color based on outcome
        let color = '#00ff88'; // Escaped
        if (route.hitNode === 'B') color = '#ff3860'; // Caught B
        else if (route.hitNode === 'C') color = '#ffb800'; // Caught C
        
        const coordsPath = route.path.map(nodeKey => twinGeographicNodes[nodeKey]).filter(Boolean);
        
        L.polyline(coordsPath, {
            color: color,
            weight: 2,
            opacity: 0.45,
            smoothFactor: 1.0
        }).addTo(twinMapRoutesGroup);
    }
}

function finishMonteCarlo() {
    state.monteCarlo.isRunning = false;
    
    const statusEl = document.getElementById('monte-carlo-status');
    const btnEl = document.getElementById('btn-montecarlo');
    btnEl.disabled = false;
    btnEl.textContent = "Executar Monte Carlo";
    
    statusEl.textContent = "Simulado";
    statusEl.style.color = "var(--color-success)";
    
    let hitB = 0; let hitC = 0; let escaped = 0;
    state.monteCarlo.routes.forEach(p => {
        if (p.hitNode === 'B') hitB++;
        else if (p.hitNode === 'C') hitC++;
        else escaped++;
    });
    
    const pb = Math.round((hitB / 10000) * 100);
    const pc = Math.round((hitC / 10000) * 100);
    
    document.getElementById('prob-ptb').textContent = `${pb}%`;
    document.getElementById('prob-ptc').textContent = `${pc}%`;
    
    const probBestEl = document.getElementById('prob-best');
    if (pb > pc) {
        probBestEl.textContent = `Ponto B (${pb}% Eficácia)`;
        probBestEl.className = "prob-val success";
    } else {
        probBestEl.textContent = `Ponto C (${pc}% Eficácia)`;
        probBestEl.className = "prob-val success";
    }
    
    // Draw clean final routes layout representing the flows (plot 120 lines total)
    twinMapRoutesGroup.clearLayers();
    drawVisualGeographicRoutes(120);
    
    state.anomalies.unshift({
        id: Date.now(),
        title: "Rede Monte Carlo Concluída",
        type: "warning",
        text: `Cálculo concluído no grafo da Paulista. Intercepção ideal: Ponto ${pb > pc ? 'B' : 'C'} (${Math.max(pb, pc)}% de sucesso).`,
        time: getShortTime(),
        stat: `Rotas Livres: ${Math.round((escaped/10000)*100)}%`
    });
    renderAnomalies();
}

// 10. NEURAL CALIBRATION & HUMAN FEEDBACK
function submitHumanFeedback(type, element) {
    document.querySelectorAll('.feedback-card').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    
    const weightsStatusEl = document.getElementById('weights-status');
    weightsStatusEl.textContent = "Calibrando...";
    weightsStatusEl.style.color = "var(--color-warning)";
    
    setTimeout(() => {
        if (type === 'confirm') {
            state.humanSymbiosis.weights["Relatos"][0] = Math.min(state.humanSymbiosis.weights["Relatos"][0] + 0.08, 0.99);
            state.humanSymbiosis.weights["Fluxo"][1] = Math.min(state.humanSymbiosis.weights["Fluxo"][1] + 0.06, 0.99);
        } else if (type === 'deny') {
            state.humanSymbiosis.weights["Relatos"][0] = Math.max(state.humanSymbiosis.weights["Relatos"][0] - 0.12, 0.20);
        } else if (type === 'low_light') {
            state.humanSymbiosis.weights["Iluminação"][0] = Math.min(state.humanSymbiosis.weights["Iluminação"][0] + 0.15, 0.99);
            state.humanSymbiosis.weights["Iluminação"][2] = Math.min(state.humanSymbiosis.weights["Iluminação"][2] + 0.12, 0.99);
        }
        
        weightsStatusEl.textContent = "Calibrada";
        weightsStatusEl.style.color = "var(--color-success)";
        
        triggerNetworkCalibrationAnimation();
        
        state.anomalies.unshift({
            id: Date.now(),
            title: "Pesos Táticos Ajustados",
            type: "warning",
            text: `Feedback simbiótico registrado: ${type.toUpperCase()}. Rede neural otimizada.`,
            time: getShortTime(),
            stat: `Precisão: ${state.systemMetrics.precision}%`
        });
        renderAnomalies();
    }, 800);
}

let calibrationPulseTime = 0;
function triggerNetworkCalibrationAnimation() {
    calibrationPulseTime = 30;
}

// 11. CAMERAS & NON-MAP GRAPHICS SYSTEM
function initCanvases() {
    cam1Canvas = document.getElementById('cam-1-canvas');
    cam1Ctx = cam1Canvas.getContext('2d');
    
    cam2Canvas = document.getElementById('cam-2-canvas');
    cam2Ctx = cam2Canvas.getContext('2d');
    
    networkCanvas = document.getElementById('network-canvas');
    networkCtx = networkCanvas.getContext('2d');
    
    resizeCameraCanvases();
}

function resizeCameraCanvases() {
    const resizeSingle = (canvas) => {
        if (!canvas) return;
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight || 220;
    };
    resizeSingle(cam1Canvas);
    resizeSingle(cam2Canvas);
    resizeSingle(networkCanvas);
}

// CV pedestrian shapes for feeds
const cvPedestriansCam1 = [
    { x: 30, y: 150, vx: 0.12, vy: 0.08, radius: 8 },
    { x: 180, y: 80, vx: -0.1, vy: 0.18, radius: 9 },
    { x: 120, y: 180, vx: 0.2, vy: -0.04, radius: 7 }
];

const cvPedestriansCam2 = [
    { x: 140, y: 100, vx: 0, vy: 0, state: 'hesitate', angle: 0, radius: 9 },
    { x: 50, y: 60, vx: 0.15, vy: 0.15, radius: 8 }
];

function drawCVCamera(canvas, ctx, label, speedMultiplier, isAnomalous = false) {
    if (!canvas || !ctx) return;
    
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw scan lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
    ctx.lineWidth = 1;
    for(let y = 0; y < canvas.height; y += 4) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    
    const pedestrians = isAnomalous ? cvPedestriansCam2 : cvPedestriansCam1;
    
    pedestrians.forEach(p => {
        if(p.state === 'hesitate') {
            p.angle += 0.02;
            p.x = 130 + Math.cos(p.angle) * 35;
            p.y = 110 + Math.sin(p.angle) * 15;
        } else {
            p.x += p.vx * 30 * speedMultiplier * 10;
            p.y += p.vy * 30 * speedMultiplier * 10;
            
            if(p.x < 10 || p.x > canvas.width - 10) p.vx *= -1;
            if(p.y < 10 || p.y > canvas.height - 10) p.vy *= -1;
        }
        
        const color = isAnomalous && p.state === 'hesitate' ? 'var(--color-danger)' : 'var(--color-success)';
        const boxSize = p.radius * 2.8;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(p.x - boxSize/2, p.y - boxSize, boxSize, boxSize * 1.5);
        
        ctx.fillStyle = color;
        ctx.font = '8px var(--font-mono)';
        const labelText = isAnomalous && p.state === 'hesitate' ? 'ALERTA_SUSP' : 'ANON_PED_VEC';
        ctx.fillText(labelText, p.x - boxSize/2, p.y - boxSize - 3);
        
        // Skeletal lines representation (Privacy)
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y - boxSize*0.7, 4, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p.x, p.y - boxSize*0.7 + 4); ctx.lineTo(p.x, p.y + boxSize*0.2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - boxSize*0.3); ctx.lineTo(p.x - 6, p.y - boxSize*0.1);
        ctx.moveTo(p.x, p.y - boxSize*0.3); ctx.lineTo(p.x + 6, p.y - boxSize*0.1);
        ctx.moveTo(p.x, p.y + boxSize*0.2); ctx.lineTo(p.x - 5, p.y + boxSize*0.5);
        ctx.moveTo(p.x, p.y + boxSize*0.2); ctx.lineTo(p.x + 5, p.y + boxSize*0.5);
        ctx.stroke();
    });
    
    ctx.strokeStyle = 'rgba(0, 210, 255, 0.05)';
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
}

// 12. NEURAL NETWORK GRAPHICS
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
    
    if (calibrationPulseTime > 0) calibrationPulseTime--;
    
    netNodes.inputs.forEach((input, iIdx) => {
        netNodes.hidden.forEach((hidden, hIdx) => {
            const varName = input.label;
            const wArray = state.humanSymbiosis.weights[varName] || [0.5, 0.5, 0.5];
            const weightVal = wArray[hIdx % wArray.length];
            
            const thickness = Math.max(weightVal * 4.5, 0.5);
            let color = `rgba(0, 210, 255, ${0.1 + weightVal * 0.4})`;
            
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
    
    const drawNodeGroup = (nodesList, xPos, isLabelLeft = false, hasLabels = true) => {
        nodesList.forEach(node => {
            let radius = 7;
            if (calibrationPulseTime > 0) {
                radius = 7 + (calibrationPulseTime / 30) * 4;
            }
            
            ctx.fillStyle = calibrationPulseTime > 0 ? '#00ff88' : 'var(--color-primary)';
            ctx.beginPath();
            ctx.arc(xPos, node.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
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

// 13. MAIN LOOP
function mainLoop(timestamp) {
    if (state.activeTab === 'twin') {
        drawCVCamera(cam1Canvas, cam1Ctx, 'MASP Cam', 0.002);
        drawCVCamera(cam2Canvas, cam2Ctx, 'Pamplona Cam', 0.005, true);
    } else if (state.activeTab === 'simbiose') {
        drawNeuralNetwork();
    }
    
    requestAnimationFrame(mainLoop);
}

function getShortTime() {
    const now = new Date();
    return now.toTimeString().split(' ')[0].slice(0, 5);
}

function slowMetricUpdater() {
    state.systemMetrics.precision = (93.5 + Math.random() * 1.5).toFixed(1);
    state.systemMetrics.coherence = (95.8 + Math.random() * 2.0).toFixed(1);
    
    const precEl = document.getElementById('sys-precision');
    const confEl = document.getElementById('sys-confidence');
    if (precEl) precEl.textContent = state.systemMetrics.precision + '%';
    if (confEl) confEl.textContent = state.systemMetrics.coherence + '%';
}
