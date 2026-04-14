export function calcBottomUp(regiones, gapActual, adjustments = {}) {
  const regionesAjustadas = regiones.map(r => {
    if (!adjustments[r.nombre]) return r;
    const adj = adjustments[r.nombre];
    const pctSanchezNew = adj.pctSanchez ?? r.sanchez.pct;
    const pctRlaNew = adj.pctRla ?? r.rla.pct;
    const deltaNew = r.votosPend * ((pctSanchezNew - pctRlaNew) / 100);
    return { ...r, delta: Math.round(deltaNew) };
  });

  const deltaTotalSanchez = regionesAjustadas.reduce((s, r) => s + r.delta, 0);
  const gapFinal = gapActual - deltaTotalSanchez;

  return {
    deltaTotalSanchez: Math.round(deltaTotalSanchez),
    gapFinal: Math.round(gapFinal),
    resultado: gapFinal > 0 ? 'RLA' : 'SANCHEZ',
    margen: Math.abs(gapFinal),
    regionesAjustadas,
  };
}

export function calcSensitivity(regiones, gapActual, steps = 50) {
  const caj = regiones.find(r => r.nombre === 'Cajamarca');
  if (!caj) return [];
  const results = [];
  for (let pct = 30; pct <= 55; pct += (55 - 30) / steps) {
    const deltaAdj = caj.votosPend * ((pct - caj.rla.pct) / 100);
    const deltaTotal = regiones.reduce((s, r) =>
      r.nombre === 'Cajamarca' ? s + deltaAdj : s + r.delta, 0
    );
    results.push({ pct: Math.round(pct * 10) / 10, gapFinal: Math.round(gapActual - deltaTotal) });
  }
  return results;
}
