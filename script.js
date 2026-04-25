// ── Referencias al DOM ──────────────────────────────────────────
const canvas = document.getElementById('histCanvas'); // <canvas> de la gráfica
const ctx    = canvas.getContext('2d'); // Contexto 2D para dibujo

// ================================================================
//  SECCIÓN 1 — DATASETS
//  Cada clave corresponde a una métrica seleccionable en las tabs.
//  Estructura de cada entrada:
//    · label    → nombre visible en la UI
//    · unit     → unidad de medida
//    · yMin/yMax → rango del eje Y (define la escala de la gráfica)
//    · yTicks   → valores donde se dibujan las líneas de cuadrícula
//    · colorA/B → gradiente de la línea y el área (A=claro, B=oscuro)
//    · capColor → color de fondo del indicador de punto máximo (no en uso activo)
//    · data1h / data3h / data6h → 12 muestras para cada rango temporal
// ================================================================

const DATASETS = {
  temp: {
    label: 'Temperatura',
    unit: '°C',
    yMin: 24.8, yMax: 27.9,
    yTicks: [24.8, 25.7, 26.7, 27.7],
    colorA: '#FF8C00', colorB: '#E63A00', capColor: '#7B3FE4',
    data1h:  [25.7, 26.1, 25.9, 27.2, 26.5, 27.5, 26.2, 25.8, 27.1, 26.7, 25.5, 26.9],
    data3h:  [25.2, 25.9, 26.4, 25.7, 26.1, 27.0, 26.6, 25.4, 26.8, 27.2, 25.9, 26.3],
    data6h:  [24.9, 25.3, 25.8, 26.2, 25.5, 26.0, 26.7, 25.1, 25.6, 26.4, 25.8, 26.9],
  },
  hum: {
    label: 'Humedad',
    unit: '%',
    yMin: 30, yMax: 70,
    yTicks: [30, 40, 50, 60, 70],
    colorA: '#4E9AF1', colorB: '#A855F7', capColor: '#1E3A5F',
    data1h:  [45, 47, 43, 50, 48, 52, 47, 44, 49, 46, 51, 47],
    data3h:  [42, 44, 47, 46, 43, 48, 50, 45, 47, 44, 49, 46],
    data6h:  [38, 41, 44, 46, 43, 40, 45, 47, 42, 44, 46, 43],
  },
  pm1: {
    label: 'PM 1.0',
    unit: 'µg',
    yMin: 0, yMax: 50,
    yTicks: [0, 12, 25, 37, 50],
    colorA: '#3DD17A', colorB: '#1A7A45', capColor: '#0D3520',
    data1h:  [10, 14, 12, 18, 15, 22, 17, 13, 19, 16, 11, 14],
    data3h:  [8, 11, 15, 13, 10, 16, 18, 12, 14, 11, 17, 13],
    data6h:  [6, 9, 12, 10, 8, 13, 15, 10, 11, 8, 14, 10],
  },
  pm25: {
    label: 'PM 2.5',
    unit: 'µg',
    yMin: 0, yMax: 60,
    yTicks: [0, 15, 30, 45, 60],
    colorA: '#FFC83C', colorB: '#CC8800', capColor: '#5A3A00',
    data1h:  [20, 25, 22, 30, 26, 35, 28, 21, 32, 27, 19, 24],
    data3h:  [15, 20, 25, 22, 18, 28, 31, 20, 24, 19, 29, 22],
    data6h:  [10, 16, 21, 18, 14, 22, 26, 17, 19, 15, 23, 18],
  },
  pm10: {
    label: 'PM 10',
    unit: 'µg',
    yMin: 0, yMax: 80,
    yTicks: [0, 20, 40, 60, 80],
    colorA: '#FF4B4B', colorB: '#CC0000', capColor: '#5A0000',
    data1h:  [35, 42, 38, 50, 44, 58, 46, 36, 52, 45, 33, 40],
    data3h:  [28, 35, 42, 38, 30, 46, 52, 34, 40, 32, 48, 37],
    data6h:  [20, 28, 35, 30, 24, 38, 44, 28, 32, 25, 40, 30],
  },
};


