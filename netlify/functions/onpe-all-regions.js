const BASE = 'https://resultadoelectoral.onpe.gob.pe/presentacion-backend';

const DEPARTAMENTOS = [
  { nombre: 'Amazonas', cod: '010000' },
  { nombre: 'Ancash', cod: '020000' },
  { nombre: 'Apurímac', cod: '030000' },
  { nombre: 'Arequipa', cod: '040000' },
  { nombre: 'Ayacucho', cod: '050000' },
  { nombre: 'Cajamarca', cod: '060000' },
  { nombre: 'Cusco', cod: '070000' },
  { nombre: 'Huancavelica', cod: '080000' },
  { nombre: 'Huánuco', cod: '090000' },
  { nombre: 'Ica', cod: '100000' },
  { nombre: 'Junín', cod: '110000' },
  { nombre: 'La Libertad', cod: '120000' },
  { nombre: 'Lambayeque', cod: '130000' },
  { nombre: 'Lima', cod: '140000' },
  { nombre: 'Loreto', cod: '150000' },
  { nombre: 'Madre de Dios', cod: '160000' },
  { nombre: 'Moquegua', cod: '170000' },
  { nombre: 'Pasco', cod: '180000' },
  { nombre: 'Piura', cod: '190000' },
  { nombre: 'Puno', cod: '200000' },
  { nombre: 'San Martín', cod: '210000' },
  { nombre: 'Tacna', cod: '220000' },
  { nombre: 'Tumbes', cod: '230000' },
  { nombre: 'Callao', cod: '240000' },
  { nombre: 'Ucayali', cod: '250000' },
];

const HEADERS = {
  'Accept': 'application/json',
  'Referer': 'https://resultadoelectoral.onpe.gob.pe/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
};

async function safeFetch(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response from ${url}: ${text.slice(0, 200)}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchRegion(dep) {
  try {
    const [totales, votos] = await Promise.all([
      safeFetch(`${BASE}/resumen-general/totales?idAmbitoGeografico=1&idEleccion=10&tipoFiltro=ubigeo_nivel_01&idUbigeoDepartamento=${dep.cod}`),
      safeFetch(`${BASE}/eleccion-presidencial/participantes-ubicacion-geografica-nombre?tipoFiltro=ubigeo_nivel_01&idAmbitoGeografico=1&ubigeoNivel1=${dep.cod}&idEleccion=10`),
    ]);

    if (!totales.success || !votos.success) return null;

    const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const candidatos = votos.data.filter(c => c.porcentajeVotosValidos != null);
    const rla = candidatos.find(c => norm(c.nombreCandidato || '').includes('LOPEZ ALIAGA'));
    const san = candidatos.find(c => norm(c.nombreCandidato || '').includes('SANCHEZ PALOMINO'));
    const keiko = candidatos.find(c => norm(c.nombreCandidato || '').includes('FUJIMORI'));
    const belmont = candidatos.find(c => norm(c.nombreCandidato || '').includes('BELMONT'));

    if (!rla || !san) return null;

    const { totalActas, contabilizadas, actasContabilizadas } = totales.data;
    const actasPend = totalActas - contabilizadas;
    const totalValidosReg = rla.totalVotosValidos / (rla.porcentajeVotosValidos / 100);
    const votosXActa = contabilizadas > 0 ? totalValidosReg / contabilizadas : 160;
    const votosPend = actasPend * votosXActa;
    const delta = votosPend * ((san.porcentajeVotosValidos - rla.porcentajeVotosValidos) / 100);

    return {
      nombre: dep.nombre,
      cod: dep.cod,
      pctProcesado: actasContabilizadas,
      totalActas,
      contabilizadas,
      actasPend,
      votosPend: Math.round(votosPend),
      rla: {
        votos: rla.totalVotosValidos,
        pct: rla.porcentajeVotosValidos,
      },
      sanchez: {
        votos: san.totalVotosValidos,
        pct: san.porcentajeVotosValidos,
      },
      keiko: keiko ? { votos: keiko.totalVotosValidos, pct: keiko.porcentajeVotosValidos } : null,
      belmont: belmont ? { votos: belmont.totalVotosValidos, pct: belmont.porcentajeVotosValidos } : null,
      delta: Math.round(delta),
      favorDe: delta > 0 ? 'SANCHEZ' : 'RLA',
      todosLosCandidatos: candidatos.map(c => ({
        nombre: c.nombreCandidato,
        partido: c.nombreAgrupacionPolitica,
        votos: c.totalVotosValidos,
        pct: c.porcentajeVotosValidos,
      })),
    };
  } catch (e) {
    console.error(`Error fetching region ${dep.nombre}:`, e.message);
    return null;
  }
}

// Process regions in batches to avoid overwhelming ONPE API
async function fetchAllRegionsInBatches(deps, batchSize = 5) {
  const results = [];
  for (let i = 0; i < deps.length; i += batchSize) {
    const batch = deps.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fetchRegion));
    results.push(...batchResults);
  }
  return results;
}

export const handler = async () => {
  try {
    // Nacional (2 requests in parallel)
    const [nacional, votNac] = await Promise.all([
      safeFetch(`${BASE}/resumen-general/totales?idAmbitoGeografico=1&idEleccion=10&tipoFiltro=nacional`),
      safeFetch(`${BASE}/eleccion-presidencial/participantes-ubicacion-geografica-nombre?tipoFiltro=nacional&idAmbitoGeografico=1&idEleccion=10`),
    ]);

    // Regiones en batches de 5
    const resultados = await fetchAllRegionsInBatches(DEPARTAMENTOS, 5);
    const regiones = resultados.filter(Boolean);

    const deltaTotalSanchez = regiones.reduce((s, r) => s + r.delta, 0);

    // Gap actual desde votos nacionales
    const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const candidatosNac = (votNac.data || []).filter(c => c.porcentajeVotosValidos != null);
    const rlaNac = candidatosNac.find(c => norm(c.nombreCandidato || '').includes('LOPEZ ALIAGA'));
    const sanNac = candidatosNac.find(c => norm(c.nombreCandidato || '').includes('SANCHEZ PALOMINO'));
    const gapActual = rlaNac && sanNac ? rlaNac.totalVotosValidos - sanNac.totalVotosValidos : null;
    const gapFinal = gapActual !== null ? gapActual - deltaTotalSanchez : null;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=120',
      },
      body: JSON.stringify({
        timestamp: Date.now(),
        nacional: nacional.success ? nacional.data : null,
        candidatosNacionales: candidatosNac.map(c => ({
          nombre: c.nombreCandidato,
          partido: c.nombreAgrupacionPolitica,
          votos: c.totalVotosValidos,
          pct: c.porcentajeVotosValidos,
        })),
        gapActual,
        deltaTotalSanchez: Math.round(deltaTotalSanchez),
        gapFinal: gapFinal !== null ? Math.round(gapFinal) : null,
        resultado: gapFinal > 0 ? 'RLA' : 'SANCHEZ',
        regiones: regiones.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
      }),
    };
  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: err.message,
        hint: 'La API de ONPE puede estar temporalmente inaccesible o bloqueando requests desde este servidor.',
      }),
    };
  }
};
