// ================================================================
//  CONFIGURACIÓN DE FIREBASE
// ================================================================
const FIREBASE_ACTUAL_URL    = "https://monitoreo-ambiental-chptw3y-default-rtdb.firebaseio.com/actual.json";
const FIREBASE_HISTORIAL_URL = "https://monitoreo-ambiental-chptw3y-default-rtdb.firebaseio.com/historial.json";


// ================================================================
//  REFERENCIAS AL DOM
// ================================================================
const canvas = document.getElementById('histCanvas');
const ctx    = canvas.getContext('2d');


// ================================================================
//  SECCIÓN 1 — DATASETS DE LA GRÁFICA
//  Contienen datos de demostración que serán reemplazados por
//  los datos reales de Firebase al cargar la página.
// ================================================================
const DATASETS = {
  temp: {
    label: 'Temperatura', unit: '°C',
    yMin: 24.8, yMax: 27.9,
    yTicks: [24.8, 25.7, 26.7, 27.7],
    colorA: '#FF8C00', colorB: '#E63A00',
    data1h: [25.7,26.1,25.9,27.2,26.5,27.5,26.2,25.8,27.1,26.7,25.5,26.9],
    data3h: [25.2,25.9,26.4,25.7,26.1,27.0,26.6,25.4,26.8,27.2,25.9,26.3],
    data6h: [24.9,25.3,25.8,26.2,25.5,26.0,26.7,25.1,25.6,26.4,25.8,26.9],
  },
  hum: {
    label: 'Humedad', unit: '%',
    yMin: 30, yMax: 70,
    yTicks: [30, 40, 50, 60, 70],
    colorA: '#4E9AF1', colorB: '#A855F7',
    data1h: [45,47,43,50,48,52,47,44,49,46,51,47],
    data3h: [42,44,47,46,43,48,50,45,47,44,49,46],
    data6h: [38,41,44,46,43,40,45,47,42,44,46,43],
  },
  pm1: {
    label: 'PM 1.0', unit: 'µg',
    yMin: 0, yMax: 50,
    yTicks: [0, 12, 25, 37, 50],
    colorA: '#3DD17A', colorB: '#1A7A45',
    data1h: [10,14,12,18,15,22,17,13,19,16,11,14],
    data3h: [8,11,15,13,10,16,18,12,14,11,17,13],
    data6h: [6,9,12,10,8,13,15,10,11,8,14,10],
  },
  pm25: {
    label: 'PM 2.5', unit: 'µg',
    yMin: 0, yMax: 60,
    yTicks: [0, 15, 30, 45, 60],
    colorA: '#FFC83C', colorB: '#CC8800',
    data1h: [20,25,22,30,26,35,28,21,32,27,19,24],
    data3h: [15,20,25,22,18,28,31,20,24,19,29,22],
    data6h: [10,16,21,18,14,22,26,17,19,15,23,18],
  },
  pm10: {
    label: 'PM 10', unit: 'µg',
    yMin: 0, yMax: 80,
    yTicks: [0, 20, 40, 60, 80],
    colorA: '#FF4B4B', colorB: '#CC0000',
    data1h: [35,42,38,50,44,58,46,36,52,45,33,40],
    data3h: [28,35,42,38,30,46,52,34,40,32,48,37],
    data6h: [20,28,35,30,24,38,44,28,32,25,40,30],
  },
};


