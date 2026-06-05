/* ═══════════════════════════════════════════════════════════
   Hypothesis Testing Tool — app.js
   C8: Manual mode with interactive normal curve
   C9: CSV upload with automatic hypothesis test
   ═══════════════════════════════════════════════════════════ */

/* ── Statistical helpers ────────────────────────────────── */

// Standard normal PDF
function normalPDF(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Standard normal CDF via Hart approximation (accurate to 7 sig. figures)
function normalCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const pdf  = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const cdf  = 1 - pdf * poly;
  return x >= 0 ? cdf : 1 - cdf;
}

function normalInvCDF(p) {
  // Beasley-Springer-Moro approximation
  const a = [0, -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [0, -5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [0, -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
    4.374664141464968e+00, 2.938163982698783e+00];
  const d = [0, 7.784695709041462e-03, 3.224671290700398e-01,
    2.445134137142996e+00, 3.754408661907416e+00];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q, r;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[1]*q+c[2])*q+c[3])*q+c[4])*q+c[5])*q+c[6]) /
           ((((d[1]*q+d[2])*q+d[3])*q+d[4])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5; r = q * q;
    return (((((a[1]*r+a[2])*r+a[3])*r+a[4])*r+a[5])*r+a[6])*q /
           (((((b[1]*r+b[2])*r+b[3])*r+b[4])*r+b[5])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[1]*q+c[2])*q+c[3])*q+c[4])*q+c[5])*q+c[6]) /
             ((((d[1]*q+d[2])*q+d[3])*q+d[4])*q+1);
  }
}

function pValue(z, tail) {
  const upper = 1 - normalCDF(z);
  const lower = normalCDF(z);
  if (tail === 'left')  return lower;
  if (tail === 'right') return upper;
  return 2 * Math.min(upper, lower);
}

function criticalValue(alpha, tail) {
  if (tail === 'left')  return normalInvCDF(alpha);
  if (tail === 'right') return normalInvCDF(1 - alpha);
  return normalInvCDF(1 - alpha / 2); // positive crit for two-tailed
}

/* ── Normal curve canvas rendering ─────────────────────── */

function drawNormalCurve(canvas, z, pval, alpha, tail) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { top: 30, right: 30, bottom: 50, left: 30 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = '#13161f';
  ctx.fillRect(0, 0, W, H);

  const zMin = -4, zMax = 4;
  const xToCanvas = x => pad.left + ((x - zMin) / (zMax - zMin)) * chartW;
  const yToCanvas = y => pad.top + chartH - (y / 0.42) * chartH;

  // Draw shaded region(s)
  function shadePath(xStart, xEnd, color) {
    ctx.beginPath();
    ctx.moveTo(xToCanvas(xStart), yToCanvas(0));
    const steps = 200;
    for (let i = 0; i <= steps; i++) {
      const xi = xStart + (xEnd - xStart) * (i / steps);
      ctx.lineTo(xToCanvas(xi), yToCanvas(normalPDF(xi)));
    }
    ctx.lineTo(xToCanvas(xEnd), yToCanvas(0));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  const pColor = 'rgba(232,255,71,0.35)';

  if (tail === 'left') {
    shadePath(zMin, Math.max(zMin, z), pColor);
  } else if (tail === 'right') {
    shadePath(Math.min(zMax, z), zMax, pColor);
  } else {
    const absZ = Math.abs(z);
    shadePath(zMin, -absZ, pColor);
    shadePath(absZ, zMax, pColor);
  }

  // Critical region outline
  const cv = criticalValue(alpha, tail);
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#ff6b6b';
  ctx.lineWidth = 1.5;
  if (tail === 'left') {
    ctx.beginPath(); ctx.moveTo(xToCanvas(cv), pad.top); ctx.lineTo(xToCanvas(cv), pad.top + chartH); ctx.stroke();
  } else if (tail === 'right') {
    ctx.beginPath(); ctx.moveTo(xToCanvas(cv), pad.top); ctx.lineTo(xToCanvas(cv), pad.top + chartH); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(xToCanvas(cv), pad.top); ctx.lineTo(xToCanvas(cv), pad.top + chartH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xToCanvas(-cv), pad.top); ctx.lineTo(xToCanvas(-cv), pad.top + chartH); ctx.stroke();
  }
  ctx.setLineDash([]);

  // Normal curve
  ctx.beginPath();
  for (let i = 0; i <= 400; i++) {
    const xi = zMin + (zMax - zMin) * (i / 400);
    const yi = normalPDF(xi);
    const cx = xToCanvas(xi), cy = yToCanvas(yi);
    i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
  }
  ctx.strokeStyle = '#47c9ff';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Baseline
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top + chartH);
  ctx.lineTo(pad.left + chartW, pad.top + chartH);
  ctx.strokeStyle = '#2a2f45';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Observed z line
  const clampedZ = Math.max(zMin + 0.05, Math.min(zMax - 0.05, z));
  ctx.beginPath();
  ctx.moveTo(xToCanvas(clampedZ), pad.top);
  ctx.lineTo(xToCanvas(clampedZ), pad.top + chartH);
  ctx.strokeStyle = '#e8ff47';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Labels
  ctx.font = '11px IBM Plex Mono, monospace';
  ctx.textAlign = 'center';

  // z label
  ctx.fillStyle = '#e8ff47';
  ctx.fillText(`z = ${z.toFixed(3)}`, xToCanvas(clampedZ), pad.top + chartH + 18);

  // critical value label
  ctx.fillStyle = '#ff6b6b';
  if (tail !== 'two') {
    ctx.fillText(`z_c = ${cv.toFixed(3)}`, xToCanvas(cv), pad.top + chartH + 35);
  } else {
    ctx.fillText(`±${cv.toFixed(3)}`, xToCanvas(cv), pad.top + chartH + 35);
  }

  // p-value label
  ctx.fillStyle = '#e8ff47';
  ctx.font = '13px IBM Plex Mono, monospace';
  ctx.fillText(`p = ${pval.toFixed(4)}`, W / 2, pad.top + 18);

  // axis ticks
  ctx.fillStyle = '#7a82a0';
  ctx.font = '10px IBM Plex Mono, monospace';
  [-3, -2, -1, 0, 1, 2, 3].forEach(t => {
    ctx.fillText(t, xToCanvas(t), pad.top + chartH + 18);
  });
}

