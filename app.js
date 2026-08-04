const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const loadBtn = document.getElementById('loadBtn');
const fileInput = document.getElementById('fileInput');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');

const startCalBtn = document.getElementById('startCal');
const resetCalBtn = document.getElementById('resetCal');
const scaleLabel = document.getElementById('scaleLabel');
const calibrationStatus = document.getElementById('calibrationStatus');

const undoBtn = document.getElementById('undoBtn');
const clearBtn = document.getElementById('clearBtn');
const measureBtn = document.getElementById('measureBtn');
const exportBtn = document.getElementById('exportBtn');
const exportFishBtn = document.getElementById('exportFishBtn');
const showHull = document.getElementById('showHull');

const researcherEl = document.getElementById('researcher');
const videoEl = document.getElementById('video');
const tankEl = document.getElementById('tank');
const frameEl = document.getElementById('frametime');
const imageCodeEl = document.getElementById('imageCode');

const unitSelect = document.getElementById('unitSelect');
const customUnit = document.getElementById('customUnit');

const resultsBody = document.querySelector('#resultsTable tbody');
const fishResultsBody = document.querySelector('#fishResultsTable tbody');
const currentHeightsBody = document.querySelector('#currentHeightsTable tbody');
const dropzone = document.getElementById('dropzone');

const liveIFD = document.getElementById('liveIFD');
const liveNND = document.getElementById('liveNND');
const liveFND = document.getElementById('liveFND');
const liveArea = document.getElementById('liveArea');
const livePerim = document.getElementById('livePerim');
const liveMeanHeight = document.getElementById('liveMeanHeight');
const liveVerticalSD = document.getElementById('liveVerticalSD');
const liveVerticalRange = document.getElementById('liveVerticalRange');

const modal = document.getElementById('modal');
const closeModal = document.getElementById('closeModal');
const openCopyPanel = document.getElementById('openCopyPanel');
const cIFD = document.getElementById('cIFD');
const cNND = document.getElementById('cNND');
const cFND = document.getElementById('cFND');
const cArea = document.getElementById('cArea');
const cPerim = document.getElementById('cPerim');
const cMeanHeight = document.getElementById('cMeanHeight');
const cVerticalSD = document.getElementById('cVerticalSD');
const cVerticalRange = document.getElementById('cVerticalRange');
const copyCSVBtn = document.getElementById('copyCSV');
const copyTSVBtn = document.getElementById('copyTSV');
const appendRowBtn = document.getElementById('appendRowBtn');

let files = [];
let idx = 0;
let img = new Image();
let points = [];
let scale = null;
let unit = 'cm';
let calibrating = false;
let calibrationStep = 0;
let mouse = {x:0,y:0};
let tankCalibration = emptyCalibration();

function emptyCalibration(){
  return {
    bottomA:null,
    bottomB:null,
    surface:null,
    tankHeight:null,
    imageWidth:null,
    imageHeight:null
  };
}

function setUnitFromUI(){
  const previousUnit = unit;
  const val = unitSelect.value;

  if (val === 'custom') {
    customUnit.style.display = 'inline-block';
    unit = customUnit.value.trim() || 'units';
  } else {
    customUnit.style.display = 'none';
    unit = val;
  }

  if (scale && previousUnit !== unit) {
    resetCalibration(false);
    calibrationStatus.textContent = 'The unit changed. Calibrate the tank height again.';
  }

  updateScaleLabel();
  updateLive();
}

unitSelect.addEventListener('change', setUnitFromUI);
customUnit.addEventListener('input', setUnitFromUI);

