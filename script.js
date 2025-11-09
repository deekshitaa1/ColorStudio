// script.js — ES module
// Place in same folder as index.html and style.css
const randomBtn = document.getElementById('randomBtn');
const preview = document.getElementById('preview');
const swatches = document.getElementById('swatches');
const paletteEl = document.getElementById('palette');
const historyEl = document.getElementById('history');
const gradientToggle = document.getElementById('gradientToggle');
const angleInput = document.getElementById('angleInput');
const savePaletteBtn = document.getElementById('savePaletteBtn');
const exportCssBtn = document.getElementById('exportCssBtn');
const downloadBtn = document.getElementById('downloadBtn');
const colorInput = document.getElementById('colorInput');
const applyColorBtn = document.getElementById('applyColorBtn');
const presetList = document.getElementById('presetList');

const STORAGE_KEYS = { HISTORY: 'cs_history_v1', PALETTES: 'cs_palettes_v1' };

const PRESETS = [
  '#ff6b6b','#ffd93d','#6bcB77','#4D96FF','#9B7DFF',
  '#00c2ff','#ff7ab6','#ff8a00','#00d2a9','#ff4d4d'
];

// Utility functions
const clampHex = (hex) => {
  if(!hex) return null;
  hex = hex.trim().toLowerCase();
  if(hex[0] === '#') hex = hex.slice(1);
  if(hex.length === 3) hex = hex.split('').map(s=>s+s).join('');
  if(!/^([0-9a-f]{6})$/.test(hex)) return null;
  return `#${hex}`;
};

const randHex = () => {
  const v = Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0');
  return `#${v}`;
};

const luminance = (hex) => {
  hex = clampHex(hex).slice(1);
  const rgb = [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=> c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4));
  return 0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2];
};

const contrastRatio = (a,b) => {
  const L1 = luminance(a), L2 = luminance(b);
  const brighter = Math.max(L1,L2), darker = Math.min(L1,L2);
  return ((brighter + 0.05) / (darker + 0.05));
};

const copyToClipboard = async (text) => {
  try{
    await navigator.clipboard.writeText(text);
    flashToast('Copied!');
  }catch(e){
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
    flashToast('Copied!');
  }
};

function flashToast(text){
  const t = document.createElement('div');
  t.textContent = text;
  t.style.position = 'fixed';
  t.style.right = '20px';
  t.style.bottom = '20px';
  t.style.padding = '10px 14px';
  t.style.background = 'rgba(0,0,0,0.6)';
  t.style.color = 'white';
  t.style.borderRadius = '10px';
  t.style.zIndex = 9999;
  t.style.fontWeight = 700;
  document.body.appendChild(t);
  setTimeout(()=>t.style.opacity = '0',1200);
  setTimeout(()=>t.remove(),1600);
}

// Render functions
function setPreview(colors, isGradient=false, angle=90){
  if(isGradient && colors.length>1){
    const g = `linear-gradient(${angle}deg, ${colors.join(', ')})`;
    preview.style.background = g;
  } else {
    preview.style.background = colors[0] || '#222';
  }
  renderSwatches(colors);
}

function renderSwatches(colors){
  swatches.innerHTML = '';
  colors.forEach((c, i) => {
    const btn = document.createElement('div');
    btn.className = 'swatch';
    btn.style.background = c;
    btn.setAttribute('data-hex', c);
    const meta = document.createElement('div');
    meta.className = 'meta';
    const textColor = contrastRatio(c, '#ffffff') > 4.5 ? '#fff' : '#111';
    meta.style.color = textColor;
    meta.textContent = c.toUpperCase();
    btn.appendChild(meta);
    btn.title = 'Click to copy hex';
    btn.addEventListener('click', () => {
      copyToClipboard(c);
    });
    swatches.appendChild(btn);
  });
  renderPalette(colors);
}