/* ── Pair: slider ↔ input box ───────────────────────────── */
function linkSliderBox(sliderId, boxId, callback) {
  const slider = document.getElementById(sliderId);
  const box    = document.getElementById(boxId);
  if (!slider || !box) return;
  slider.addEventListener('input', () => { box.value = slider.value; callback(); });
  box.addEventListener('input', () => {
    let v = parseFloat(box.value);
    if (isNaN(v)) return;
    v = Math.max(parseFloat(slider.min), Math.min(parseFloat(slider.max), v));
    slider.value = v; box.value = v; callback();
  });
}

/* ── Toggle group helper ────────────────────────────────── */
function setupToggleGroup(groupId, onChange) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(btn.dataset);
    });
  });
}

function getActiveToggle(groupId, attr) {
  const group = document.getElementById(groupId);
  const active = group && group.querySelector('.toggle-btn.active');
  return active ? active.dataset[attr] : null;
}

/* ═══════════════════════ C8 LOGIC ════════════════════════ */

function computeC8() {
  const mode  = getActiveToggle('modeToggle', 'mode');
  const tail  = getActiveToggle('tailToggle', 'tail');
  const alpha = parseFloat(document.getElementById('alphaBox').value) || 0.05;
  let z;

  if (mode === 'proportion') {
    const p0   = parseFloat(document.getElementById('p0Box').value)   || 0.5;
    const phat = parseFloat(document.getElementById('phatBox').value) || 0.55;
    const n    = parseFloat(document.getElementById('nPropBox').value)|| 100;
    const se   = Math.sqrt(p0 * (1 - p0) / n);
    z = (phat - p0) / se;
  } else {
    const mu0   = parseFloat(document.getElementById('mu0Box').value)   || 100;
    const xbar  = parseFloat(document.getElementById('xbarBox').value)  || 105;
    const sigma = parseFloat(document.getElementById('sigmaBox').value) || 15;
    const n     = parseFloat(document.getElementById('nMeanBox').value) || 50;
    const se    = sigma / Math.sqrt(n);
    z = (xbar - mu0) / se;
  }

  const pval = pValue(z, tail);
  const cv   = criticalValue(alpha, tail);
  const reject = pval < alpha;

  // Update stats
  document.getElementById('resZ').textContent     = z.toFixed(4);
  document.getElementById('resPval').textContent  = pval.toFixed(4);
  document.getElementById('resCrit').textContent  = tail === 'two' ? `±${cv.toFixed(4)}` : cv.toFixed(4);
  document.getElementById('resAlpha').textContent = alpha.toFixed(2);

  const decBox  = document.getElementById('decisionBox');
  const decLabel= document.getElementById('decisionLabel');
  decBox.className = 'decision-box ' + (reject ? 'reject' : 'fail');
  decLabel.textContent = reject ? 'Reject H₀' : 'Fail to Reject H₀';

  const concText = document.getElementById('conclusionText');
  if (reject) {
    concText.textContent = `At α = ${alpha}, there is sufficient statistical evidence to reject the null hypothesis (z = ${z.toFixed(3)}, p = ${pval.toFixed(4)}). The sample data supports the alternative hypothesis.`;
  } else {
    concText.textContent = `At α = ${alpha}, there is insufficient statistical evidence to reject the null hypothesis (z = ${z.toFixed(3)}, p = ${pval.toFixed(4)}). We fail to reject H₀ based on the available data.`;
  }

  const canvas = document.getElementById('normalCanvas');
  drawNormalCurve(canvas, z, pval, alpha, tail);
}