// ================================================================
//  SECCIÓN 2 — ETIQUETAS DEL EJE X
//  Cada arreglo contiene 12 etiquetas que corresponden a los
//  12 puntos de datos de cada dataset según el rango seleccionado.
// ================================================================

// Rango 1h → intervalos de 5 minutos dentro de la primera hora
const LABELS_1H  = ['00','05','10','15','20','25','30','35','40','45','50','55'].map(m=>`0:${m}`);

// Rango 3h → intervalos de 30 minutos (7:00 a 12:30)
const LABELS_3H  = ['7:00','7:30','8:00','8:30','9:00','9:30','10:00','10:30','11:00','11:30','12:00','12:30'];

// Rango 6h → intervalos de 1 hora (6:00 a 17:00)
const LABELS_6H  = ['6:00','7:00','8:00','9:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];

// ── Estado activo (controlado por tabs y select) ─────────────────
let activeMetric = 'temp'; // Métrica actualmente seleccionada
let activeRango  = '1h'; // Rango de tiempo actualmente seleccionado


// ── Helpers de selección ─────────────────────────────────────────
 
/**
 * Devuelve el arreglo de etiquetas del eje X según el rango.
 * @param {string} rango - '1h' | '3h' | '6h'
 * @returns {string[]}
 */
function getLabels(rango) {
  if (rango === '1h') return LABELS_1H;
  if (rango === '3h') return LABELS_3H;
  return LABELS_6H;
}


/**
 * Devuelve el arreglo de datos de una métrica para el rango dado.
 * @param {string} metric - clave de DATASETS ('temp', 'hum', 'pm1', 'pm25', 'pm10')
 * @param {string} rango  - '1h' | '3h' | '6h'
 * @returns {number[]}
 */
function getData(metric, rango) {
  const ds = DATASETS[metric];
  if (rango === '1h') return ds.data1h;
  if (rango === '3h') return ds.data3h;
  return ds.data6h;
}

// ================================================================
//  SECCIÓN 3 — RENDERIZADO DE LA GRÁFICA
//  Gráfica de línea con área rellena, puntos de datos y cuadrícula.
//  Se llama cada vez que cambia la métrica, el rango, o el tamaño.
// ================================================================
function drawChart() {
  const W = canvas.width; // Ancho real del canvas (en px físicos)
  const H = canvas.height; // Alto  real del canvas (en px físicos)
  ctx.clearRect(0, 0, W, H); // Limpia el frame anterior

  const ds     = DATASETS[activeMetric];
  const data   = getData(activeMetric, activeRango);
  const labels = getLabels(activeRango);

    // ── Márgenes internos del área de dibujo ──────────────────────
  const PAD_L  = 44; // Espacio para etiquetas del eje Y
  const PAD_R  = 16; // Margen derecho
  const PAD_T  = 14; // Margen superior
  const PAD_B  = 34; // Espacio para etiquetas del eje X
  const chartW = W - PAD_L - PAD_R; // Ancho útil de la gráfica
  const chartH = H - PAD_T - PAD_B; // Alto útil de la gráfica

  const yMin = ds.yMin, yMax = ds.yMax;

  // ── Fondo del canvas ──────────────────────────────────────────
  ctx.fillStyle = '#0D1525';
  roundRect(ctx, 0, 0, W, H, 10); // Esquinas redondeadas
  ctx.fill();

  // ── Cuadrícula horizontal (líneas de referencia del eje Y) ────
  ctx.setLineDash([3, 5]); // Líneas punteadas
  ctx.lineWidth = 1;

  ds.yTicks.forEach(tick => {

    // Línea horizontal de cuadrícula
    const y = PAD_T + chartH - ((tick - yMin) / (yMax - yMin)) * chartH;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.moveTo(PAD_L, y);
    ctx.lineTo(PAD_L + chartW, y);
    ctx.stroke();


        // Etiqueta numérica a la izquierda de la línea
    ctx.fillStyle = 'rgba(160,170,195,0.7)';
    ctx.font = '10px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(tick, PAD_L - 6, y);
  });
  ctx.setLineDash([]); // Restaura línea sólida
 

  // ── Cálculo de coordenadas de los puntos ──────────────────────
  const n     = data.length;
   // slotW: distancia horizontal entre puntos consecutivos
  // Se usa n-1 para que el primer y último punto toquen los bordes  const slotW = chartW / (n > 1 ? n - 1 : 1); 
  const slotW = chartW / (n > 1 ? n - 1 : 1);

  
  const points = data.map((val, i) => {

        // Normaliza el valor al rango [0, chartH] y lo invierte (Y crece hacia abajo)
    const normH = ((val - yMin) / (yMax - yMin)) * chartH; // Clampea para no salir del área
    return {
      x: PAD_L + i * slotW,
      y: Math.max(PAD_T, PAD_T + chartH - normH)
    };
  });

  if (points.length > 0) {

    // ── Paso 1: Área rellena bajo la línea ──────────────────────
    ctx.beginPath();
    ctx.moveTo(points[0].x, PAD_T + chartH); // Esquina inferior izquierda
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[n - 1].x, PAD_T + chartH); // Esquina inferior derecha
    ctx.closePath();


        // Gradiente vertical: colorA semitransparente arriba → transparente abajo
    const fillGrad = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + chartH);
    fillGrad.addColorStop(0, ds.colorA + '55'); // 33% opacidad
    fillGrad.addColorStop(1, ds.colorA + '00'); // 0% opacidad 
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // ── Paso 2: Línea principal con efecto neón ──────────────────
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));

    ctx.lineWidth = 3.5;
    ctx.strokeStyle = ds.colorA;
    // Sombra difusa que simula brillo neón
    ctx.shadowColor = ds.colorA;
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Resetea la sombra para que no afecte los puntos ni las etiquetas
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // ── Paso 3: Puntos de dato sobre la línea ───────────────────
    // Cada punto es un círculo "hueco": fondo del card + borde de color
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#0C1220'; // Color de fondo del card para efecto "punched"
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = ds.colorA;
      ctx.stroke();
    });
  }

  // ── Etiquetas del eje X ───────────────────────────────────────
  ctx.fillStyle = 'rgba(90,100,130,0.9)';
  ctx.font      = '9px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

    // Si hay más de 8 puntos, muestra una etiqueta de cada dos para evitar solapamiento
  const step = n > 8 ? 2 : 1;
  labels.forEach((lbl, i) => {
    if (i % step !== 0) return;
    const x = PAD_L + i * slotW;
    ctx.fillText(lbl, x, PAD_T + chartH + 10);
  });
}