// Palette sidebar
function renderPalette(colors){
  paletteEl.innerHTML = '';
  colors.forEach((c, idx) => {
    const li = document.createElement('li');
    const chip = document.createElement('div');
    chip.className = 'color-chip';
    chip.style.background = c;
    const label = document.createElement('div');
    label.textContent = c.toUpperCase();
    label.style.fontSize = '13px';
    label.style.color = '#dfeefc';
    label.style.fontWeight = 700;
    const actions = document.createElement('div');
    actions.className = 'color-actions';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'icon-btn';
    copyBtn.title = 'Copy hex';
    copyBtn.textContent = 'Copy';
    copyBtn.onclick = () => copyToClipboard(c);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'icon-btn';
    removeBtn.title = 'Remove';
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = () => {
      colors.splice(idx,1);
      updateState(colors);
    };

    actions.appendChild(copyBtn);
    actions.appendChild(removeBtn);
    li.appendChild(chip);
    li.appendChild(label);
    li.appendChild(actions);
    paletteEl.appendChild(li);
  });
}

// History/presets
function addHistory(colors){
  const arr = loadFromStorage(STORAGE_KEYS.HISTORY) || [];
  arr.unshift(colors);
  if(arr.length>8) arr.length = 8;
  saveToStorage(STORAGE_KEYS.HISTORY, arr);
  renderHistory();
}

function renderHistory(){
  const arr = loadFromStorage(STORAGE_KEYS.HISTORY) || [];
  historyEl.innerHTML = '';
  arr.forEach((colors, i) => {
    const it = document.createElement('div');
    it.className = 'hist-item';
    const previewMini = document.createElement('div');
    previewMini.style.display = 'flex'; previewMini.style.gap = '6px';
    colors.slice(0,4).forEach(c=>{
      const m = document.createElement('div'); m.style.width='24px'; m.style.height='16px'; m.style.borderRadius='4px'; m.style.background=c;
      previewMini.appendChild(m);
    });
    const loadBtn = document.createElement('button');
    loadBtn.className = 'btn';
    loadBtn.textContent = 'Load';
    loadBtn.onclick = ()=> updateState([...colors]);
    it.appendChild(previewMini);
    it.appendChild(loadBtn);
    historyEl.appendChild(it);
  });
}

function renderPresets(){
  presetList.innerHTML = '';
  PRESETS.forEach(hex=>{
    const b = document.createElement('button');
    b.className = 'btn';
    b.style.padding = '6px 8px';
    b.textContent = hex.toUpperCase();
    b.onclick = ()=> {
      updateState([hex]);
    };
    presetList.appendChild(b);
  });
}

// storage helpers
function saveToStorage(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
function loadFromStorage(k){ try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } }

// top-level state update
function updateState(colors, { saveHistory=true } = {}){
  colors = colors.filter(Boolean);
  if(colors.length===0) colors = ['#222'];
  const isGradient = gradientToggle.checked;
  const angle = Number(angleInput.value) || 90;
  setPreview(colors, isGradient, angle);
  if(saveHistory) addHistory(colors);
}

// generate new palette
function randomize(){
  // create 2-4 colors for richer gradients
  const count = gradientToggle.checked ? (Math.random()>0.6?3:2) : 1;
  const colors = Array.from({length:count}, ()=>randHex());
  updateState(colors);
}

// Export CSS
function exportCSS(){
  const colors = Array.from(paletteEl.querySelectorAll('.color-chip')).map(el=>{
    // background can be gradient; but we store hex in label text
    return el.style.background || '#222';
  });
  const isGradient = gradientToggle.checked;
  const angle = Number(angleInput.value) || 90;
  let css = '';
  if(isGradient && colors.length>1){
    css = `background: linear-gradient(${angle}deg, ${colors.join(', ')});`;
  } else {
    css = `background-color: ${colors[0] || '#222'};`;
  }
  copyToClipboard(css);
}

