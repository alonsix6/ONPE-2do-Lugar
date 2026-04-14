import { useState } from 'react';

const LS_KEY = 'onpe-2026-data';
const DASHBOARD_URL = 'https://segundo-lugar-onpe26.netlify.app';

// Script para consola de ONPE — usa URLs relativas (corre en el dominio ONPE)
// Usa .text() + JSON.parse() para manejar respuestas vacias
// Calcula gap desde datos nacionales (NO hardcodeado)
const SCRAPER_SCRIPT = `(async () => {
try {
const BASE = '/presentacion-backend';
const DEPS = [
  {n:'Amazonas',c:'010000'},{n:'Ancash',c:'020000'},{n:'Apurimac',c:'030000'},
  {n:'Arequipa',c:'040000'},{n:'Ayacucho',c:'050000'},{n:'Cajamarca',c:'060000'},
  {n:'Cusco',c:'070000'},{n:'Huancavelica',c:'080000'},{n:'Huanuco',c:'090000'},
  {n:'Ica',c:'100000'},{n:'Junin',c:'110000'},{n:'La Libertad',c:'120000'},
  {n:'Lambayeque',c:'130000'},{n:'Lima',c:'140000'},{n:'Loreto',c:'150000'},
  {n:'Madre de Dios',c:'160000'},{n:'Moquegua',c:'170000'},{n:'Pasco',c:'180000'},
  {n:'Piura',c:'190000'},{n:'Puno',c:'200000'},{n:'San Martin',c:'210000'},
  {n:'Tacna',c:'220000'},{n:'Tumbes',c:'230000'},{n:'Callao',c:'240000'},
  {n:'Ucayali',c:'250000'}
];

async function get(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  console.log(url.split('?')[0].split('/').pop(), '-> HTTP', r.status, r.headers.get('content-type'));
  const t = await r.text();
  if (!t || t.length < 10) { console.warn('Respuesta vacia (' + t.length + ' chars)'); return null; }
  if (t.startsWith('<')) { console.warn('Respuesta HTML, no JSON. Estas en resultadoelectoral.onpe.gob.pe?'); return null; }
  try { const j = JSON.parse(t); if (!j.success) { console.warn('success=false'); return null; } return j.data; }
  catch (e) { console.warn('JSON parse error:', e.message, 'Body:', t.slice(0, 80)); return null; }
}

function find(arr, kw) {
  const nm = s => s.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toUpperCase();
  return arr.find(c => c.nombreCandidato && nm(c.nombreCandidato).includes(nm(kw)));
}

console.log('Obteniendo datos nacionales...');
console.log('URL base:', location.origin);
const nacTot = await get(BASE + '/resumen-general/totales?idAmbitoGeografico=1&idEleccion=10&tipoFiltro=nacional');
const nacVot = await get(BASE + '/eleccion-presidencial/participantes-ubicacion-geografica-nombre?tipoFiltro=nacional&idAmbitoGeografico=1&idEleccion=10');
console.log('nacTot:', nacTot ? 'OK (' + (nacTot.contabilizadas||'?') + ' actas)' : 'FALLO');
console.log('nacVot:', nacVot ? 'OK (' + (Array.isArray(nacVot) ? nacVot.length + ' candidatos' : typeof nacVot) + ')' : 'FALLO');
if (!nacTot || !nacVot) { console.error('No se pudo obtener datos nacionales. Verifica que estas en resultadoelectoral.onpe.gob.pe'); return; }

const cands = nacVot.filter(c => c.porcentajeVotosValidos != null);
const rlaNac = find(cands, 'LOPEZ ALIAGA');
const sanNac = find(cands, 'SANCHEZ PALOMINO');
const gapActual = rlaNac && sanNac ? rlaNac.totalVotosValidos - sanNac.totalVotosValidos : 0;
console.log('Gap actual RLA-Sanchez: ' + gapActual.toLocaleString());

const regiones = [];
for (let i = 0; i < DEPS.length; i++) {
  const d = DEPS[i];
  const [tot, vot] = await Promise.all([
    get(BASE + '/resumen-general/totales?idAmbitoGeografico=1&idEleccion=10&tipoFiltro=ubigeo_nivel_01&idUbigeoDepartamento=' + d.c),
    get(BASE + '/eleccion-presidencial/participantes-ubicacion-geografica-nombre?tipoFiltro=ubigeo_nivel_01&idAmbitoGeografico=1&ubigeoNivel1=' + d.c + '&idEleccion=10')
  ]);
  if (!tot || !vot) { console.warn(d.n + ': sin datos'); continue; }
  const rla = find(vot, 'LOPEZ ALIAGA');
  const san = find(vot, 'SANCHEZ PALOMINO');
  if (!rla || !san) { console.warn(d.n + ': candidatos no encontrados'); continue; }
  const ta = tot.totalActas || 0, co = tot.contabilizadas || 0, ac = tot.actasContabilizadas || 0;
  const ap = ta - co;
  const tvr = rla.porcentajeVotosValidos > 0 ? rla.totalVotosValidos / (rla.porcentajeVotosValidos / 100) : 0;
  const vxa = co > 0 ? tvr / co : 160;
  const vp = ap * vxa;
  const delta = vp * ((san.porcentajeVotosValidos - rla.porcentajeVotosValidos) / 100);
  regiones.push({
    nombre: d.n, cod: d.c, pctProcesado: ac, totalActas: ta, contabilizadas: co,
    actasPend: ap, votosPend: Math.round(vp),
    rla: { votos: rla.totalVotosValidos, pct: rla.porcentajeVotosValidos },
    sanchez: { votos: san.totalVotosValidos, pct: san.porcentajeVotosValidos },
    delta: Math.round(delta), favorDe: delta > 0 ? 'SANCHEZ' : 'RLA',
    keiko: null, belmont: null, todosLosCandidatos: []
  });
  console.log((i + 1) + '/25 ' + d.n + ' OK');
  if (i % 5 === 4) await new Promise(r => setTimeout(r, 200));
}
if (!regiones.length) { console.error('No se obtuvieron regiones'); return; }
const dt = regiones.reduce((s, r) => s + r.delta, 0);
const gf = gapActual - dt;
regiones.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
const R = {
  timestamp: Date.now(),
  nacional: nacTot,
  candidatosNacionales: cands.map(x => ({ nombre: x.nombreCandidato, partido: x.nombreAgrupacionPolitica, votos: x.totalVotosValidos, pct: x.porcentajeVotosValidos })),
  gapActual: gapActual,
  deltaTotalSanchez: Math.round(dt),
  gapFinal: Math.round(gf),
  resultado: gf > 0 ? 'RLA' : 'SANCHEZ',
  regiones: regiones
};
console.log(regiones.length + ' regiones. Gap: ' + gapActual.toLocaleString() + ' -> Final: ' + gf.toLocaleString() + ' -> ' + R.resultado);
const enc = btoa(unescape(encodeURIComponent(JSON.stringify(R))));
window.open('${DASHBOARD_URL}/#data=' + enc, '_blank');
} catch (e) { console.error('Error:', e); }
})();`;

