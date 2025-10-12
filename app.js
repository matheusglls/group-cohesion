/* Shoal Cohesion Tool — with copy panel & append-to-sheet (calibration fixed to image pixels) */

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const loadBtn = document.getElementById('loadBtn');
const fileInput = document.getElementById('fileInput');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');

const startCalBtn = document.getElementById('startCal');
const scaleLabel = document.getElementById('scaleLabel');

const undoBtn = document.getElementById('undoBtn');
const clearBtn = document.getElementById('clearBtn');
const measureBtn = document.getElementById('measureBtn');
const exportBtn = document.getElementById('exportBtn');
const showHull = document.getElementById('showHull');

const researcherEl = document.getElementById('researcher');
const videoEl = document.getElementById('video');
const tankEl = document.getElementById('tank');
const frameEl = document.getElementById('frametime');
const imageCodeEl = document.getElementById('imageCode');

const unitSelect = document.getElementById('unitSelect');
const customUnit = document.getElementById('customUnit');

const resultsBody = document.querySelector('#resultsTable tbody');
const dropzone = document.getElementById('dropzone');

// live readouts
const liveIFD = document.getElementById('liveIFD');
const liveNND = document.getElementById('liveNND');
const liveFND = document.getElementById('liveFND');
const liveArea = document.getElementById('liveArea');
const livePerim = document.getElementById('livePerim');

// copy panel elements
const modal = document.getElementById('modal');
const closeModal = document.getElementById('closeModal');
const openCopyPanel = document.getElementById('openCopyPanel');
const cIFD = document.getElementById('cIFD');
const cNND = document.getElementById('cNND');
const cFND = document.getElementById('cFND');
const cArea = document.getElementById('cArea');
const cPerim = document.getElementById('cPerim');
const copyCSVBtn = document.getElementById('copyCSV');
const copyTSVBtn = document.getElementById('copyTSV');
const appendRowBtn = document.getElementById('appendRowBtn');

// ---------- State ----------
let files = [];
let idx = 0;

let img = new Image();
let points = [];            // canvas coords
let scale = null;           // pixels per chosen unit
let unit = 'cm';

let calibrating = false;
let calStart = null;
let mouse = {x:0,y:0};

// ---------- Units ----------
function setUnitFromUI(){
  const val = unitSelect.value;
  if (val === 'custom') {
    customUnit.style.display = 'inline-block';
    unit = customUnit.value || 'units';
  } else {
    customUnit.style.display = 'none';
    unit = val;
  }
  updateScaleLabel(); updateLive();
}
unitSelect.addEventListener('change', setUnitFromUI);
customUnit.addEventListener('input', setUnitFromUI);

function updateScaleLabel(){
  scaleLabel.textContent = scale
    ? `Scale: 1 ${unit} = ${scale.toFixed(3)} px`
    : 'Scale: not set';
}

// ---------- Drawing ----------
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if (img.complete && img.naturalWidth){
    const fit = Math.min(canvas.width/img.naturalWidth, canvas.height/img.naturalHeight);
    const iw = img.naturalWidth*fit, ih = img.naturalHeight*fit;
    const ox = (canvas.width - iw)/2, oy = (canvas.height - ih)/2;
    ctx.drawImage(img, ox, oy, iw, ih);
    draw._tf = {ox,oy,s:fit};
  }

  ctx.fillStyle = '#2e7d32';
  points.forEach(p=>{ ctx.beginPath(); ctx.arc(p.x,p.y,5,0,2*Math.PI); ctx.fill(); });

  if (showHull.checked && points.length>=3){
    const hull = convexHull(points);
    ctx.strokeStyle = '#0b5394'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hull[0].x,hull[0].y);
    for (let i=1;i<hull.length;i++) ctx.lineTo(hull[i].x,hull[i].y);
    ctx.closePath(); ctx.stroke();
  }

  if (calibrating && calStart){
    ctx.strokeStyle = '#d32f2f';
    ctx.beginPath(); ctx.moveTo(calStart.x, calStart.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
  }
}
function canvasToImgCoords(cx, cy){
  const tf = draw._tf || {ox:0,oy:0,s:1};
  return {x: (cx - tf.ox)/tf.s, y: (cy - tf.oy)/tf.s};
}

