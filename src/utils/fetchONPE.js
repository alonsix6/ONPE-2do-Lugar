// Client-side ONPE API fetcher — runs in the browser, bypasses WAF
// The WAF blocks server-side requests but browsers work fine

import { DEPARTAMENTOS } from '../constants/regions';

const BASE = 'https://resultadoelectoral.onpe.gob.pe/presentacion-backend';

const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

async function fetchRegion(dep) {
  try {
    const [totalesRes, votosRes] = await Promise.all([
      fetch(`${BASE}/resumen-general/totales?idAmbitoGeografico=1&idEleccion=10&tipoFiltro=ubigeo_nivel_01&idUbigeoDepartamento=${dep.cod}`),
      fetch(`${BASE}/eleccion-presidencial/participantes-ubicacion-geografica-nombre?tipoFiltro=ubigeo_nivel_01&idAmbitoGeografico=1&ubigeoNivel1=${dep.cod}&idEleccion=10`),
    ]);

    if (!totalesRes.ok || !votosRes.ok) return null;

    const totales = await totalesRes.json();
    const votos = await votosRes.json();

    if (!totales.success || !votos.success) return null;

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
      rla: { votos: rla.totalVotosValidos, pct: rla.porcentajeVotosValidos },
      sanchez: { votos: san.totalVotosValidos, pct: san.porcentajeVotosValidos },
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
    console.warn(`Region ${dep.nombre} failed:`, e.message);
    return null;
  }
}

// Fetch regions in batches to avoid overwhelming the API
async function fetchInBatches(deps, batchSize = 5) {
  const results = [];
  for (let i = 0; i < deps.length; i += batchSize) {
    const batch = deps.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fetchRegion));
    results.push(...batchResults);
  }
  return results;
}

export async function fetchONPEDirect() {
  // Nacional
  const [nacRes, votNacRes] = await Promise.all([
    fetch(`${BASE}/resumen-general/totales?idAmbitoGeografico=1&idEleccion=10&tipoFiltro=nacional`),
    fetch(`${BASE}/eleccion-presidencial/participantes-ubicacion-geografica-nombre?tipoFiltro=nacional&idAmbitoGeografico=1&idEleccion=10`),
  ]);

  if (!nacRes.ok || !votNacRes.ok) {
    throw new Error(`Nacional fetch failed: ${nacRes.status} / ${votNacRes.status}`);
  }

  const nacional = await nacRes.json();
  const votNac = await votNacRes.json();

  // Regiones en batches de 5
  const resultados = await fetchInBatches(DEPARTAMENTOS, 5);
  const regiones = resultados.filter(Boolean);

  const deltaTotalSanchez = regiones.reduce((s, r) => s + r.delta, 0);

  // Gap actual
  const candidatosNac = (votNac.data || []).filter(c => c.porcentajeVotosValidos != null);
  const rlaNac = candidatosNac.find(c => norm(c.nombreCandidato || '').includes('LOPEZ ALIAGA'));
  const sanNac = candidatosNac.find(c => norm(c.nombreCandidato || '').includes('SANCHEZ PALOMINO'));
  const gapActual = rlaNac && sanNac ? rlaNac.totalVotosValidos - sanNac.totalVotosValidos : null;
  const gapFinal = gapActual !== null ? gapActual - deltaTotalSanchez : null;

  return {
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
  };
}
