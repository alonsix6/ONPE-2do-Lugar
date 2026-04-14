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

// Calculate at what % of actas Sánchez would catch RLA (if current trends hold)
export function calcBreakevenByProgress(regiones, gapActual, nacional) {
  if (!nacional || !regiones?.length) return null;

  const currentPct = nacional.actasContabilizadas || 0;
  const deltaTotalSanchez = regiones.reduce((s, r) => s + r.delta, 0);
  const totalVotosPend = regiones.reduce((s, r) => s + r.votosPend, 0);

  // If delta is <= 0, Sánchez is not closing the gap at all
  if (deltaTotalSanchez <= 0) {
    return { crossoverPct: null, neverCatches: true, sanchezWins: false, margin: gapActual, totalVotosPend, deltaTotalSanchez };
  }

  const gapFinal = gapActual - deltaTotalSanchez;

  // If Sánchez already projected to win
  if (gapFinal <= 0) {
    return { crossoverPct: currentPct, neverCatches: false, sanchezWins: true, margin: Math.abs(gapFinal), totalVotosPend, deltaTotalSanchez };
  }

  // Crossover: fraction of remaining votes needed to erase gap
  const fractionNeeded = gapActual / deltaTotalSanchez;
  const crossoverPct = currentPct + fractionNeeded * (100 - currentPct);

  return {
    crossoverPct: crossoverPct > 100 ? null : Math.round(crossoverPct * 10) / 10,
    neverCatches: crossoverPct > 100,
    sanchezWins: false,
    margin: gapFinal,
    totalVotosPend,
    deltaTotalSanchez,
    // What margin % Sánchez needs in remaining votes
    sanchezNeedsPct: totalVotosPend > 0 ? parseFloat((gapActual / totalVotosPend * 100).toFixed(1)) : 0,
    // What margin % Sánchez currently has in remaining votes
    sanchezCurrentPct: totalVotosPend > 0 ? parseFloat((deltaTotalSanchez / totalVotosPend * 100).toFixed(1)) : 0,
  };
}