function updateScaleLabel(){
  scaleLabel.textContent = scale
    ? `Scale: 1 ${unit} = ${scale.toFixed(3)} px`
    : 'Scale: not set';
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  if (img.complete && img.naturalWidth){
    const fit = Math.min(canvas.width/img.naturalWidth, canvas.height/img.naturalHeight);
    const iw = img.naturalWidth*fit;
    const ih = img.naturalHeight*fit;
    const ox = (canvas.width-iw)/2;
    const oy = (canvas.height-ih)/2;
    ctx.drawImage(img,ox,oy,iw,ih);
    draw._tf = {ox,oy,s:fit};
  }

  drawCalibration();

  if (showHull.checked && points.length>=3){
    const hull = convexHull(points);
    ctx.strokeStyle = '#0b5394';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hull[0].x,hull[0].y);
    for (let i=1;i<hull.length;i++) ctx.lineTo(hull[i].x,hull[i].y);
    ctx.closePath();
    ctx.stroke();
  }

  const vertical = computeVerticalMetrics();
  ctx.fillStyle = '#2e7d32';
  ctx.font = '12px system-ui';

  points.forEach((p,index)=>{
    ctx.beginPath();
    ctx.arc(p.x,p.y,5,0,2*Math.PI);
    ctx.fill();

    const label = vertical
      ? `${index+1}: ${vertical.heights[index].height.toFixed(2)} ${unit}`
      : `${index+1}`;
    ctx.fillText(label,p.x+8,p.y-8);
  });
}