function initC8() {
  // Mode toggle
  setupToggleGroup('modeToggle', ({mode}) => {
    document.getElementById('proportionParams').classList.toggle('hidden', mode !== 'proportion');
    document.getElementById('meanParams').classList.toggle('hidden', mode !== 'mean');
    computeC8();
  });

  // Tail toggle
  setupToggleGroup('tailToggle', () => computeC8());

  // Sliders and boxes
  ['alpha','p0','phat','nProp','mu0','xbar','sigma','nMean'].forEach(id => {
    linkSliderBox(id + 'Slider', id + 'Box', computeC8);
  });

  computeC8();
}

/* ═══════════════════════ C9 LOGIC ════════════════════════ */

let csvData = null;

function parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const obj = {};
    headers.forEach((h, i) => obj[h] = vals[i]);
    return obj;
  });
  return { headers, rows };
}

function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function variance(arr) {
  const m = mean(arr);
  return arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1);
}
function stddev(arr) { return Math.sqrt(variance(arr)); }

function populateColumnSelects(headers) {
  const groupSel = document.getElementById('groupColSelect');
  const valueSel = document.getElementById('valueColSelect');
  groupSel.innerHTML = valueSel.innerHTML = '';
  headers.forEach(h => {
    groupSel.appendChild(new Option(h, h));
    valueSel.appendChild(new Option(h, h));
  });
  // Guess: last col is value for mean; "group" col is first
  if (headers.length >= 2) {
    groupSel.value = headers[0];
    valueSel.value = headers[headers.length - 1];
  }
  updateGroupOptions();
}

function updateGroupOptions() {
  if (!csvData) return;
  const groupCol = document.getElementById('groupColSelect').value;
  const groups = [...new Set(csvData.rows.map(r => r[groupCol]))].filter(Boolean);
  const selA = document.getElementById('groupASelect');
  const selB = document.getElementById('groupBSelect');
  selA.innerHTML = selB.innerHTML = '';
  groups.forEach(g => {
    selA.appendChild(new Option(g, g));
    selB.appendChild(new Option(g, g));
  });
  if (groups.length >= 2) selB.value = groups[1];
}

function showSummary(groupName, vals) {
  return `<tr><td>${groupName}</td><td>${vals.length}</td><td>${mean(vals).toFixed(4)}</td><td>${stddev(vals).toFixed(4)}</td><td>${Math.min(...vals).toFixed(4)}</td><td>${Math.max(...vals).toFixed(4)}</td></tr>`;
}

