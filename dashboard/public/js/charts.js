/* Canvas-based chart components */

const COLORS = {
  green: '#3fb950',
  blue: '#58a6ff',
  purple: '#bc8cff',
  orange: '#d29922',
  red: '#f85149',
  cyan: '#39d2c0',
  muted: '#484f58',
  border: '#30363d',
  bg: '#0d1117',
};

const MODEL_COLORS = {
  'claude-opus-4-6': COLORS.purple,
  'claude-sonnet-4-6': COLORS.blue,
  'claude-haiku-4-5': COLORS.green,
  'unknown': COLORS.muted,
};

/**
 * Draw a sparkline on a canvas element.
 */
function drawSparkline(canvas, data, color = COLORS.blue) {
  if (!canvas || !data || data.length === 0) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pad = 2;

  ctx.clearRect(0, 0, w, h);

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const stepX = (w - pad * 2) / Math.max(data.length - 1, 1);

  // Gradient fill
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, color + '40');
  gradient.addColorStop(1, color + '05');

  // Fill area
  ctx.beginPath();
  ctx.moveTo(pad, h - pad);
  for (let i = 0; i < data.length; i++) {
    const x = pad + i * stepX;
    const y = h - pad - ((data[i] - min) / range) * (h - pad * 2);
    if (i === 0) ctx.lineTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.lineTo(pad + (data.length - 1) * stepX, h - pad);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Line
  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const x = pad + i * stepX;
    const y = h - pad - ((data[i] - min) / range) * (h - pad * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Latest value dot
  if (data.length > 0) {
    const lastX = pad + (data.length - 1) * stepX;
    const lastY = h - pad - ((data[data.length - 1] - min) / range) * (h - pad * 2);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

/**
 * Draw a semicircle gauge for context window usage.
 */
function drawGauge(canvas, percent, label) {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const cx = w / 2;
  const cy = h - 10;
  const radius = Math.min(cx - 10, cy - 10);
  const lineWidth = 12;

  ctx.clearRect(0, 0, w, h);

  // Background arc
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI, 0);
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Value arc
  const clampedPct = Math.min(100, Math.max(0, percent));
  const endAngle = Math.PI + (clampedPct / 100) * Math.PI;
  let gaugeColor = COLORS.green;
  if (clampedPct > 80) gaugeColor = COLORS.red;
  else if (clampedPct > 60) gaugeColor = COLORS.orange;
  else if (clampedPct > 40) gaugeColor = COLORS.blue;

  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI, endAngle);
  ctx.strokeStyle = gaugeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Center text
  ctx.fillStyle = COLORS.green;
  ctx.font = 'bold 18px ' + getComputedStyle(document.body).fontFamily;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = gaugeColor;
  ctx.fillText(clampedPct.toFixed(1) + '%', cx, cy - 4);
}

/**
 * Draw a donut chart for model distribution.
 */
function drawDonut(canvas, data) {
  if (!canvas || !data) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const cx = w / 2;
  const cy = h / 2;
  const outerR = Math.min(cx, cy) - 4;
  const innerR = outerR * 0.6;

  ctx.clearRect(0, 0, w, h);

  const entries = Object.entries(data);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) {
    // Empty state
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
    ctx.fillStyle = COLORS.border;
    ctx.fill();
    return;
  }

  let startAngle = -Math.PI / 2;
  for (const [model, count] of entries) {
    const slice = (count / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
    ctx.arc(cx, cy, innerR, startAngle + slice, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = MODEL_COLORS[model] || COLORS.muted;
    ctx.fill();
    startAngle += slice;
  }
}

/**
 * Draw a bar chart for historical daily data.
 */
function drawBarChart(canvas, daily) {
  if (!canvas || !daily || daily.length === 0) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const padBottom = 20;
  const padTop = 8;
  const padSide = 4;

  ctx.clearRect(0, 0, w, h);

  // Show last 14 days
  const recent = daily.slice(0, 14).reverse();
  if (recent.length === 0) return;

  const maxTokens = Math.max(...recent.map(d => d.inputTokens + d.outputTokens + d.cacheRead), 1);
  const barWidth = Math.max(4, (w - padSide * 2) / recent.length - 3);
  const gap = 3;

  for (let i = 0; i < recent.length; i++) {
    const d = recent[i];
    const total = d.inputTokens + d.outputTokens + d.cacheRead;
    const barH = (total / maxTokens) * (h - padBottom - padTop);
    const x = padSide + i * (barWidth + gap);
    const y = h - padBottom - barH;

    // Stacked bar: input (blue) + output (purple) + cache (green)
    const inputH = (d.inputTokens / (total || 1)) * barH;
    const outputH = (d.outputTokens / (total || 1)) * barH;
    const cacheH = (d.cacheRead / (total || 1)) * barH;

    ctx.fillStyle = COLORS.blue;
    ctx.fillRect(x, y, barWidth, inputH);
    ctx.fillStyle = COLORS.purple;
    ctx.fillRect(x, y + inputH, barWidth, outputH);
    ctx.fillStyle = COLORS.green + '80';
    ctx.fillRect(x, y + inputH + outputH, barWidth, cacheH);

    // Date label (every other)
    if (i % 2 === 0 && d.date) {
      ctx.fillStyle = COLORS.muted;
      ctx.font = '9px ' + getComputedStyle(document.body).fontFamily;
      ctx.textAlign = 'center';
      ctx.fillText(d.date.slice(5), x + barWidth / 2, h - 4);
    }
  }
}
