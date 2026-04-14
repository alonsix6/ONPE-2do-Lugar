import { useState, useEffect } from 'react';

const LS_KEY = 'onpe-2026-data';

// Script que el usuario corre en la consola del tab de ONPE
const SCRAPER_SCRIPT = `// Correr en la consola de: resultadoelectoral.onpe.gob.pe
(async()=>{
  const B='https://resultadoelectoral.onpe.gob.pe/presentacion-backend';
  const D=[
    {n:'Amazonas',c:'010000'},{n:'Ancash',c:'020000'},{n:'Apurímac',c:'030000'},
    {n:'Arequipa',c:'040000'},{n:'Ayacucho',c:'050000'},{n:'Cajamarca',c:'060000'},
    {n:'Cusco',c:'070000'},{n:'Huancavelica',c:'080000'},{n:'Huánuco',c:'090000'},
    {n:'Ica',c:'100000'},{n:'Junín',c:'110000'},{n:'La Libertad',c:'120000'},
    {n:'Lambayeque',c:'130000'},{n:'Lima',c:'140000'},{n:'Loreto',c:'150000'},
    {n:'Madre de Dios',c:'160000'},{n:'Moquegua',c:'170000'},{n:'Pasco',c:'180000'},
    {n:'Piura',c:'190000'},{n:'Puno',c:'200000'},{n:'San Martín',c:'210000'},
    {n:'Tacna',c:'220000'},{n:'Tumbes',c:'230000'},{n:'Callao',c:'240000'},
    {n:'Ucayali',c:'250000'}
  ];
  const nm=s=>s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toUpperCase();
  const [nac,vnac]=await Promise.all([
    fetch(B+'/resumen-general/totales?idAmbitoGeografico=1&idEleccion=10&tipoFiltro=nacional').then(r=>r.json()),
    fetch(B+'/eleccion-presidencial/participantes-ubicacion-geografica-nombre?tipoFiltro=nacional&idAmbitoGeografico=1&idEleccion=10').then(r=>r.json())
  ]);
  const regs=[];
  for(let i=0;i<D.length;i+=5){
    const batch=D.slice(i,i+5);
    const res=await Promise.all(batch.map(async d=>{
      const[t,v]=await Promise.all([
        fetch(B+'/resumen-general/totales?idAmbitoGeografico=1&idEleccion=10&tipoFiltro=ubigeo_nivel_01&idUbigeoDepartamento='+d.c).then(r=>r.json()),
        fetch(B+'/eleccion-presidencial/participantes-ubicacion-geografica-nombre?tipoFiltro=ubigeo_nivel_01&idAmbitoGeografico=1&ubigeoNivel1='+d.c+'&idEleccion=10').then(r=>r.json())
      ]);
      if(!t.success||!v.success)return null;
      const cs=v.data.filter(x=>x.porcentajeVotosValidos!=null);
      const rla=cs.find(x=>nm(x.nombreCandidato||'').includes('LOPEZ ALIAGA'));
      const san=cs.find(x=>nm(x.nombreCandidato||'').includes('SANCHEZ PALOMINO'));
      if(!rla||!san)return null;
      const{totalActas:ta,contabilizadas:co,actasContabilizadas:ac}=t.data;
      const ap=ta-co;const tvr=rla.totalVotosValidos/(rla.porcentajeVotosValidos/100);
      const vxa=co>0?tvr/co:160;const vp=ap*vxa;
      const delta=vp*((san.porcentajeVotosValidos-rla.porcentajeVotosValidos)/100);
      return{nombre:d.n,cod:d.c,pctProcesado:ac,totalActas:ta,contabilizadas:co,actasPend:ap,
        votosPend:Math.round(vp),rla:{votos:rla.totalVotosValidos,pct:rla.porcentajeVotosValidos},
        sanchez:{votos:san.totalVotosValidos,pct:san.porcentajeVotosValidos},
        delta:Math.round(delta),favorDe:delta>0?'SANCHEZ':'RLA',
        keiko:null,belmont:null,todosLosCandidatos:[]};
    }));
    regs.push(...res.filter(Boolean));
  }
  const cns=(vnac.data||[]).filter(x=>x.porcentajeVotosValidos!=null);
  const rn=cns.find(x=>nm(x.nombreCandidato||'').includes('LOPEZ ALIAGA'));
  const sn=cns.find(x=>nm(x.nombreCandidato||'').includes('SANCHEZ PALOMINO'));
  const gap=rn&&sn?rn.totalVotosValidos-sn.totalVotosValidos:null;
  const dt=regs.reduce((s,r)=>s+r.delta,0);
  const gf=gap!==null?gap-dt:null;
  const result={timestamp:Date.now(),nacional:nac.success?nac.data:null,
    candidatosNacionales:cns.map(x=>({nombre:x.nombreCandidato,partido:x.nombreAgrupacionPolitica,votos:x.totalVotosValidos,pct:x.porcentajeVotosValidos})),
    gapActual:gap,deltaTotalSanchez:Math.round(dt),gapFinal:gf!==null?Math.round(gf):null,
    resultado:gf>0?'RLA':'SANCHEZ',regiones:regs.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta))};
  await navigator.clipboard.writeText(JSON.stringify(result));
  console.log('✅ Datos copiados al portapapeles (' + regs.length + ' regiones)');
  console.log('Gap actual:', gap?.toLocaleString(), '→ Gap final:', gf?.toLocaleString(), '→', result.resultado);
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
      setStatus('Error: JSON inválido — ' + e.message);
    }
  };

  if (!open) {
    return (
      <button className="updater-btn" onClick={() => setOpen(true)}>
        Actualizar datos (consola)
      </button>
    );
  }

  return (
    <div className="updater-panel">
      <div className="updater-header">
        <span className="section-title" style={{ margin: 0 }}>Actualizar datos manualmente</span>
        <button className="updater-close" onClick={() => { setOpen(false); setStatus(null); }}>×</button>
      </div>

      <div className="updater-steps">
        <p>1. Abre <code>resultadoelectoral.onpe.gob.pe</code> en otra pestaña</p>
        <p>2. Abre la consola (F12 → Console)</p>
        <p>3. Pega este script y presiona Enter:</p>
      </div>

      <div className="updater-script-toggle">
        <button className="refresh-btn" onClick={() => setShowScript(!showScript)}>
          {showScript ? 'Ocultar script' : 'Mostrar script para copiar'}
        </button>
      </div>

      {showScript && (
        <textarea
          className="updater-textarea script"
          readOnly
          value={SCRAPER_SCRIPT}
          onClick={e => { e.target.select(); navigator.clipboard?.writeText(SCRAPER_SCRIPT); }}
        />
      )}

      <div className="updater-steps">
        <p>4. El script copia los datos al portapapeles automáticamente</p>
        <p>5. Pega aquí abajo (Ctrl+V):</p>
      </div>

      <textarea
        className="updater-textarea"
        placeholder='Pegar JSON aquí...'
        value={text}
        onChange={e => setText(e.target.value)}
      />

      <div className="updater-actions">
        <button className="refresh-btn" onClick={handlePaste} disabled={!text.trim()}>
          Cargar datos
        </button>
        {status && (
          <span className={status.startsWith('OK') ? 'updater-ok' : 'updater-err'}>
            {status}
          </span>
        )}
      </div>
    </div>
  );
}
