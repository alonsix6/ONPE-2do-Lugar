export async function exportToExcel(data) {
  if (!data) return;

  // Dynamic import — xlsx only loads when user clicks Export
  const XLSX = await import('xlsx');

  const wb = XLSX.utils.book_new();

  addResumenSheet(XLSX, wb, data);
  addRegionesSheet(XLSX, wb, data);
  addCandidatosRegionSheet(XLSX, wb, data);
  addCandidatosNacSheet(XLSX, wb, data);

  const timestamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
  XLSX.writeFile(wb, `ONPE_2026_2doLugar_${timestamp}.xlsx`);
}

function addResumenSheet(XLSX, wb, data) {
  const rows = [
    ['ONPE 2026 — Proyeccion 2do Lugar'],
    ['Generado', new Date().toLocaleString('es-PE')],
    [],
    ['RESUMEN NACIONAL'],
    ['Actas procesadas (%)', data.nacional?.actasContabilizadas || 0],
    ['Actas contabilizadas', data.nacional?.contabilizadas || 0],
    ['Total actas', data.nacional?.totalActas || 0],
    [],
    ['PROYECCION'],
    ['Gap actual (RLA - Sanchez)', data.gapActual || 0],
    ['Delta Sanchez pendientes', data.deltaTotalSanchez || 0],
    ['Gap proyectado', data.gapFinal || 0],
    ['Resultado proyectado', data.resultado || ''],
    [],
    ['REGIONES POR IMPACTO (Top 5)'],
    ['Region', 'Delta votos', 'Favorece a'],
  ];

  const regiones = data.regiones || [];
  const top5 = [...regiones].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 5);
  for (const r of top5) {
    rows.push([r.nombre, r.delta, r.favorDe]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Resumen');
}

function addRegionesSheet(XLSX, wb, data) {
  const header = [
    'Region', '% Procesado', 'Total Actas', 'Contabilizadas', 'Actas Pend.',
    'Votos Pend. Est.', 'Sanchez %', 'Sanchez Votos', 'RLA %', 'RLA Votos',
    'Delta Votos', 'Favorece a',
  ];

  const regiones = data.regiones || [];
  const rows = regiones.map(r => [
    r.nombre,
    r.pctProcesado,
    r.totalActas,
    r.contabilizadas,
    r.actasPend,
    r.votosPend,
    r.sanchez?.pct ?? r.pctSanchez ?? 0,
    r.sanchez?.votos ?? r.votosSanchez ?? 0,
    r.rla?.pct ?? r.pctRla ?? 0,
    r.rla?.votos ?? r.votosRla ?? 0,
    r.delta,
    r.favorDe,
  ]);

  rows.push([]);
  rows.push([
    'TOTAL', '',
    regiones.reduce((s, r) => s + (r.totalActas || 0), 0),
    regiones.reduce((s, r) => s + (r.contabilizadas || 0), 0),
    regiones.reduce((s, r) => s + (r.actasPend || 0), 0),
    regiones.reduce((s, r) => s + (r.votosPend || 0), 0),
    '',
    regiones.reduce((s, r) => s + (r.sanchez?.votos ?? r.votosSanchez ?? 0), 0),
    '',
    regiones.reduce((s, r) => s + (r.rla?.votos ?? r.votosRla ?? 0), 0),
    regiones.reduce((s, r) => s + r.delta, 0),
    '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [
    { wch: 16 }, { wch: 10 }, { wch: 11 }, { wch: 13 }, { wch: 11 },
    { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 8 }, { wch: 12 },
    { wch: 12 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Regiones');
}

function addCandidatosRegionSheet(XLSX, wb, data) {
  const header = ['Region', 'Candidato', 'Partido', 'Votos', '%'];
  const rows = [];

  for (const r of (data.regiones || [])) {
    if (!r.todosLosCandidatos?.length) continue;
    for (const c of r.todosLosCandidatos) {
      rows.push([r.nombre, c.nombre, c.partido, c.votos, c.pct]);
    }
  }

  if (!rows.length) {
    rows.push(['Sin datos detallados (usar script v5 para obtener)']);
  }

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [{ wch: 16 }, { wch: 40 }, { wch: 45 }, { wch: 12 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Candidatos x Region');
}

function addCandidatosNacSheet(XLSX, wb, data) {
  const header = ['Candidato', 'Partido', 'Votos', '%'];
  const rows = [];

  const cands = data.candidatosNacionales || [];
  if (cands.length) {
    for (const c of cands) {
      rows.push([c.nombre, c.partido, c.votos, c.pct]);
    }
  } else {
    const map = new Map();
    for (const r of (data.regiones || [])) {
      for (const c of (r.todosLosCandidatos || [])) {
        const key = c.nombre.toUpperCase().trim();
        if (map.has(key)) {
          map.get(key).votos += c.votos;
        } else {
          map.set(key, { ...c });
        }
      }
    }
    const arr = [...map.values()].sort((a, b) => b.votos - a.votos);
    const total = arr.reduce((s, c) => s + c.votos, 0);
    for (const c of arr) {
      rows.push([c.nombre, c.partido, c.votos, total > 0 ? parseFloat((c.votos / total * 100).toFixed(2)) : 0]);
    }
  }

  if (!rows.length) {
    rows.push(['Sin datos de candidatos nacionales']);
  }

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [{ wch: 40 }, { wch: 45 }, { wch: 12 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Candidatos Nacional');
}