// ---------- Files ----------
loadBtn.addEventListener('click', ()=> fileInput.click());
fileInput.addEventListener('change', e=>{
  files = Array.from(e.target.files || []);
  idx = 0; loadCurrent();
});
['dragenter','dragover'].forEach(ev=>dropzone.addEventListener(ev, e=>{
  e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
}));
dropzone.addEventListener('drop', e=>{
  e.preventDefault();
  const dropped = Array.from(e.dataTransfer.files || []).filter(f=>f.type.startsWith('image/'));
  if (dropped.length){ files = dropped; idx = 0; loadCurrent(); }
});
function loadCurrent(){
  if (!files.length){ img.src=''; points=[]; draw(); pageInfo.textContent='No files'; imageCodeEl.value=''; return; }
  const url = URL.createObjectURL(files[idx]);
  img.onload = ()=>{ URL.revokeObjectURL(url); points=[]; draw(); updatePageInfo(); updateLive(); imageCodeEl.value = files[idx].name.replace(/\.[^.]+$/,''); };
  img.src = url;
}
function updatePageInfo(){
  pageInfo.textContent = files.length ? `${idx+1} / ${files.length} — ${files[idx].name}` : '';
}
prevBtn.addEventListener('click', ()=>{ if (idx>0){ idx--; loadCurrent(); }});
nextBtn.addEventListener('click', ()=>{ if (idx<files.length-1){ idx++; loadCurrent(); }});

// ---------- Calibration ----------
canvas.addEventListener('mousemove', e=>{
  const r = canvas.getBoundingClientRect();
  mouse = {x: e.clientX - r.left, y: e.clientY - r.top};
  if (calibrating) draw();
});
startCalBtn.addEventListener('click', ()=>{
  calibrating = true; calStart = null;
  alert('Calibration: click start of known length, then click end. You will be asked the real distance in your selected unit.');
});
canvas.addEventListener('click', ()=>{
  if (calibrating){
    if (!calStart){ 
      calStart = {x:mouse.x,y:mouse.y}; 
    } else {
      // FIX: measure calibration length in IMAGE pixels (not canvas)
      const p1 = canvasToImgCoords(calStart.x, calStart.y);
      const p2 = canvasToImgCoords(mouse.x, mouse.y);
      const pixels = Math.hypot(p2.x - p1.x, p2.y - p1.y);

      const u = (unitSelect.value==='custom' ? (customUnit.value||'units') : unitSelect.value);
      const val = parseFloat(prompt(`Enter known distance in ${u}:`, '10'));
      if (!isNaN(val) && val>0){ 
        scale = pixels / val; // pixels per unit in IMAGE space
        unit = u; 
        updateScaleLabel(); 
      } else {
        alert('Invalid number.');
      }
      calibrating = false; calStart = null; draw(); updateLive();
    }
    return;
  }
  points.push({x:mouse.x, y:mouse.y});
  draw(); updateLive();
});
document.addEventListener('keydown', e=>{
  const k = e.key.toLowerCase();
  if (k==='z'){ points.pop(); draw(); updateLive(); }
  if (e.shiftKey && k==='a'){ points=[]; draw(); updateLive(); }
});
undoBtn.addEventListener('click', ()=>{ points.pop(); draw(); updateLive(); });
clearBtn.addEventListener('click', ()=>{ points=[]; draw(); updateLive(); });

