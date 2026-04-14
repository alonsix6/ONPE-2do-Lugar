import { useState, useMemo, useCallback, useEffect } from 'react';
import { getTopImpactRegions, calcRegionBreakeven } from '../utils/sensitivity';
import { fmtNum } from '../utils/format';

export default function SensitivityPanel({ regiones, gapActual, onAdjust }) {
  const topRegions = useMemo(() => {
    if (!regiones?.length) return [];
    return getTopImpactRegions(regiones, 5);
  }, [regiones]);

  const breakevens = useMemo(() => {
    if (!topRegions.length || gapActual == null) return {};
    const map = {};
    for (const r of topRegions) {
      map[r.nombre] = calcRegionBreakeven(r, gapActual, regiones);
    }
    return map;
  }, [topRegions, gapActual, regiones]);

  // Initialize sliders from current region values
  const [values, setValues] = useState({});

  useEffect(() => {
    if (!topRegions.length) return;
    const init = {};
    for (const r of topRegions) {
      const be = breakevens[r.nombre];
      init[r.nombre] = be?.currentValue ?? (r.favorDe === 'RLA' ? r.rla.pct : r.sanchez.pct);
    }
    setValues(init);
  }, [topRegions, breakevens]);

  const handleChange = useCallback((nombre, val) => {
    setValues(prev => {
      const next = { ...prev, [nombre]: val };
      // Build adjustments object
      const adj = {};
      for (const r of topRegions) {
        const be = breakevens[r.nombre];
        if (!be) continue;
        const sliderVal = nombre === r.nombre ? val : (next[r.nombre] ?? be.currentValue);
        if (be.sliderTarget === 'rla') {
          adj[r.nombre] = { pctRla: sliderVal, pctSanchez: r.sanchez.pct };
        } else {
          adj[r.nombre] = { pctSanchez: sliderVal, pctRla: r.rla.pct };
        }
      }
      onAdjust(adj);
      return next;
    });
  }, [topRegions, breakevens, onAdjust]);

  if (!topRegions.length) return null;

  return (
    <div className="section">
      <div className="section-title">Analisis de sensibilidad — Top 5 regiones por impacto</div>
      <div className="proj-box">
        {topRegions.map(r => {
          const be = breakevens[r.nombre];
          if (!be) return null;
          const current = be.currentValue;
          const val = values[r.nombre] ?? current;
          const min = Math.max(0, Math.floor(current - 15));
          const max = Math.min(100, Math.ceil(current + 15));
          const isRla = be.sliderTarget === 'rla';
          const label = isRla ? `RLA en ${r.nombre}` : `Sanchez en ${r.nombre}`;

          // Impact of current slider vs original
          const origDelta = r.delta;
          const newDelta = r.votosPend * ((isRla ? (r.sanchez.pct - val) : (val - r.rla.pct)) / 100);
          const impact = Math.round(newDelta - origDelta);

          // Breakeven position on slider (0-100% of track)
          const bePos = be.isReachable
            ? ((be.breakevenValue - min) / (max - min)) * 100
            : null;

          return (
            <div key={r.nombre} className="slider-group">
              <div className="slider-row">
                <label>{label}</label>
                <div className="slider-track-wrap">
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step="0.5"
                    value={val}
                    onChange={e => handleChange(r.nombre, parseFloat(e.target.value))}
                  />
                  {bePos != null && bePos >= 0 && bePos <= 100 && (
                    <div className="slider-breakeven-mark" style={{ left: `${bePos}%` }} title="Punto de cruce" />
                  )}
                </div>
                <span>{val.toFixed(1)}%</span>
              </div>
              <div className="slider-meta">
                <span className="slider-impact" style={{ color: impact > 0 ? '#A32D2D' : impact < 0 ? '#185FA5' : 'var(--color-text-tertiary)' }}>
                  {impact !== 0 ? `Δ ${fmtNum(impact)} vs actual` : 'sin cambio'}
                </span>
                {be.isReachable && (
                  <span className="slider-breakeven-label">
                    Cruce: {be.breakevenValue.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