function runCSVTest() {
  if (!csvData) return;
  const groupCol = document.getElementById('groupColSelect').value;
  const valueCol = document.getElementById('valueColSelect').value;
  const groupA   = document.getElementById('groupASelect').value;
  const groupB   = document.getElementById('groupBSelect').value;
  const tail     = getActiveToggle('csvTailToggle', 'tail') || 'two';
  const alpha    = parseFloat(document.getElementById('csvAlphaBox').value) || 0.05;

  // Determine type: if value column has only 0/1 → proportion test
  const allVals = csvData.rows.map(r => r[valueCol]).filter(v => v !== undefined && v !== '');
  const isBinary = allVals.every(v => v === '0' || v === '1');

  const getVals = (group) => csvData.rows
    .filter(r => r[groupCol] === group)
    .map(r => parseFloat(r[valueCol]))
    .filter(v => !isNaN(v));

  const valsA = getVals(groupA);
  const valsB = getVals(groupB);

  if (valsA.length < 2 || valsB.length < 2) {
    alert('Not enough data in one or both groups. Check your column selections.'); return;
  }

  let z, summaryHTML;

  if (isBinary) {
    // Proportion test: group B (test) vs group A (benchmark)
    const p0   = mean(valsA); // benchmark proportion
    const phat = mean(valsB); // sample proportion
    const n    = valsB.length;
    const se   = Math.sqrt(p0 * (1 - p0) / n);
    z = (phat - p0) / se;

    summaryHTML = `<table class="summary-table"><thead><tr><th>Group</th><th>n</th><th>Proportion</th></tr></thead><tbody>
      <tr><td>${groupA} (benchmark)</td><td>${valsA.length}</td><td>${mean(valsA).toFixed(4)}</td></tr>
      <tr><td>${groupB} (test)</td><td>${valsB.length}</td><td>${mean(valsB).toFixed(4)}</td></tr>
    </tbody></table>`;
  } else {
    // Mean test: two-sample z-test
    const xbarA = mean(valsA), sdA = stddev(valsA), nA = valsA.length;
    const xbarB = mean(valsB), sdB = stddev(valsB), nB = valsB.length;
    const se = Math.sqrt(sdA * sdA / nA + sdB * sdB / nB);
    z = (xbarB - xbarA) / se;

    summaryHTML = `<table class="summary-table"><thead><tr><th>Group</th><th>n</th><th>Mean</th><th>SD</th><th>Min</th><th>Max</th></tr></thead><tbody>
      ${showSummary(groupA + ' (benchmark)', valsA)}
      ${showSummary(groupB + ' (test)', valsB)}
    </tbody></table>`;
  }

  const pval   = pValue(z, tail);
  const cv     = criticalValue(alpha, tail);
  const reject = pval < alpha;

  document.getElementById('csvSummary').innerHTML = summaryHTML;
  document.getElementById('csvResZ').textContent     = z.toFixed(4);
  document.getElementById('csvResPval').textContent  = pval.toFixed(4);
  document.getElementById('csvResCrit').textContent  = tail === 'two' ? `±${cv.toFixed(4)}` : cv.toFixed(4);
  document.getElementById('csvResAlpha').textContent = alpha.toFixed(2);

  const decBox   = document.getElementById('csvDecisionBox');
  const decLabel = document.getElementById('csvDecisionLabel');
  decBox.className = 'decision-box ' + (reject ? 'reject' : 'fail');
  decLabel.textContent = reject ? 'Reject H₀' : 'Fail to Reject H₀';

  document.getElementById('csvConclusionText').textContent = reject
    ? `At α = ${alpha}, the data provides sufficient evidence to reject the null hypothesis (z = ${z.toFixed(3)}, p = ${pval.toFixed(4)}). Group "${groupB}" significantly differs from group "${groupA}".`
    : `At α = ${alpha}, the data does not provide sufficient evidence to reject the null hypothesis (z = ${z.toFixed(3)}, p = ${pval.toFixed(4)}). No significant difference was found between groups.`;

  document.getElementById('csvChartCard').classList.remove('hidden');
  document.getElementById('csvResultsCard').classList.remove('hidden');

  const canvas = document.getElementById('csvCanvas');
  drawNormalCurve(canvas, z, pval, alpha, tail);
}

function initC9() {
  const fileInput = document.getElementById('csvFile');
  const uploadZone = document.getElementById('uploadZone');

  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      csvData = parseCSV(ev.target.result);
      populateColumnSelects(csvData.headers);
      document.getElementById('csvConfigCard').classList.remove('hidden');
      document.getElementById('csvSummary').innerHTML = '<p class="placeholder">Configure columns and click Run.</p>';
    };
    reader.readAsText(file);
  });

  uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag'));
  uploadZone.addEventListener('drop', e => {
    e.preventDefault(); uploadZone.classList.remove('drag');
    const file = e.dataTransfer.files[0];
    if (!file || !file.name.endsWith('.csv')) return;
    fileInput.files = e.dataTransfer.files;
    fileInput.dispatchEvent(new Event('change'));
  });

  document.getElementById('groupColSelect').addEventListener('change', updateGroupOptions);

  setupToggleGroup('csvTailToggle', () => {});

  linkSliderBox('csvAlphaSlider', 'csvAlphaBox', () => {});

  document.getElementById('runCsvTest').addEventListener('click', runCSVTest);

  // Example download buttons
  document.getElementById('dlMean').addEventListener('click', () => downloadCSV(meanExampleCSV(), 'G11_T3_L4_C8C9_example_mean_data.csv'));
  document.getElementById('dlProp').addEventListener('click', () => downloadCSV(propExampleCSV(), 'G11_T3_L4_C8C9_example_proportion_data.csv'));
}

/* ── Generate example CSV data inline ──────────────────── */
function seededRandom(seed) {
  // Simple seeded PRNG (mulberry32)
  let s = seed;
  return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function meanExampleCSV() {
  const rng = seededRandom(42);
  let rows = ['group,score'];
  for (let i = 0; i < 40; i++) {
    const v = (100 + (rng() - 0.5) * 30).toFixed(2);
    rows.push(`control,${v}`);
  }
  for (let i = 0; i < 40; i++) {
    const v = (108 + (rng() - 0.5) * 30).toFixed(2);
    rows.push(`treatment,${v}`);
  }
  return rows.join('\n');
}

function propExampleCSV() {
  const rng = seededRandom(99);
  let rows = ['group,success'];
  for (let i = 0; i < 60; i++) rows.push(`control,${rng() < 0.45 ? 1 : 0}`);
  for (let i = 0; i < 60; i++) rows.push(`treatment,${rng() < 0.62 ? 1 : 0}`);
  return rows.join('\n');
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ── Tab switching ──────────────────────────────────────── */
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
}

/* ── Init ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initC8();
  initC9();
});
