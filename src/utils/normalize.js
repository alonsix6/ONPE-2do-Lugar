// Normalizes data from the user's console scraper format to the dashboard's internal format
// The user's script outputs a slightly different structure than the Netlify Function

export function normalizeData(raw) {
  if (!raw || !raw.regiones) return raw;

  // Already in dashboard format (has rla.pct as object)
  if (raw.regiones[0]?.rla?.pct !== undefined) return raw;

  // User's script format → dashboard format
  return {
    timestamp: raw.timestamp ? new Date(raw.timestamp).getTime() || Date.now() : Date.now(),
    nacional: raw.pctProcesado != null ? {
      actasContabilizadas: raw.pctProcesado,
      contabilizadas: raw.totalContabilizadas || 0,
      totalActas: raw.totalActasNac || 0,
    } : raw.nacional,
    candidatosNacionales: raw.candidatosNacionales || [],
    gapActual: raw.gapActual,
    deltaTotalSanchez: raw.deltaSanchez ?? raw.deltaTotalSanchez ?? 0,
    gapFinal: raw.gapFinal,
    resultado: raw.gapFinal > 0 ? 'RLA' : 'SANCHEZ',
    regiones: raw.regiones.map(normalizeRegion),
  };
}

function normalizeRegion(r) {
  // Already normalized
  if (r.rla?.pct !== undefined && r.sanchez?.pct !== undefined) return r;

  // User script format: pctRla, pctSanchez as flat fields
  return {
    nombre: r.nombre,
    cod: r.cod,
    pctProcesado: r.pctProc ?? r.pctProcesado ?? 0,
    totalActas: r.totalActas ?? 0,
    contabilizadas: r.contabilizadas ?? 0,
    actasPend: r.actasPend ?? 0,
    votosPend: r.votosPend ?? 0,
    rla: {
      votos: r.votosRla ?? r.rla?.votos ?? 0,
      pct: r.pctRla ?? r.rla?.pct ?? 0,
    },
    sanchez: {
      votos: r.votosSanchez ?? r.sanchez?.votos ?? 0,
      pct: r.pctSanchez ?? r.sanchez?.pct ?? 0,
    },
    keiko: r.pctKeiko != null ? { votos: r.votosKeiko ?? 0, pct: r.pctKeiko } : r.keiko,
    belmont: r.pctBelmont != null ? { votos: r.votosBelmont ?? 0, pct: r.pctBelmont } : r.belmont,
    delta: r.delta ?? 0,
    favorDe: r.favorDe ?? (r.delta > 0 ? 'SANCHEZ' : 'RLA'),
    todosLosCandidatos: r.todosLosCandidatos || [],
  };
}