// ================================================================
//  SECCIÓN 2 — ETIQUETAS DEL EJE X (se sobreescriben con datos reales)
// ================================================================
const LABELS_1H = ['0:00','0:05','0:10','0:15','0:20','0:25','0:30','0:35','0:40','0:45','0:50','0:55'];
const LABELS_3H = ['7:00','7:30','8:00','8:30','9:00','9:30','10:00','10:30','11:00','11:30','12:00','12:30'];
const LABELS_6H = ['6:00','7:00','8:00','9:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];

let activeMetric = 'temp';
let activeRango  = '1h';

function getLabels(rango) {
  if (rango === '1h') return LABELS_1H;
  if (rango === '3h') return LABELS_3H;
  return LABELS_6H;
}

function getData(metric, rango) {
  const ds = DATASETS[metric];
  if (rango === '1h') return ds.data1h;
  if (rango === '3h') return ds.data3h;
  return ds.data6h;
}


// ================================================================
//  SECCIÓN 3 — RENDERIZADO DE LA GRÁFICA
// ================================================================
function drawChart() {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width / dpr;
  const H = canvas.height / dpr;
  ctx.clearRect(0, 0, W, H);

  const ds     = DATASETS[activeMetric];
  const data   = getData(activeMetric, activeRango);
  const labels = getLabels(activeRango);

  const PAD_L = 44, PAD_R = 16, PAD_T = 14, PAD_B = 34;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const yMin = ds.yMin, yMax = ds.yMax;

  // Fondo
  ctx.fillStyle = '#0D1525';
  roundRect(ctx, 0, 0, W, H, 10);
  ctx.fill();

  // Líneas de cuadrícula y ticks del eje Y
  ctx.setLineDash([3, 5]);
  ctx.lineWidth = 1;
  ds.yTicks.forEach(tick => {
    const y = PAD_T + chartH - ((tick - yMin) / (yMax - yMin)) * chartH;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.moveTo(PAD_L, y); ctx.lineTo(PAD_L + chartW, y); ctx.stroke();
    ctx.fillStyle = 'rgba(160,170,195,0.7)';
    ctx.font = '10px Outfit, sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(tick, PAD_L - 6, y);
  });
  ctx.setLineDash([]);

  // Puntos de la línea
  const n = data.length;
  const slotW = chartW / (n > 1 ? n - 1 : 1);
  const points = data.map((val, i) => {
    const normH = ((val - yMin) / (yMax - yMin)) * chartH;
    return { x: PAD_L + i * slotW, y: Math.max(PAD_T, PAD_T + chartH - normH) };
  });

  if (points.length > 0) {
    // Área rellena
    ctx.beginPath();
    ctx.moveTo(points[0].x, PAD_T + chartH);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[n - 1].x, PAD_T + chartH);
    ctx.closePath();
    const fillGrad = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + chartH);
    fillGrad.addColorStop(0, ds.colorA + '55');
    fillGrad.addColorStop(1, ds.colorA + '00');
    ctx.fillStyle = fillGrad; ctx.fill();

    // Línea principal con efecto neón
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = ds.colorA;
    ctx.shadowColor = ds.colorA;
    ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // Nodos en cada punto
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#0C1220'; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = ds.colorA; ctx.stroke();
    });
  }

  // Etiquetas eje X
  ctx.fillStyle = 'rgba(90,100,130,0.9)';
  ctx.font = '9px Outfit, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const step = n > 8 ? 2 : 1;
  labels.forEach((lbl, i) => {
    if (i % step !== 0) return;
    ctx.fillText(lbl, PAD_L + i * slotW, PAD_T + chartH + 10);
  });
}


// ================================================================
//  SECCIÓN 4 — AUXILIAR: roundRect
// ================================================================
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function recalcAxis(metric) {
  const ds = DATASETS[metric];
  const allData = [...ds.data1h, ...ds.data3h, ...ds.data6h]
    .map(Number).filter(v => !isNaN(v) && isFinite(v));
  if (allData.length === 0) return;
  const min = Math.min(...allData);
  const max = Math.max(...allData);
  const pad = Math.max((max - min) * 0.2, 1);
  ds.yMin = parseFloat((min - pad).toFixed(1));
  ds.yMax = parseFloat((max + pad).toFixed(1));
  const step = (ds.yMax - ds.yMin) / 3;
  ds.yTicks = [0,1,2,3].map(i => parseFloat((ds.yMin + i * step).toFixed(1)));
}


