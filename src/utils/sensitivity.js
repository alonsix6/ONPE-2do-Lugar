export function getTopImpactRegions(regiones, count = 5) {
  return [...regiones]
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, count);
}

// For a region, find what Sanchez% (or RLA% for RLA-favored) would flip the national result
export function calcRegionBreakeven(region, gapActual, regiones) {
  const deltaOthers = regiones
    .filter(r => r.nombre !== region.nombre)
    .reduce((s, r) => s + r.delta, 0);

  // gapActual - deltaOthers - deltaThisRegion = 0
  // deltaThisRegion = gapActual - deltaOthers
  // votosPend * ((pctSanchez - pctRla) / 100) = gapActual - deltaOthers
  const targetDelta = gapActual - deltaOthers;
  const currentRla = region.rla.pct;
  const currentSan = region.sanchez.pct;

  if (region.votosPend === 0) return null;

  // For Sanchez-dominant regions: solve for pctSanchez holding pctRla constant
  // targetDelta = votosPend * ((pctSanchez - pctRla) / 100)
  // pctSanchez = (targetDelta / votosPend) * 100 + pctRla
  const breakevenSanchez = (targetDelta / region.votosPend) * 100 + currentRla;

  // For RLA-dominant regions (like Lima): solve for pctRla holding pctSanchez constant
  // targetDelta = votosPend * ((pctSanchez - pctRla) / 100)
  // pctRla = pctSanchez - (targetDelta / votosPend) * 100
  const breakevenRla = currentSan - (targetDelta / region.votosPend) * 100;

  const isRlaRegion = region.favorDe === 'RLA';

  return {
    nombre: region.nombre,
    isRlaRegion,
    // Which slider to show
    sliderTarget: isRlaRegion ? 'rla' : 'sanchez',
    currentValue: isRlaRegion ? currentRla : currentSan,
    breakevenValue: isRlaRegion ? breakevenRla : breakevenSanchez,
    isReachable: isRlaRegion
      ? (breakevenRla >= 0 && breakevenRla <= 100)
      : (breakevenSanchez >= 0 && breakevenSanchez <= 100),
  };
}