// ---------- Geometry & metrics ----------
function convexHull(pts){
  const p = pts.slice().sort((a,b)=>a.x===b.x ? a.y-b.y : a.x-b.x);
  if (p.length<=1) return p;
  const cross=(o,a,b)=> (a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
  const lower=[]; for (const pt of p){ while (lower.length>=2 && cross(lower[lower.length-2], lower[lower.length-1], pt)<=0) lower.pop(); lower.push(pt); }
  const upper=[]; for (let i=p.length-1;i>=0;i--){ const pt=p[i]; while (upper.length>=2 && cross(upper[upper.length-2], upper[upper.length-1], pt)<=0) upper.pop(); upper.push(pt); }
  upper.pop(); lower.pop(); return lower.concat(upper);
}
function computeAllMetrics(){
  if (!scale || points.length<2) return null;

  // convert clicks to IMAGE pixel space
  const ptsImg = points.map(p=>canvasToImgCoords(p.x,p.y));
  const n = ptsImg.length;

  // pairwise distances in image px
  let sumPairs=0, countPairs=0, sumMin=0, sumMax=0;
  for (let j=0;j<n;j++){
    let dmin=Infinity, dmax=-Infinity;
    for (let i=0;i<n;i++){
      if (i===j) continue;
      const dx = ptsImg[j].x - ptsImg[i].x;
      const dy = ptsImg[j].y - ptsImg[i].y;
      const d = Math.hypot(dx,dy);
      if (i>j){ sumPairs += d; countPairs++; }
      if (d<dmin) dmin = d;
      if (d>dmax) dmax = d;
    }
    sumMin += dmin; sumMax += dmax;
  }

  // convert to chosen units
  const IFD = (sumPairs / countPairs) / scale;
  const NND = (sumMin / n) / scale;
  const FND = (sumMax / n) / scale;

  // convex hull in image px
  let areaPx2 = NaN, periPx = NaN;
  if (n>=3){
    const hullCanvas = convexHull(points);
    const hull = hullCanvas.map(p=>canvasToImgCoords(p.x,p.y));
    let A=0,P=0;
    for (let i=0;i<hull.length;i++){
      const a=hull[i], b=hull[(i+1)%hull.length];
      A += (a.x*b.y - a.y*b.x);
      P += Math.hypot(a.x-b.x, a.y-b.y);
    }
    areaPx2 = Math.abs(A)/2;
    periPx  = P;
  }
  const areaUnits2 = isNaN(areaPx2) ? NaN : areaPx2 / (scale*scale); // unit^2
  const periUnits  = isNaN(periPx)  ? NaN : periPx / scale;          // unit

  return { IFD, NND, FND, areaUnits2, periUnits };
}

// live panel
function updateLive(){
  const m = computeAllMetrics();
  if (!m){ 
    liveIFD.textContent=liveNND.textContent=liveFND.textContent=liveArea.textContent=livePerim.textContent='—'; 
    return; 
  }
  liveIFD.textContent  = m.IFD.toFixed(3) + ' ' + unit;
  liveNND.textContent  = m.NND.toFixed(3) + ' ' + unit;
  liveFND.textContent  = m.FND.toFixed(3) + ' ' + unit;
  liveArea.textContent = isNaN(m.areaUnits2)? '—' : m.areaUnits2.toFixed(3) + ' ' + unit + '²';
  livePerim.textContent= isNaN(m.periUnits)? '—' : m.periUnits.toFixed(3) + ' ' + unit;
}

// copy panel helpers
function openModalWithCurrent(){
  const m = computeAllMetrics();
  if (!m){ alert('Set the scale and place at least two points.'); return; }
  cIFD.textContent  = m.IFD.toFixed(3);
  cNND.textContent  = m.NND.toFixed(3);
  cFND.textContent  = m.FND.toFixed(3);
  cArea.textContent = isNaN(m.areaUnits2)? '' : m.areaUnits2.toFixed(3);
  cPerim.textContent= isNaN(m.periUnits)? '' : m.periUnits.toFixed(3);
  modal.setAttribute('aria-hidden','false');
}
openCopyPanel.addEventListener('click', openModalWithCurrent);
closeModal.addEventListener('click', ()=> modal.setAttribute('aria-hidden','true'));
modal.addEventListener('click', e=>{ if (e.target===modal) modal.setAttribute('aria-hidden','true'); });

document.querySelectorAll('[data-copy]').forEach(btn=>{
  btn.addEventListener('click', async ()=>{
    const id = btn.getAttribute('data-copy');
    const val = document.getElementById(id).textContent;
    if (!val) return;
    try { await navigator.clipboard.writeText(val); btn.textContent='Copied!'; setTimeout(()=>btn.textContent='Copy',900); } catch {}
  });
});
async function copyAll(delim){
  const arr = [cIFD.textContent,cNND.textContent,cFND.textContent,cArea.textContent,cPerim.textContent];
  const text = arr.join(delim);
  try { await navigator.clipboard.writeText(text); } catch {}
}
copyCSVBtn.addEventListener('click', ()=>copyAll(','));
copyTSVBtn.addEventListener('click', ()=>copyAll('\t'));

// Add row to the sheet
appendRowBtn.addEventListener('click', ()=>{
  const m = computeAllMetrics();
  if (!m){ alert('Set the scale and place at least two points.'); return; }
  if (!imageCodeEl.value){ alert('Please enter an Image code.'); return; }

  const row = resultsBody.insertRow(-1);
  const cells = [
    researcherEl.value || '',
    videoEl.value || '',
    tankEl.value || '',
    frameEl.value || '',
    m.IFD.toFixed(3),
    m.NND.toFixed(3),
    m.FND.toFixed(3),
    isNaN(m.areaUnits2)? '' : m.areaUnits2.toFixed(3),
    isNaN(m.periUnits) ? '' : m.periUnits.toFixed(3),
    unit,
    imageCodeEl.value || '',
    (files[idx] ? files[idx].name : '')
  ];
  cells.forEach(v=>{ const td=row.insertCell(-1); td.textContent=v; });

  // prep for next frame
  points=[]; draw(); updateLive();
});

// “Measure” button: open copy panel
measureBtn.addEventListener('click', openModalWithCurrent);

// Export CSV
exportBtn.addEventListener('click', ()=>{
  let csv = '';
  const headers = [...document.querySelectorAll('#resultsTable thead th')].map(th=>th.textContent);
  csv += headers.join(',')+'\n';
  for (const tr of resultsBody.rows){
    const row = [...tr.cells].map(td=>String(td.textContent).replaceAll('"','""'));
    csv += row.map(v=>/[,"]/g.test(v)?`"${v}"`:v).join(',')+'\n';
  }
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'shoal_cohesion_results.csv';
  a.click();
  URL.revokeObjectURL(a.href);
});

// init
draw();
setUnitFromUI();