// ================================================================
//  SECCIÓN 5 — RESIZE CON SOPORTE DPI
// ================================================================
function resizeCanvas() {
  const wrap = canvas.parentElement;
  const dpr  = window.devicePixelRatio || 1;
  const rect = wrap.getBoundingClientRect();
  canvas.width  = rect.width  * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  canvas.style.width  = rect.width  + 'px';
  canvas.style.height = rect.height + 'px';
  drawChart();
}


// ================================================================
//  SECCIÓN 6 — ANIMACIÓN DEL DONUT
// ================================================================
function animateDonut(porcentaje) {
  const arc  = document.getElementById('donutArc');
  if (!arc) return;
  const circ = 2 * Math.PI * 78;

  let color;
  if (porcentaje < 33)      color = '#3DD17A';
  else if (porcentaje < 66) color = '#FFC83C';
  else                      color = '#FF4B4B';

  const dash = (porcentaje / 100) * circ;
  arc.setAttribute('stroke', color);
  arc.setAttribute('stroke-dashoffset', circ / 4); // ← esto fija el inicio arriba
  arc.style.transition = 'none';
  arc.setAttribute('stroke-dasharray', `0 ${circ}`);

  requestAnimationFrame(() => {
    setTimeout(() => {
      arc.style.transition = 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)';
      arc.setAttribute('stroke-dasharray', `${dash} ${circ}`);
    }, 400);
  });
}


// ================================================================
//  SECCIÓN 7 — COLORES DINÁMICOS DE LAS PESTAÑAS
// ================================================================
function updateTabColors() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.classList.contains('active')) {
      const color = DATASETS[btn.dataset.metric].colorA;
      btn.style.backgroundColor = color;
      btn.style.borderColor     = color;
      document.documentElement.style.setProperty('--active-color', color);
    } else {
      btn.style.backgroundColor = 'transparent';
      btn.style.borderColor     = 'var(--border)';
    }
  });
}


