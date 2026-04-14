import { useMemo } from 'react';
import { calcBreakevenByProgress } from '../utils/projection';
import { fmtThousands } from '../utils/format';

export default function BreakevenCalculator({ regiones, gapActual, gapFinal, deltaTotalSanchez, nacional }) {
  const breakeven = useMemo(() => {
    if (!regiones?.length || gapActual == null || !nacional) return null;
    return calcBreakevenByProgress(regiones, gapActual, nacional);
  }, [regiones, gapActual, nacional]);

  if (!breakeven) return null;

  const currentPct = nacional?.actasContabilizadas || 0;

  return (
    <div className="section">
      <div className="section-title">Punto de equilibrio — Sanchez vs RLA</div>
      <div className="proj-box">
        {/* Gauge */}
        <div className="breakeven-gauge">
          <div
            className="breakeven-fill"
            style={{
              width: `${currentPct}%`,
              background: 'var(--color-border-tertiary)',
            }}
          />
          {breakeven.crossoverPct && (
            <>
              <div
                className="breakeven-marker"
                style={{ left: `${breakeven.crossoverPct}%` }}
              />
              <div
                className="breakeven-label"
                style={{ left: `${breakeven.crossoverPct}%` }}
              >
                Cruce: {breakeven.crossoverPct}%
              </div>
            </>
          )}
          <div
            className="breakeven-current"
            style={{ left: `${currentPct}%` }}
          >
            {currentPct.toFixed(1)}%
          </div>
        </div>

        {/* Stats */}
        <div className="breakeven-stats">
          <div className="breakeven-stat">
            <div className="breakeven-stat-value" style={{ color: '#A32D2D' }}>
              {breakeven.sanchezNeedsPct != null ? breakeven.sanchezNeedsPct + '%' : '—'}
            </div>
            <div className="breakeven-stat-label">Margen que Sanchez necesita en votos pendientes</div>
          </div>
          <div className="breakeven-stat">
            <div className="breakeven-stat-value" style={{ color: breakeven.sanchezCurrentPct >= (breakeven.sanchezNeedsPct || 0) ? '#3B6D11' : '#A32D2D' }}>
              {breakeven.sanchezCurrentPct != null ? breakeven.sanchezCurrentPct + '%' : '—'}
            </div>
            <div className="breakeven-stat-label">Margen actual de Sanchez en votos pendientes</div>
          </div>
        </div>

        {/* Summary */}
        <div className="breakeven-summary">
          {breakeven.neverCatches && (
            <>Con la tendencia actual, <strong style={{ color: '#185FA5' }}>Sanchez no alcanza a RLA</strong>. Le faltan ~{fmtThousands(breakeven.margin)} votos.</>
          )}
          {breakeven.sanchezWins && (
            <>Con la tendencia actual, <strong style={{ color: '#A32D2D' }}>Sanchez supera a RLA</strong> por ~{fmtThousands(breakeven.margin)} votos.</>
          )}
          {!breakeven.neverCatches && !breakeven.sanchezWins && breakeven.crossoverPct && (
            <>Sanchez alcanzaria a RLA al <strong>{breakeven.crossoverPct}%</strong> de actas procesadas (actualmente {currentPct.toFixed(1)}%).</>
          )}
        </div>
      </div>
    </div>
  );
}
