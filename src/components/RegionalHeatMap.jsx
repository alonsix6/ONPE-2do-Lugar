import { useMemo, useState } from 'react';
import { REGION_GRID } from '../constants/regions';
import { fmtCompact } from '../utils/format';

export default function RegionalHeatMap({ regiones }) {
  const [open, setOpen] = useState(false);

  const cells = useMemo(() => {
    if (!regiones?.length) return [];
    const maxDelta = Math.max(...regiones.map(r => Math.abs(r.delta)));

    return REGION_GRID.map(g => {
      const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      const region = regiones.find(r => norm(r.nombre) === norm(g.nombre));
      if (!region) return { ...g, empty: true };

      const opacity = maxDelta > 0 ? 0.35 + 0.65 * (Math.abs(region.delta) / maxDelta) : 0.5;
      const isRla = region.favorDe === 'RLA';

      return {
        ...g,
        delta: region.delta,
        pctProcesado: region.pctProcesado,
        isRla,
        opacity,
        bgColor: isRla ? `rgba(24, 95, 165, ${opacity})` : `rgba(163, 45, 45, ${opacity})`,
      };
    });
  }, [regiones]);

  if (!cells.length) return null;

  const grid = Array.from({ length: 5 }, () => Array(5).fill(null));
  for (const cell of cells) {
    grid[cell.row][cell.col] = cell;
  }

  const sanchezCount = cells.filter(c => !c.empty && !c.isRla).length;
  const rlaCount = cells.filter(c => !c.empty && c.isRla).length;

  return (
    <div className="section">
      <button className="collapsible-header" onClick={() => setOpen(!open)}>
        <span className="section-title" style={{ margin: 0 }}>
          Mapa de calor regional — impacto en 2do lugar
        </span>
        <span className="collapsible-summary">
          <span className="heatmap-dot san" /> {sanchezCount}
          <span className="heatmap-dot rla" style={{ marginLeft: 8 }} /> {rlaCount}
          <span className="collapsible-arrow">{open ? '▲' : '▼'}</span>
        </span>
      </button>

      {open && (
        <>
          <div className="heatmap">
            {grid.flat().map((cell, i) => {
              if (!cell || cell.empty) {
                return <div key={i} className="heatmap-cell heatmap-empty" />;
              }
              return (
                <div
                  key={cell.abbr}
                  className="heatmap-cell"
                  style={{ background: cell.bgColor }}
                  title={`${cell.nombre}: ${fmtCompact(cell.delta)} votos (${cell.pctProcesado?.toFixed(1)}% proc.)`}
                >
                  <span className="heatmap-abbr">{cell.abbr}</span>
                  <span className="heatmap-delta">{fmtCompact(cell.delta)}</span>
                </div>
              );
            })}
          </div>
          {(() => {
            const ext = cells.find(c => false); // EXT not in REGION_GRID
            const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
            const extRegion = regiones.find(r => r.cod === 'EXT' || norm(r.nombre) === 'EXTRANJERO');
            if (extRegion) {
              const maxDelta = Math.max(...regiones.map(r => Math.abs(r.delta)));
              const opacity = maxDelta > 0 ? 0.35 + 0.65 * (Math.abs(extRegion.delta) / maxDelta) : 0.5;
              const isRla = extRegion.favorDe === 'RLA';
              const bg = isRla ? `rgba(24, 95, 165, ${opacity})` : `rgba(163, 45, 45, ${opacity})`;
              return (
                <div className="heatmap-ext" style={{ background: bg }}>
                  <span className="heatmap-abbr">🌍 EXT</span>
                  <span className="heatmap-delta">{fmtCompact(extRegion.delta)}</span>
                </div>
              );
            }
            return null;
          })()}
          <div className="heatmap-legend">
            <span className="heatmap-legend-item"><span className="heatmap-dot rla" /> RLA</span>
            <span className="heatmap-legend-item"><span className="heatmap-dot san" /> Sanchez</span>
            <span className="heatmap-legend-note">Intensidad = magnitud del impacto</span>
          </div>
        </>
      )}
    </div>
  );
}