export function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.regiones && parsed.regiones.length > 0) return parsed;
  } catch {}
  return null;
}

export function saveToLocalStorage(data) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {}
}

export function loadFromHash() {
  try {
    const hash = window.location.hash;
    if (!hash || !hash.includes('data=')) return null;
    const encoded = hash.split('data=')[1];
    if (!encoded) return null;
    const json = decodeURIComponent(escape(atob(encoded)));
    const parsed = JSON.parse(json);
    if (parsed && parsed.regiones && parsed.regiones.length > 0) {
      window.history.replaceState(null, '', window.location.pathname);
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse hash data:', e.message);
  }
  return null;
}

export default function DataUpdater({ onUpdate }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [status, setStatus] = useState(null);
  const [showScript, setShowScript] = useState(false);

  const handlePaste = () => {
    try {
      const data = JSON.parse(text);
      if (!data.regiones || data.regiones.length === 0) {
        setStatus('Error: JSON no tiene regiones');
        return;
      }
      saveToLocalStorage(data);
      onUpdate(data);
      setStatus(`OK: ${data.regiones.length} regiones cargadas`);
      setText('');
      setTimeout(() => { setOpen(false); setStatus(null); }, 1500);
    } catch (e) {
      setStatus('Error: JSON invalido');
    }
  };

  if (!open) {
    return (
      <button className="updater-btn" onClick={() => setOpen(true)}>
        Actualizar datos (desde ONPE)
      </button>
    );
  }

  return (
    <div className="updater-panel">
      <div className="updater-header">
        <span className="section-title" style={{ margin: 0 }}>Actualizar datos desde ONPE</span>
        <button className="updater-close" onClick={() => { setOpen(false); setStatus(null); }}>x</button>
      </div>

      <div className="updater-steps">
        <p><strong>Pasos:</strong></p>
        <p>1. Abre <code>resultadoelectoral.onpe.gob.pe</code></p>
        <p>2. F12 → Console</p>
        <p>3. Pega el script → Enter</p>
        <p>4. El dashboard se abre con datos frescos</p>
      </div>

      <div className="updater-script-toggle">
        <button className="refresh-btn" onClick={() => setShowScript(!showScript)}>
          {showScript ? 'Ocultar script' : 'Ver script para copiar'}
        </button>
      </div>

      {showScript && (
        <textarea
          className="updater-textarea script"
          readOnly
          value={SCRAPER_SCRIPT}
          onClick={e => { e.target.select(); navigator.clipboard?.writeText(SCRAPER_SCRIPT); setStatus('Script copiado'); }}
        />
      )}

      <div className="updater-steps" style={{ marginTop: 12 }}>
        <p><strong>Alternativa:</strong> pega JSON directamente</p>
      </div>

      <textarea
        className="updater-textarea"
        placeholder='Pegar JSON aqui...'
        value={text}
        onChange={e => setText(e.target.value)}
      />

      <div className="updater-actions">
        <button className="refresh-btn" onClick={handlePaste} disabled={!text.trim()}>
          Cargar datos
        </button>
        {status && (
          <span className={status.startsWith('OK') || status.startsWith('Script') ? 'updater-ok' : 'updater-err'}>
            {status}
          </span>
        )}
      </div>
    </div>
  );
}