// Download PNG — render preview to canvas
async function downloadPNG(){
  const width = 1200, height = 800;
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');

  // draw gradient/color like preview
  const isGradient = gradientToggle.checked;
  const colors = Array.from(paletteEl.querySelectorAll('.color-chip')).map(el=>{
    // compute effective color from style.background (local string)
    return el.style.background || '#222';
  });
  if(isGradient && colors.length>1){
    // linear gradient at angle
    const angle = (Number(angleInput.value) || 90) * Math.PI/180;
    // approximate by using top->bottom gradient; for robust support you'd calculate coords
    const g = ctx.createLinearGradient(0,0,Math.cos(angle)*width,Math.sin(angle)*height);
    colors.forEach((c, i) => g.addColorStop(i/(colors.length-1), c));
    ctx.fillStyle = g;
    ctx.fillRect(0,0,width,height);
  } else {
    ctx.fillStyle = colors[0] || '#222';
    ctx.fillRect(0,0,width,height);
  }

  // optional watermark
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.font = '22px sans-serif';
  ctx.fillText('Color Studio • export', 20, height - 28);

  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a'); a.href = url; a.download = 'color-studio.png'; a.click();
  flashToast('Downloaded PNG');
}

// apply user text input color
function applyInputColor(){
  const v = colorInput.value.trim();
  // allow rgb(...) passthrough or hex
  if(v.startsWith('rgb') || v.startsWith('hsl')){
    updateState([v]);
    return;
  }
  const hex = clampHex(v);
  if(!hex){
    flashToast('Invalid hex');
    return;
  }
  updateState([hex]);
}

// Save palette (persist)
function savePalette(){
  const colors = Array.from(paletteEl.querySelectorAll('.color-chip')).map(el => el.style.background || '#222');
  const arr = loadFromStorage(STORAGE_KEYS.PALETTES) || [];
  arr.unshift(colors);
  if(arr.length>30) arr.length = 30;
  saveToStorage(STORAGE_KEYS.PALETTES, arr);
  flashToast('Palette saved');
  renderSavedPalettesUI();
}

function renderSavedPalettesUI(){
  const arr = loadFromStorage(STORAGE_KEYS.PALETTES) || [];
  // show latest 6 as small chips in presetList (append)
  renderPresets();
  arr.slice(0,6).forEach(p=>{
    const b = document.createElement('button');
    b.className = 'btn';
    b.style.padding = '6px 8px';
    b.textContent = p.slice(0,3).map(x=>x.toUpperCase()).join(' · ');
    b.title = p.join(' | ');
    b.onclick = ()=> updateState([...p]);
    presetList.appendChild(b);
  });
}

// initial render
function init(){
  renderPresets();
  renderHistory();
  renderSavedPalettesUI();

  // default
  updateState(['#3498db']);
}

// event listeners
randomBtn.addEventListener('click', () => randomize());
gradientToggle.addEventListener('change', () => updateState(
  Array.from(paletteEl.querySelectorAll('.color-chip')).map(c=>c.style.background || '#222'),
  { saveHistory:false }
));
angleInput.addEventListener('input', () => {
  updateState(Array.from(paletteEl.querySelectorAll('.color-chip')).map(c=>c.style.background || '#222'), { saveHistory:false });
});
exportCssBtn.addEventListener('click', exportCSS);
downloadBtn.addEventListener('click', downloadPNG);
applyColorBtn.addEventListener('click', applyInputColor);
savePaletteBtn.addEventListener('click', savePalette);

// keyboard shortcuts
window.addEventListener('keydown', (e)=>{
  if(e.code === 'Space'){
    e.preventDefault(); randomize();
  } else if(e.key.toLowerCase()==='c' && (e.ctrlKey || e.metaKey)){
    // ctrl/cmd + c reserved; ignore
  } else if(e.key.toLowerCase()==='c'){
    exportCSS();
  } else if(e.key.toLowerCase()==='s'){
    savePalette();
  }
});

// make sure palette reflects preview on init and on changes
// Keep "palette" array in sync — initially populate from preview
const observer = new MutationObserver(()=> {
  // if preview changed, set palette from swatches
  const colors = Array.from(swatches.querySelectorAll('.swatch')).map(s=>s.getAttribute('data-hex') || getComputedStyle(s).backgroundColor);
  renderPalette(colors);
});
observer.observe(swatches, { childList:true, subtree:true });

init();
