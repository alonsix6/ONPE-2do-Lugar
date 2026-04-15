export function calcBottomUp(regiones, gapActual, adjustments = {}) {
  const regionesAjustadas = regiones.map(r => {
    if (!adjustments[r.nombre]) return r;
    const adj = adjustments[r.nombre];
    const pctSanchezNew = adj.pctSanchez ?? r.sanchez.pct;
    const pctRlaNew = adj.pctRla ?? r.rla.pct;
    const deltaNew = r.votosPend * ((pctSanchezNew - pctRlaNew) / 100);
    return {
      ...r,
      delta: Math.round(deltaNew),
      rla: { ...r.rla, pct: pctRlaNew },
      sanchez: { ...r.sanchez, pct: pctSanchezNew },
    };
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

// Breakeven analysis: handles both RLA-ahead and Sánchez-ahead scenarios
export function calcBreakevenByProgress(regiones, gapActual, nacional) {
  if (!nacional || !regiones?.length) return null;

  const currentPct = nacional.actasContabilizadas || 0;
  const deltaTotalSanchez = regiones.reduce((s, r) => s + r.delta, 0);
  const totalVotosPend = regiones.reduce((s, r) => s + r.votosPend, 0);
  const gapFinal = gapActual - deltaTotalSanchez;

  // Who leads currently and who is projected to win
  const sanchezLeadsNow = gapActual < 0;
  const sanchezWinsProjected = gapFinal <= 0;

  // Sánchez already ahead in counted votes AND projected to stay ahead
  if (sanchezLeadsNow && sanchezWinsProjected) {
    return {
      crossoverPct: null, neverCatches: false, sanchezWins: true,
      sanchezLeadsNow: true,
      margin: Math.abs(gapFinal), totalVotosPend, deltaTotalSanchez,
      sanchezNeedsPct: 0,
      sanchezCurrentPct: totalVotosPend > 0 ? parseFloat((Math.abs(deltaTotalSanchez) / totalVotosPend * 100).toFixed(1)) : 0,
    };
  }

  // Sánchez ahead in counted BUT projected to lose (Extranjero reversal)
  if (sanchezLeadsNow && !sanchezWinsProjected) {
    // RLA needs pending votes to overtake — show how much RLA gains from pending
    const rlaMarginInPending = Math.abs(deltaTotalSanchez);
    return {
      crossoverPct: null, neverCatches: false, sanchezWins: false,
      sanchezLeadsNow: true, rlaComeback: true,
      margin: Math.abs(gapFinal), totalVotosPend, deltaTotalSanchez,
      sanchezNeedsPct: totalVotosPend > 0 ? parseFloat((Math.abs(gapFinal) / totalVotosPend * 100).toFixed(1)) : 0,
      sanchezCurrentPct: totalVotosPend > 0 ? parseFloat((rlaMarginInPending / totalVotosPend * 100).toFixed(1)) : 0,
    };
  }

  // RLA ahead — Sánchez not closing gap
  if (deltaTotalSanchez <= 0) {
    return {
      crossoverPct: null, neverCatches: true, sanchezWins: false,
      sanchezLeadsNow: false,
      margin: gapActual, totalVotosPend, deltaTotalSanchez,
    };
  }

  // RLA ahead but Sánchez projected to overtake
  if (sanchezWinsProjected) {
    const fractionNeeded = gapActual / deltaTotalSanchez;
    const crossoverPct = currentPct + fractionNeeded * (100 - currentPct);
    return {
      crossoverPct: Math.round(crossoverPct * 10) / 10,
      neverCatches: false, sanchezWins: true,
      sanchezLeadsNow: false,
      margin: Math.abs(gapFinal), totalVotosPend, deltaTotalSanchez,
      sanchezNeedsPct: totalVotosPend > 0 ? parseFloat((gapActual / totalVotosPend * 100).toFixed(1)) : 0,
      sanchezCurrentPct: totalVotosPend > 0 ? parseFloat((deltaTotalSanchez / totalVotosPend * 100).toFixed(1)) : 0,
    };
  }

  // RLA ahead and projected to stay ahead
  const fractionNeeded = gapActual / deltaTotalSanchez;
  const crossoverPct = currentPct + fractionNeeded * (100 - currentPct);

  return {
    crossoverPct: crossoverPct > 100 ? null : Math.round(crossoverPct * 10) / 10,
    neverCatches: crossoverPct > 100, sanchezWins: false,
    sanchezLeadsNow: false,
    margin: gapFinal, totalVotosPend, deltaTotalSanchez,
    sanchezNeedsPct: totalVotosPend > 0 ? parseFloat((gapActual / totalVotosPend * 100).toFixed(1)) : 0,
    sanchezCurrentPct: totalVotosPend > 0 ? parseFloat((deltaTotalSanchez / totalVotosPend * 100).toFixed(1)) : 0,
  };
}