function drawCalibration(){
  if (!tankCalibration.bottomA) return;

  const a = imgToCanvasCoords(tankCalibration.bottomA);
  const b = tankCalibration.bottomB ? imgToCanvasCoords(tankCalibration.bottomB) : null;
  const s = tankCalibration.surface ? imgToCanvasCoords(tankCalibration.surface) : null;

  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#d32f2f';
  ctx.fillStyle = '#d32f2f';

  drawMarker(a);

  if (b){
    drawMarker(b);
    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.lineTo(b.x,b.y);
    ctx.stroke();
  }

  if (s && b){
    drawMarker(s);
    const projection = projectPointToLine(tankCalibration.surface,tankCalibration.bottomA,tankCalibration.bottomB);
    const pc = imgToCanvasCoords(projection);
    ctx.setLineDash([6,4]);
    ctx.beginPath();
    ctx.moveTo(s.x,s.y);
    ctx.lineTo(pc.x,pc.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (calibrating){
    ctx.strokeStyle = '#ef6c00';
    ctx.setLineDash([5,4]);

    if (calibrationStep===1){
      ctx.beginPath();
      ctx.moveTo(a.x,a.y);
      ctx.lineTo(mouse.x,mouse.y);
      ctx.stroke();
    }

    if (calibrationStep===2 && b){
      const mouseImg = canvasToImgCoords(mouse.x,mouse.y);
      const projection = projectPointToLine(mouseImg,tankCalibration.bottomA,tankCalibration.bottomB);
      const pc = imgToCanvasCoords(projection);
      ctx.beginPath();
      ctx.moveTo(mouse.x,mouse.y);
      ctx.lineTo(pc.x,pc.y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawMarker(p){
  ctx.beginPath();
  ctx.arc(p.x,p.y,5,0,2*Math.PI);
  ctx.fill();
}

function canvasToImgCoords(cx,cy){
  const tf = draw._tf || {ox:0,oy:0,s:1};
  return {x:(cx-tf.ox)/tf.s,y:(cy-tf.oy)/tf.s};
}

function imgToCanvasCoords(p){
  const tf = draw._tf || {ox:0,oy:0,s:1};
  return {x:p.x*tf.s+tf.ox,y:p.y*tf.s+tf.oy};
}

function projectPointToLine(p,a,b){
  const vx = b.x-a.x;
  const vy = b.y-a.y;
  const len2 = vx*vx+vy*vy;
  if (!len2) return {x:a.x,y:a.y};
  const t = ((p.x-a.x)*vx+(p.y-a.y)*vy)/len2;
  return {x:a.x+t*vx,y:a.y+t*vy};
}

function signedDistanceToLine(p,a,b){
  const vx = b.x-a.x;
  const vy = b.y-a.y;
  const length = Math.hypot(vx,vy);
  if (!length) return NaN;
  return (vx*(p.y-a.y)-vy*(p.x-a.x))/length;
}

loadBtn.addEventListener('click',()=>fileInput.click());

fileInput.addEventListener('change',e=>{
  files = Array.from(e.target.files || []);
  idx = 0;
  loadCurrent();
});

['dragenter','dragover'].forEach(eventName=>{
  dropzone.addEventListener(eventName,e=>{
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
});

dropzone.addEventListener('drop',e=>{
  e.preventDefault();
  const dropped = Array.from(e.dataTransfer.files || []).filter(file=>file.type.startsWith('image/'));
  if (dropped.length){
    files = dropped;
    idx = 0;
    loadCurrent();
  }
});

function loadCurrent(){
  if (!files.length){
    img.src = '';
    points = [];
    resetCalibration(false);
    draw();
    updateLive();
    pageInfo.textContent = 'No files';
    imageCodeEl.value = '';
    return;
  }

  const url = URL.createObjectURL(files[idx]);
  img.onload = ()=>{
    URL.revokeObjectURL(url);

    if (
      tankCalibration.imageWidth &&
      (tankCalibration.imageWidth!==img.naturalWidth || tankCalibration.imageHeight!==img.naturalHeight)
    ){
      resetCalibration(false);
      calibrationStatus.textContent = 'Image dimensions changed. Calibrate the tank height again.';
    }

    points = [];
    draw();
    updatePageInfo();
    updateLive();
    imageCodeEl.value = files[idx].name.replace(/\.[^.]+$/,'');
  };
  img.src = url;
}

function updatePageInfo(){
  pageInfo.textContent = files.length ? `${idx+1} / ${files.length} — ${files[idx].name}` : '';
}

prevBtn.addEventListener('click',()=>{
  if (idx>0){
    idx--;
    loadCurrent();
  }
});

nextBtn.addEventListener('click',()=>{
  if (idx<files.length-1){
    idx++;
    loadCurrent();
  }
});

canvas.addEventListener('mousemove',e=>{
  const rect = canvas.getBoundingClientRect();
  mouse = {
    x:(e.clientX-rect.left)*(canvas.width/rect.width),
    y:(e.clientY-rect.top)*(canvas.height/rect.height)
  };
  if (calibrating) draw();
});

startCalBtn.addEventListener('click',()=>{
  if (!img.complete || !img.naturalWidth){
    alert('Open an image before calibrating.');
    return;
  }

  resetCalibration(false);
  calibrating = true;
  calibrationStep = 0;
  calibrationStatus.textContent = 'Click the first point on the tank bottom.';
  draw();
});

resetCalBtn.addEventListener('click',()=>resetCalibration(true));

function resetCalibration(showStatus){
  scale = null;
  calibrating = false;
  calibrationStep = 0;
  tankCalibration = emptyCalibration();
  updateScaleLabel();

  if (showStatus){
    calibrationStatus.textContent = 'Calibration cleared.';
  }

  draw();
  updateLive();
}

canvas.addEventListener('click',()=>{
  if (calibrating){
    const clicked = canvasToImgCoords(mouse.x,mouse.y);

    if (calibrationStep===0){
      tankCalibration.bottomA = clicked;
      calibrationStep = 1;
      calibrationStatus.textContent = 'Click the second point on the tank bottom.';
      draw();
      return;
    }

    if (calibrationStep===1){
      if (Math.hypot(clicked.x-tankCalibration.bottomA.x,clicked.y-tankCalibration.bottomA.y)<2){
        alert('Choose a second bottom point farther from the first point.');
        return;
      }
      tankCalibration.bottomB = clicked;
      calibrationStep = 2;
      calibrationStatus.textContent = 'Click one point at the water surface.';
      draw();
      return;
    }

    tankCalibration.surface = clicked;
    const heightPx = Math.abs(signedDistanceToLine(
      tankCalibration.surface,
      tankCalibration.bottomA,
      tankCalibration.bottomB
    ));

    if (!Number.isFinite(heightPx) || heightPx<2){
      tankCalibration.surface = null;
      alert('The surface point is too close to the bottom line.');
      draw();
      return;
    }

    const selectedUnit = unitSelect.value==='custom'
      ? (customUnit.value.trim() || 'units')
      : unitSelect.value;

    const value = parseFloat(prompt(`Enter the water-column height in ${selectedUnit}:`,'30'));

    if (!Number.isFinite(value) || value<=0){
      tankCalibration.surface = null;
      alert('Enter a valid positive number.');
      draw();
      return;
    }

    unit = selectedUnit;
    tankCalibration.tankHeight = value;
    tankCalibration.imageWidth = img.naturalWidth;
    tankCalibration.imageHeight = img.naturalHeight;
    scale = heightPx/value;
    calibrating = false;
    calibrationStep = 0;
    calibrationStatus.textContent = `Tank height calibrated: ${value} ${unit}.`;
    updateScaleLabel();
    draw();
    updateLive();
    return;
  }

  points.push({x:mouse.x,y:mouse.y});
  draw();
  updateLive();
});

document.addEventListener('keydown',e=>{
  const key = e.key.toLowerCase();

  if (key==='z'){
    points.pop();
    draw();
    updateLive();
  }

  if (e.shiftKey && key==='a'){
    points = [];
    draw();
    updateLive();
  }
});

undoBtn.addEventListener('click',()=>{
  points.pop();
  draw();
  updateLive();
});

clearBtn.addEventListener('click',()=>{
  points = [];
  draw();
  updateLive();
});

showHull.addEventListener('change',draw);

function convexHull(pts){
  const p = pts.slice().sort((a,b)=>a.x===b.x ? a.y-b.y : a.x-b.x);
  if (p.length<=1) return p;
  const cross = (o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
  const lower = [];
  for (const pt of p){
    while (lower.length>=2 && cross(lower[lower.length-2],lower[lower.length-1],pt)<=0) lower.pop();
    lower.push(pt);
  }
  const upper = [];
  for (let i=p.length-1;i>=0;i--){
    const pt = p[i];
    while (upper.length>=2 && cross(upper[upper.length-2],upper[upper.length-1],pt)<=0) upper.pop();
    upper.push(pt);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function computeAllMetrics(){
  if (!scale || points.length<2) return null;

  const ptsImg = points.map(p=>canvasToImgCoords(p.x,p.y));
  const n = ptsImg.length;

  let sumPairs=0, countPairs=0, sumMin=0, sumMax=0;
  for (let j=0;j<n;j++){
    let dmin=Infinity, dmax=-Infinity;
    for (let i=0;i<n;i++){
      if (i===j) continue;
      const dx = ptsImg[j].x-ptsImg[i].x;
      const dy = ptsImg[j].y-ptsImg[i].y;
      const d = Math.hypot(dx,dy);
      if (i>j){
        sumPairs += d;
        countPairs++;
      }
      if (d<dmin) dmin = d;
      if (d>dmax) dmax = d;
    }
    sumMin += dmin;
    sumMax += dmax;
  }

  const IFD = (sumPairs/countPairs)/scale;
  const NND = (sumMin/n)/scale;
  const FND = (sumMax/n)/scale;

  let areaPx2 = NaN;
  let periPx = NaN;

  if (n>=3){
    const hullCanvas = convexHull(points);
    const hull = hullCanvas.map(p=>canvasToImgCoords(p.x,p.y));
    let area = 0;
    let perimeter = 0;

    for (let i=0;i<hull.length;i++){
      const a = hull[i];
      const b = hull[(i+1)%hull.length];
      area += a.x*b.y-a.y*b.x;
      perimeter += Math.hypot(a.x-b.x,a.y-b.y);
    }

    areaPx2 = Math.abs(area)/2;
    periPx = perimeter;
  }

  const areaUnits2 = Number.isNaN(areaPx2) ? NaN : areaPx2/(scale*scale);
  const periUnits = Number.isNaN(periPx) ? NaN : periPx/scale;

  return {IFD,NND,FND,areaUnits2,periUnits};
}

function computeVerticalMetrics(){
  if (
    !scale ||
    !tankCalibration.bottomA ||
    !tankCalibration.bottomB ||
    !tankCalibration.surface ||
    !tankCalibration.tankHeight ||
    points.length<1
  ){
    return null;
  }

  const surfaceDistance = signedDistanceToLine(
    tankCalibration.surface,
    tankCalibration.bottomA,
    tankCalibration.bottomB
  );
  const side = surfaceDistance>=0 ? 1 : -1;

  const heights = points.map((point,index)=>{
    const imgPoint = canvasToImgCoords(point.x,point.y);
    const distancePx = signedDistanceToLine(
      imgPoint,
      tankCalibration.bottomA,
      tankCalibration.bottomB
    )*side;
    const height = distancePx/scale;
    const relativeHeight = (height/tankCalibration.tankHeight)*100;

    return {
      fish:index+1,
      height,
      relativeHeight
    };
  });

  const values = heights.map(item=>item.height);
  const meanHeight = values.reduce((sum,value)=>sum+value,0)/values.length;
  const variance = values.reduce((sum,value)=>sum+(value-meanHeight)**2,0)/values.length;
  const verticalSD = Math.sqrt(variance);
  const minHeight = Math.min(...values);
  const maxHeight = Math.max(...values);
  const verticalRange = maxHeight-minHeight;
  const meanRelativeHeight = (meanHeight/tankCalibration.tankHeight)*100;

  return {
    heights,
    meanHeight,
    meanRelativeHeight,
    verticalSD,
    minHeight,
    maxHeight,
    verticalRange
  };
}

function updateLive(){
  const cohesion = computeAllMetrics();
  const vertical = computeVerticalMetrics();

  if (cohesion){
    liveIFD.textContent = `${cohesion.IFD.toFixed(3)} ${unit}`;
    liveNND.textContent = `${cohesion.NND.toFixed(3)} ${unit}`;
    liveFND.textContent = `${cohesion.FND.toFixed(3)} ${unit}`;
    liveArea.textContent = Number.isNaN(cohesion.areaUnits2) ? '—' : `${cohesion.areaUnits2.toFixed(3)} ${unit}²`;
    livePerim.textContent = Number.isNaN(cohesion.periUnits) ? '—' : `${cohesion.periUnits.toFixed(3)} ${unit}`;
  } else {
    liveIFD.textContent = '—';
    liveNND.textContent = '—';
    liveFND.textContent = '—';
    liveArea.textContent = '—';
    livePerim.textContent = '—';
  }

  if (vertical){
    liveMeanHeight.textContent = `${vertical.meanHeight.toFixed(3)} ${unit}`;
    liveVerticalSD.textContent = `${vertical.verticalSD.toFixed(3)} ${unit}`;
    liveVerticalRange.textContent = `${vertical.verticalRange.toFixed(3)} ${unit}`;
  } else {
    liveMeanHeight.textContent = '—';
    liveVerticalSD.textContent = '—';
    liveVerticalRange.textContent = '—';
  }

  updateCurrentHeights(vertical);
}

function updateCurrentHeights(vertical){
  currentHeightsBody.textContent = '';
  if (!vertical) return;

  vertical.heights.forEach(item=>{
    const row = currentHeightsBody.insertRow(-1);
    const values = [
      item.fish,
      `${item.height.toFixed(3)} ${unit}`,
      `${item.relativeHeight.toFixed(1)}%`
    ];
    values.forEach(value=>{
      const cell = row.insertCell(-1);
      cell.textContent = value;
    });
  });
}

function openModalWithCurrent(){
  const cohesion = computeAllMetrics();
  const vertical = computeVerticalMetrics();

  if (!cohesion || !vertical){
    alert('Calibrate the tank height and place at least two fish points.');
    return;
  }

  cIFD.textContent = cohesion.IFD.toFixed(3);
  cNND.textContent = cohesion.NND.toFixed(3);
  cFND.textContent = cohesion.FND.toFixed(3);
  cArea.textContent = Number.isNaN(cohesion.areaUnits2) ? '' : cohesion.areaUnits2.toFixed(3);
  cPerim.textContent = Number.isNaN(cohesion.periUnits) ? '' : cohesion.periUnits.toFixed(3);
  cMeanHeight.textContent = vertical.meanHeight.toFixed(3);
  cVerticalSD.textContent = vertical.verticalSD.toFixed(3);
  cVerticalRange.textContent = vertical.verticalRange.toFixed(3);
  modal.setAttribute('aria-hidden','false');
}

openCopyPanel.addEventListener('click',openModalWithCurrent);
closeModal.addEventListener('click',()=>modal.setAttribute('aria-hidden','true'));
modal.addEventListener('click',e=>{
  if (e.target===modal) modal.setAttribute('aria-hidden','true');
});

document.querySelectorAll('[data-copy]').forEach(button=>{
  button.addEventListener('click',async()=>{
    const id = button.getAttribute('data-copy');
    const value = document.getElementById(id).textContent;
    if (!value) return;

    try{
      await navigator.clipboard.writeText(value);
      button.textContent = 'Copied!';
      setTimeout(()=>button.textContent='Copy',900);
    }catch{}
  });
});

async function copyAll(delimiter){
  const values = [
    cIFD.textContent,
    cNND.textContent,
    cFND.textContent,
    cArea.textContent,
    cPerim.textContent,
    cMeanHeight.textContent,
    cVerticalSD.textContent,
    cVerticalRange.textContent
  ];

  try{
    await navigator.clipboard.writeText(values.join(delimiter));
  }catch{}
}

copyCSVBtn.addEventListener('click',()=>copyAll(','));
copyTSVBtn.addEventListener('click',()=>copyAll('\t'));

appendRowBtn.addEventListener('click',()=>{
  const cohesion = computeAllMetrics();
  const vertical = computeVerticalMetrics();

  if (!cohesion || !vertical){
    alert('Calibrate the tank height and place at least two fish points.');
    return;
  }

  if (!imageCodeEl.value.trim()){
    alert('Please enter an Image code.');
    return;
  }

  const filename = files[idx] ? files[idx].name : '';
  const summaryRow = resultsBody.insertRow(-1);
  const summaryValues = [
    researcherEl.value || '',
    videoEl.value || '',
    tankEl.value || '',
    frameEl.value || '',
    cohesion.IFD.toFixed(3),
    cohesion.NND.toFixed(3),
    cohesion.FND.toFixed(3),
    Number.isNaN(cohesion.areaUnits2) ? '' : cohesion.areaUnits2.toFixed(3),
    Number.isNaN(cohesion.periUnits) ? '' : cohesion.periUnits.toFixed(3),
    vertical.heights.length,
    tankCalibration.tankHeight.toFixed(3),
    vertical.meanHeight.toFixed(3),
    vertical.meanRelativeHeight.toFixed(3),
    vertical.verticalSD.toFixed(3),
    vertical.verticalRange.toFixed(3),
    unit,
    imageCodeEl.value || '',
    filename
  ];

  summaryValues.forEach(value=>{
    const cell = summaryRow.insertCell(-1);
    cell.textContent = value;
  });

  vertical.heights.forEach(item=>{
    const row = fishResultsBody.insertRow(-1);
    const values = [
      researcherEl.value || '',
      videoEl.value || '',
      tankEl.value || '',
      frameEl.value || '',
      imageCodeEl.value || '',
      item.fish,
      item.height.toFixed(3),
      item.relativeHeight.toFixed(3),
      unit,
      filename
    ];

    values.forEach(value=>{
      const cell = row.insertCell(-1);
      cell.textContent = value;
    });
  });

  points = [];
  draw();
  updateLive();
});

measureBtn.addEventListener('click',openModalWithCurrent);

function exportTableAsCSV(tableSelector,filename){
  const table = document.querySelector(tableSelector);
  const rows = [...table.rows].map(row=>{
    return [...row.cells].map(cell=>{
      const value = String(cell.textContent).replaceAll('"','""');
      return /[,"\n]/.test(value) ? `"${value}"` : value;
    }).join(',');
  });

  const blob = new Blob([rows.join('\n')+'\n'],{type:'text/csv;charset=utf-8'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

exportBtn.addEventListener('click',()=>{
  exportTableAsCSV('#resultsTable','shoal_cohesion_frame_results.csv');
});

exportFishBtn.addEventListener('click',()=>{
  exportTableAsCSV('#fishResultsTable','shoal_individual_fish_heights.csv');
});

draw();
setUnitFromUI();