// ================================================================
//  SECCIÓN 8 — ACTUALIZAR DASHBOARD CON DATOS DE FIREBASE
// ================================================================
function actualizarDashboard(d) {

  // ── TEMPERATURA ────────────────────────────────────────────────
  document.querySelector('.temp-value').textContent     = parseFloat(d.temperatura).toFixed(1) + '°C';
  document.querySelector('.temp-sensation').textContent = 'Sensación  ' + parseFloat(d.sensacion).toFixed(1) + '°C';
  const statsTemp = document.querySelectorAll('.stats-row:not(.dark) .s-value');
  if (statsTemp.length >= 3) {
    statsTemp[0].textContent = parseFloat(d.t_min).toFixed(1)  + '°C';
    statsTemp[1].textContent = parseFloat(d.t_prom).toFixed(1) + '°C';
    statsTemp[2].textContent = parseFloat(d.t_max).toFixed(1)  + '°C';
  }

  // ── HUMEDAD ────────────────────────────────────────────────────
  document.querySelector('.hum-value').textContent = parseFloat(d.humedad).toFixed(1) + '%';
  document.getElementById('humBar').style.width      = d.humedad + '%';
  const statsHum = document.querySelectorAll('.stats-row.dark .s-value');
  if (statsHum.length >= 3) {
    statsHum[0].textContent = d.h_min  + '%';
    statsHum[1].textContent = d.h_prom + '%';
    statsHum[2].textContent = d.h_max  + '%';
  }

  // ── ORIGEN DE CONTAMINACIÓN ────────────────────────────────────
  const origenMap = {
    'Combustión / Vehicular': { emoji: '🚗', label: 'Vehicular'      },
    'Polvo / Construcción':   { emoji: '🏗️', label: 'Construcción'   },
    'Mezcla Urbana':          { emoji: '🏙️', label: 'Mezcla Urbana'  },
    'Calculando...':          { emoji: '⏳', label: 'Calculando...'   },
  };
  const origen = origenMap[d.origen] || { emoji: '🏙️', label: d.origen };
  document.querySelector('.car-emoji').textContent  = origen.emoji;
  document.querySelector('.cont-label').textContent = origen.label;

  // ── ESTADO (Detección de Humo) ─────────────────────────────────
  // El panel "Estado" solo indica si hay humo o no.
  // Normal → escudo verde | Humo Detectado → fuego rojo
  if (d.estado_humo === 'Humo Detectado') {
    document.querySelector('.shield-icon').textContent  = '🔥';
    document.querySelector('.status-label').textContent = 'Humo Detectado';
    document.querySelector('.status-label').style.color = '#FF4B4B';
    document.querySelector('.shield-wrap').style.boxShadow = '0 0 0 2px rgba(255,75,75,.35)';
  } else {
    document.querySelector('.shield-icon').textContent  = '🛡️';
    document.querySelector('.status-label').textContent = 'Normal';
    document.querySelector('.status-label').style.color = '#3DD17A';
    document.querySelector('.shield-wrap').style.boxShadow = '0 0 0 2px rgba(61,209,122,.25)';
  }

  // ── DONUT (% de contaminación) ─────────────────────────────────
  const pct = parseFloat(d.porcentaje_contaminacion) || 0;
  animateDonut(pct);
  document.querySelector('.donut-pct').textContent = pct + '%';

  let color;
  if (pct < 33)      color = '#3DD17A';
  else if (pct < 66) color = '#FFC83C';
  else               color = '#FF4B4B';
    document.querySelector('.donut-pct').style.color = color;

  // ── BARRAS DE PM (PM1, PM2.5, PM10) ───────────────────────────
  const colorMap = { 'Bueno': '#3DD17A', 'Moderado': '#FFC83C', 'Malo': '#FF4B4B' };

  const pmData = [
    { val: d.pm1,  estado: d.estado_pm1,  pct: Math.min((d.pm1  / 30)  * 100, 100) },
    { val: d.pm25, estado: d.estado_pm25, pct: Math.min((d.pm25 / 65)  * 100, 100) },
    { val: d.pm10, estado: d.estado_pm10, pct: Math.min((d.pm10 / 110) * 100, 100) },
  ];

document.querySelectorAll('.pm-item').forEach((item, i) => {
    const color = colorMap[pmData[i].estado] || '#FFC83C';

    // Gradientes por estado
    const gradientMap = {
        'Bueno':    'linear-gradient(90deg, #28A860, #3DD17A)',
        'Moderado': 'linear-gradient(90deg, #CC8800, #FFC83C)',
        'Malo':     'linear-gradient(90deg, #CC1010, #FF4B4B)',
    };
    const gradient = gradientMap[pmData[i].estado] || gradientMap['Moderado'];

    item.querySelector('.pm-val').textContent          = pmData[i].val + ' µg/m³';
    item.querySelector('.pm-status').textContent       = pmData[i].estado;
    item.querySelector('.pm-status').style.color       = color;
    item.querySelector('.pm-dot').style.background     = color;
    item.querySelector('.pm-fill').style.width         = pmData[i].pct + '%';
    item.querySelector('.pm-fill').style.background    = gradient;
  });

  // ── INDICADOR LIVE ─────────────────────────────────────────
const dot = document.querySelector('.live-dot');
if (dot && d.timestamp) {
  const segundos = Math.floor(Date.now() / 1000) - d.timestamp;
  dot.style.background = segundos < 60 ? '#3DD17A' : '#FF4B4B';
}
}