// ================================================================
//  SECCIÓN 4 — FUNCIÓN AUXILIAR: roundRect
//  Traza un rectángulo con esquinas redondeadas en el contexto 2D.
//  No existe de forma nativa en todos los navegadores, por eso
//  se implementa manualmente con quadraticCurveTo.
//
//  Parámetros:
//    ctx          → CanvasRenderingContext2D
//    x, y         → esquina superior izquierda
//    w, h         → ancho y alto
//    r            → radio de las esquinas
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


// ================================================================
//  SECCIÓN 5 — RESIZE CON SOPORTE DPI
//  El canvas HTML tiene dos "tamaños":
//    · Tamaño lógico (CSS): cuántos px ocupa visualmente
//    · Tamaño físico (atributos width/height): resolución del buffer
//  En pantallas Retina (devicePixelRatio > 1) hay que escalar el
//  buffer para evitar que la gráfica se vea borrosa.
// ================================================================
function resizeCanvas() {
  const wrap  = canvas.parentElement; // Contenedor .chart-wrap
  const dpr   = window.devicePixelRatio || 1; // 2 en Retina, 1 en pantallas normales
  const rect  = wrap.getBoundingClientRect();

    // Buffer físico = tamaño visual × DPR
  canvas.width  = rect.width  * dpr;
  canvas.height = rect.height * dpr;

    // Escala el contexto para que las coordenadas de dibujo sigan siendo lógicas
  ctx.scale(dpr, dpr);

    // Tamaño CSS: igual al contenedor para que ocupe exactamente el espacio
  canvas.style.width  = rect.width  + 'px';
  canvas.style.height = rect.height + 'px';
  drawChart(); // Redibuja con las nuevas dimensiones
}

