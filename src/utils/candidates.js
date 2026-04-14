// Aggregate national candidate totals from regional todosLosCandidatos
export function aggregateNationalCandidates(regiones) {
  const map = new Map();

  for (const region of regiones) {
    if (!region.todosLosCandidatos) continue;
    for (const c of region.todosLosCandidatos) {
      const key = normName(c.nombre);
      if (map.has(key)) {
        map.get(key).votos += c.votos;
      } else {
        map.set(key, { nombre: c.nombre, partido: c.partido, votos: c.votos });
      }
    }
  }

  const arr = [...map.values()];
  const totalVotos = arr.reduce((s, c) => s + c.votos, 0);
  for (const c of arr) {
    c.pct = totalVotos > 0 ? parseFloat((c.votos / totalVotos * 100).toFixed(2)) : 0;
  }

  return arr.sort((a, b) => b.votos - a.votos);
}

function normName(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

// Get color for a candidate based on name
export function getCandidateColor(nombre) {
  const n = normName(nombre);
  if (n.includes('LOPEZ ALIAGA')) return '#185FA5';
  if (n.includes('SANCHEZ PALOMINO')) return '#A32D2D';
  if (n.includes('FUJIMORI')) return '#FF6B00';
  if (n.includes('NIETO')) return '#8B5CF6';
  if (n.includes('BELMONT')) return '#059669';
  return '#6B7280';
}

// Shorten candidate name for display
export function shortName(nombre) {
  const parts = nombre.split(' ');
  if (parts.length >= 3) {
    // "RAFAEL BERNARDO LÓPEZ ALIAGA CAZORLA" → "R. López Aliaga"
    const firstInit = parts[0][0] + '.';
    // Find the "last name" portion (usually after first 2 names)
    const lastNames = parts.slice(2).map(w =>
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join(' ');
    return firstInit + ' ' + lastNames;
  }
  return nombre;
}