// ================================================================
//  SECCIÓN 9 — CARGAR HISTORIAL DE FIREBASE PARA LA GRÁFICA
// ================================================================
async function cargarHistorial() {
  try {
    const res  = await fetch(FIREBASE_HISTORIAL_URL);
    const json = await res.json();
    if (!json) return;

    // Firebase POST devuelve objeto con claves auto-generadas → convertir a array
    const todas = Object.values(json)
      .sort((a, b) => a.timestamp - b.timestamp); // Orden cronológico

    if (todas.length === 0) return;

    const ahora = Date.now() / 1000; // Timestamp actual en segundos

    // Filtrar entradas según el rango de tiempo y tomar las últimas 12 muestras
    const entradas1h = todas.filter(e => e.timestamp >= ahora - 3600).slice(-12);
    const entradas3h = todas.filter(e => e.timestamp >= ahora - 10800).slice(-12);
    const entradas6h = todas.filter(e => e.timestamp >= ahora - 21600).slice(-12);

    // Función auxiliar: sobreescribe los datos y etiquetas de cada rango
    function aplicar(entradas, sufijo, labelsArr) {
      if (entradas.length === 0) return;

      // Sobreescribir datos del sensor para el rango correspondiente
      DATASETS.temp[`data${sufijo}`] = entradas.map(e => parseFloat(e.temperatura).toFixed(1));
      DATASETS.hum[`data${sufijo}`]  = entradas.map(e => parseFloat(e.humedad).toFixed(1));
      DATASETS.pm1[`data${sufijo}`]  = entradas.map(e => e.pm1);
      DATASETS.pm25[`data${sufijo}`] = entradas.map(e => e.pm25);
      DATASETS.pm10[`data${sufijo}`] = entradas.map(e => e.pm10);

      // Etiquetas del eje X con la hora real de cada lectura
      labelsArr.length = 0;
      entradas.forEach(e => labelsArr.push(e.ultima_actualizacion || ''));

      ['temp','hum','pm1','pm25','pm10'].forEach(recalcAxis);
    }

    aplicar(entradas1h, '1h', LABELS_1H);
    aplicar(entradas3h, '3h', LABELS_3H);
    aplicar(entradas6h, '6h', LABELS_6H);

    drawChart();

  } catch (e) {
    console.warn('Error cargando historial:', e);
  }
}


// ================================================================
//  SECCIÓN 10 — FETCH DE DATOS ACTUALES DE FIREBASE
// ================================================================
async function fetchActual() {
  const now = new Date();
  const el = document.getElementById('liveTime');
  if (el) el.textContent = now.toTimeString().slice(0,8);

  try {
    const res  = await fetch(FIREBASE_ACTUAL_URL);
    const data = await res.json();
    if (data) actualizarDashboard(data);
  } catch (e) {
    console.warn('Error al leer Firebase:', e);
  }
}


// ================================================================
//  SECCIÓN 11 — EVENT LISTENERS
// ================================================================

// Pestañas de métricas
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeMetric = btn.dataset.metric;
    updateTabColors();
    drawChart();
  });
});

// Selector de rango temporal
const rangoSelect = document.getElementById('rangoSelect');
if (rangoSelect) {
  rangoSelect.addEventListener('change', e => {
    activeRango = e.target.value;
    drawChart();
  });
}

// Resize con debounce
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resizeCanvas, 80);
});


// ================================================================
//  SECCIÓN 12 — INICIALIZACIÓN
// ================================================================
window.addEventListener('load', () => {
  resizeCanvas();       // Dibuja la gráfica ajustada al DPI
  animateDonut(0);      // Anima el donut desde 0 (se actualiza con Firebase)
  updateTabColors();    // Colorea la pestaña activa inicial

  // Primera carga de datos
  fetchActual();
  cargarHistorial();

  // Polling automático:
  // · Datos actuales  → cada 3 segundos
  // · Historial       → cada 10 segundos
  setInterval(fetchActual,      3_000);
  setInterval(cargarHistorial,  10_000);

  setInterval(() => {
    const el = document.getElementById('liveTime');
    if (el) el.textContent = new Date().toTimeString().slice(0, 8);
  }, 1000);
});