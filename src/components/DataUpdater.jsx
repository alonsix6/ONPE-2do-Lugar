import { useState } from 'react';

const LS_KEY = 'onpe-2026-data';
const DASHBOARD_URL = 'https://segundo-lugar-onpe26.netlify.app';

// Script v5 del usuario — funciona en consola de ONPE
// Al final abre el dashboard con los datos via hash fragment
const SCRAPER_SCRIPT = `(async () => {

const DEPARTAMENTOS = [
  { nombre: 'Amazonas',      cod: '010000' },
  { nombre: 'Ancash',        cod: '020000' },
  { nombre: 'Apurimac',      cod: '030000' },
  { nombre: 'Arequipa',      cod: '040000' },
  { nombre: 'Ayacucho',      cod: '050000' },
  { nombre: 'Cajamarca',     cod: '060000' },
  { nombre: 'Cusco',         cod: '070000' },
  { nombre: 'Huancavelica',  cod: '080000' },
  { nombre: 'Huanuco',       cod: '090000' },
  { nombre: 'Ica',           cod: '100000' },
  { nombre: 'Junin',         cod: '110000' },
  { nombre: 'La Libertad',   cod: '120000' },
  { nombre: 'Lambayeque',    cod: '130000' },
  { nombre: 'Lima',          cod: '140000' },
  { nombre: 'Loreto',        cod: '150000' },
  { nombre: 'Madre de Dios', cod: '160000' },
  { nombre: 'Moquegua',      cod: '170000' },
  { nombre: 'Pasco',         cod: '180000' },
  { nombre: 'Piura',         cod: '190000' },
  { nombre: 'Puno',          cod: '200000' },
  { nombre: 'San Martin',    cod: '210000' },
  { nombre: 'Tacna',         cod: '220000' },
  { nombre: 'Tumbes',        cod: '230000' },
  { nombre: 'Callao',        cod: '240000' },
  { nombre: 'Ucayali',       cod: '250000' },
];

async function get(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  const text = await r.text();
  if (!text || text.length < 10) return null;
  try {
    const j = JSON.parse(text);
    return j.success ? j.data : null;
  } catch(e) {
    return null;
  }
}

function findCand(arr, keyword) {
  const norm = s => s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toUpperCase();
  return arr.find(c => c.nombreCandidato && norm(c.nombreCandidato).includes(norm(keyword)));
}

console.log('%cONPE 2026 — Bottom-Up v5', 'color:#003770;font-size:15px;font-weight:bold');
console.log('Consultando 25 regiones...\\n');

const regiones = [];
let totalVotosPendEst = 0;

for (const dep of DEPARTAMENTOS) {
  const [totales, votos] = await Promise.all([
    get('/presentacion-backend/resumen-general/totales?idAmbitoGeografico=1&idEleccion=10&tipoFiltro=ubigeo_nivel_01&idUbigeoDepartamento=' + dep.cod),
    get('/presentacion-backend/eleccion-presidencial/participantes-ubicacion-geografica-nombre?tipoFiltro=ubigeo_nivel_01&idAmbitoGeografico=1&ubigeoNivel1=' + dep.cod + '&idEleccion=10'),
  ]);

  if (!totales || !votos) { console.warn('Sin datos: ' + dep.nombre); continue; }

  const candidatos = votos.filter(c => c.porcentajeVotosValidos != null);
  const rla     = findCand(candidatos, 'LOPEZ ALIAGA');
  const sanchez = findCand(candidatos, 'SANCHEZ PALOMINO');
  const keiko   = findCand(candidatos, 'FUJIMORI');
  const belmont = findCand(candidatos, 'BELMONT');
  const nieto   = findCand(candidatos, 'NIETO');

  if (!rla || !sanchez) { console.warn('Candidatos no encontrados: ' + dep.nombre); continue; }

  const totalActas     = totales.totalActas || 0;
  const contabilizadas = totales.contabilizadas || 0;
  const actasPend      = totalActas - contabilizadas;
  const pctProcesado   = totales.actasContabilizadas || 0;

  const totalValidosReg = rla.porcentajeVotosValidos > 0
    ? rla.totalVotosValidos / (rla.porcentajeVotosValidos / 100) : 0;
  const votosXActa = contabilizadas > 0 ? totalValidosReg / contabilizadas : 160;
  const votosPend  = actasPend * votosXActa;

  const pctRla     = rla.porcentajeVotosValidos;
  const pctSanchez = sanchez.porcentajeVotosValidos;
  const delta      = Math.round(votosPend * ((pctSanchez - pctRla) / 100));

  totalVotosPendEst += votosPend;

  regiones.push({
    nombre: dep.nombre, cod: dep.cod,
    pctProc: parseFloat(pctProcesado.toFixed(1)),
    totalActas, contabilizadas, actasPend,
    votosPend: Math.round(votosPend),
    pctRla: parseFloat(pctRla.toFixed(2)),
    pctSanchez: parseFloat(pctSanchez.toFixed(2)),
    pctKeiko:   keiko   ? parseFloat(keiko.porcentajeVotosValidos.toFixed(2))   : null,
    pctBelmont: belmont ? parseFloat(belmont.porcentajeVotosValidos.toFixed(2)) : null,
    pctNieto:   nieto   ? parseFloat(nieto.porcentajeVotosValidos.toFixed(2))   : null,
    votosRla:     rla.totalVotosValidos,
    votosSanchez: sanchez.totalVotosValidos,
    votosKeiko:   keiko   ? keiko.totalVotosValidos   : null,
    votosBelmont: belmont ? belmont.totalVotosValidos : null,
    votosNieto:   nieto   ? nieto.totalVotosValidos   : null,
    delta,
    favorDe: delta > 0 ? 'SANCHEZ' : 'RLA',
    todosLosCandidatos: candidatos
      .sort((a,b) => b.totalVotosValidos - a.totalVotosValidos)
      .map(c => ({
        nombre:  c.nombreCandidato,
        partido: c.nombreAgrupacionPolitica,
        votos:   c.totalVotosValidos,
        pct:     c.porcentajeVotosValidos,
      })),
  });

  await new Promise(r => setTimeout(r, 200));
}

// Gap calculado desde suma de regiones (no hardcodeado)
const rlaNacVotos  = regiones.reduce((s,r) => s + r.votosRla, 0);
const sanNacVotos  = regiones.reduce((s,r) => s + r.votosSanchez, 0);
const GAP_ACTUAL   = rlaNacVotos - sanNacVotos;

const totalActasNacReg       = regiones.reduce((s,r) => s + r.totalActas, 0);
const totalContabilizadasReg = regiones.reduce((s,r) => s + r.contabilizadas, 0);

// Intentar endpoint nacional para % exacto (puede fallar con 204)
let nacOficial = null;
try {
  nacOficial = await get('/presentacion-backend/resumen-general/totales?idAmbitoGeografico=1&idEleccion=10&tipoFiltro=nacional');
  if (nacOficial) console.log('Nacional OK: ' + nacOficial.actasContabilizadas + '% (' + nacOficial.contabilizadas + '/' + nacOficial.totalActas + ')');
} catch(e) {}

const nacional = nacOficial || {
  actasContabilizadas: parseFloat((totalContabilizadasReg / totalActasNacReg * 100).toFixed(3)),
  contabilizadas: totalContabilizadasReg,
  totalActas: totalActasNacReg,
};
const pctProcesadoNac = nacional.actasContabilizadas;
const nacSource = nacOficial ? 'oficial' : 'regional';
console.log('% procesado (' + nacSource + '): ' + pctProcesadoNac + '%');

regiones.sort((a,b) => Math.abs(b.delta) - Math.abs(a.delta));
const deltaTotalSanchez = regiones.reduce((s,r) => s + r.delta, 0);
const gapFinal = GAP_ACTUAL - deltaTotalSanchez;

console.log(regiones.length + '/25 regiones OK');
console.log('% procesado: ' + pctProcesadoNac + '%');
console.log('Gap actual: ' + GAP_ACTUAL.toLocaleString('es-PE'));
console.log('Delta Sanchez: ' + deltaTotalSanchez.toLocaleString('es-PE'));
console.log('Gap final: ' + Math.round(gapFinal).toLocaleString('es-PE'));
console.log(gapFinal > 0 ? 'RLA 2do lugar' : 'Sanchez 2do lugar');

const exportData = {
  timestamp: Date.now(),
  pctProcesado: pctProcesadoNac,
  totalActasNac: nacional.totalActas,
  totalContabilizadas: nacional.contabilizadas,
  nacional: nacional,
  nacSource: nacSource,
  gapActual: GAP_ACTUAL,
  rlaNacVotos,
  sanNacVotos,
  deltaSanchez: Math.round(deltaTotalSanchez),
  gapFinal: Math.round(gapFinal),
  resultado: gapFinal > 0 ? 'RLA' : 'SANCHEZ',
  regionesAnalizadas: regiones.length,
  regiones,
};

// Abrir dashboard con datos
const enc = btoa(unescape(encodeURIComponent(JSON.stringify(exportData))));
window.open('${DASHBOARD_URL}/#data=' + enc, '_blank');

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
        <p>3. Copia el script de abajo y pegalo en la consola → Enter</p>
        <p>4. El dashboard se abre con datos frescos automaticamente</p>
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
        <p><strong>Alternativa:</strong> pega el JSON del script directamente</p>
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