// ================================================================
//  SECCIÓN 6 — ANIMACIÓN DEL DONUT (SVG)
//  El arco del donut usa stroke-dasharray para definir qué porción
//  del círculo se pinta.
//
//  Fórmula:
//    circunferencia = 2π × r  →  2π × 78 ≈ 490 px
//    longitud activa = (porcentaje / 100) × circunferencia
//
//  La animación:
//    1. Desactiva la transición CSS y pone el arco en 0
//    2. Tras un frame y 400ms de delay, reactiva la transición
//       y aplica el valor real → efecto "fill" animado
// ================================================================
function animateDonut() {
  const arc  = document.getElementById('donutArc');
  if(!arc) return;
  const circ = 2 * Math.PI * 78;  // Circunferencia total ≈ 490 px
  const val  = 47; // Porcentaje de calidad del aire (AQI)
  const dash = (val / 100) * circ; // Longitud del arco activo
  // Start from 0


    // Fuerza el estado inicial sin animación
  arc.style.transition = 'none';
  arc.setAttribute('stroke-dasharray', `0 ${circ}`);

    // En el siguiente frame reactiva la transición y aplica el valor final
  requestAnimationFrame(() => {
    setTimeout(() => {
      arc.style.transition = 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)';
      arc.setAttribute('stroke-dasharray', `${dash} ${circ}`);
    }, 400); // Delay de 400ms antes de iniciar la animación
  });
}

// ================================================================
//  SECCIÓN 7 — COLORES DINÁMICOS DE LAS PESTAÑAS
//  Cuando el usuario cambia de métrica, el botón activo adopta
//  el color (colorA) de esa métrica.
//  Además, ese color se inyecta como variable CSS global
//  (--active-color) para que otros elementos (ej: el indicador
//  del select de rango) también puedan usarlo.
// ================================================================
function updateTabColors() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.classList.contains('active')) {
      // 1. Extraemos el color de la gráfica actual
      const metric = btn.dataset.metric; // Lee el atributo data-metric del botón
      const color = DATASETS[metric].colorA;
      
            // Colorea el botón activo
      btn.style.backgroundColor = color;
      btn.style.borderColor = color;
      
      // Propaga el color al sistema CSS para otros componentes
      document.documentElement.style.setProperty('--active-color', color);
      
    } else {
      // Botones inactivos → estilo por defecto (transparente con borde normal)
      btn.style.backgroundColor = 'transparent';
      btn.style.borderColor = 'var(--border)';
    }
  });
}


// ================================================================
//  SECCIÓN 8 — EVENT LISTENERS
// ================================================================
 
// ── Tabs de métricas ─────────────────────────────────────────────
// Al hacer clic en una pestaña:
//   1. Quita la clase 'active' de todas las pestañas
//   2. Agrega 'active' a la pestaña clicada
//   3. Actualiza activeMetric y redibuja la gráfica con nuevos colores
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeMetric = btn.dataset.metric;
    
    updateTabColors(); // Sincroniza colores de pestañas y variable CSS
    drawChart();       // Redibuja la gráfica con la nueva métrica
  });
});


// ── Select de rango temporal ─────────────────────────────────────
// Al cambiar el select, actualiza activeRango y redibuja la gráfica
const rangoSelect = document.getElementById('rangoSelect');
if(rangoSelect) {
  rangoSelect.addEventListener('change', e => {
    activeRango = e.target.value; // '1h', '3h' o '6h'
    drawChart();
  });
}


// ================================================================
//  SECCIÓN 9 — INICIALIZACIÓN
// ================================================================
 
// Redibuja la gráfica al redimensionar la ventana.
// El debounce de 80ms evita llamadas excesivas durante el drag del borde.  
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resizeCanvas, 80);
});


// Al cargar la página por primera vez:
//   · resizeCanvas  → ajusta el buffer DPI y dibuja la gráfica inicial
//   · animateDonut  → lanza la animación de entrada del donut SVG
//   · updateTabColors → colorea la pestaña activa por defecto ('temp')
window.addEventListener('load', () => {
  resizeCanvas();
  animateDonut();
  updateTabColors(); // Nos aseguramos de pintar el botón correcto al cargar la página
});