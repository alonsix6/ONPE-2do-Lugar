import { useMemo } from 'react';
import { fmtThousands } from '../utils/format';

export default function VoteTotals({ regiones, regionesAjustadas }) {
  const totals = useMemo(() => {
    const regs = regionesAjustadas || regiones;
    if (!regs?.length) return null;

    const rlaActual = regs.reduce((s, r) => s + (r.rla?.votos ?? r.votosRla ?? 0), 0);
    const sanActual = regs.reduce((s, r) => s + (r.sanchez?.votos ?? r.votosSanchez ?? 0), 0);
    const nietoActual = regs.reduce((s, r) => s + (r.nieto?.votos ?? r.votosNieto ?? 0), 0);

    let rlaPend = 0, sanPend = 0, nietoPend = 0;
    for (const r of regs) {
      const vp = r.votosPend || 0;
      rlaPend += vp * ((r.rla?.pct ?? r.pctRla ?? 0) / 100);
      sanPend += vp * ((r.sanchez?.pct ?? r.pctSanchez ?? 0) / 100);
      nietoPend += vp * ((r.nieto?.pct ?? r.pctNieto ?? 0) / 100);
    }

    const rlaTotal = rlaActual + Math.round(rlaPend);
    const sanTotal = sanActual + Math.round(sanPend);
    const nietoTotal = nietoActual + Math.round(nietoPend);

    return {
      rlaActual, sanActual, nietoActual,
      rlaPend: Math.round(rlaPend), sanPend: Math.round(sanPend), nietoPend: Math.round(nietoPend),
      rlaTotal, sanTotal, nietoTotal,
    };
  }, [regiones, regionesAjustadas]);

  if (!totals) return null;

  // Sort by projected total descending
  const bars = [
    { key: 'rla', label: 'RLA', total: totals.rlaTotal, className: 'rla' },
    { key: 'nieto', label: 'Nieto', total: totals.nietoTotal, className: 'nieto' },
    { key: 'san', label: 'Sanchez', total: totals.sanTotal, className: 'san' },
  ].sort((a, b) => b.total - a.total);

  const maxVotos = bars[0].total;

  // Show Nieto only if he has votes (snapshot data might not have Nieto)
  const showNieto = totals.nietoTotal > 0;
  const visibleBars = showNieto ? bars : bars.filter(b => b.key !== 'nieto');

  return (
    <div className="vote-totals">
      <div className="vote-totals-title">Proyeccion de votos al 100% de actas</div>
      {visibleBars.map((bar, i) => (
        <div className="vote-row" key={bar.key}>
          <span className="vote-label">{bar.label}</span>
          <div className="vote-bar-wrap">
            <div className={`vote-bar ${bar.className}`} style={{ width: `${(bar.total / maxVotos) * 100}%` }}>
              <span className="vote-bar-value">{fmtThousands(bar.total)}</span>
            </div>
          </div>
          {i > 0 && <span className="vote-gap">-{fmtThousands(bars[0].total - bar.total)}</span>}
        </div>
      ))}
      <div className="vote-detail">
        <span>Contados: RLA {fmtThousands(totals.rlaActual)} / San {fmtThousands(totals.sanActual)}{showNieto ? ` / Nie ${fmtThousands(totals.nietoActual)}` : ''}</span>
        <span>Pend.: RLA +{fmtThousands(totals.rlaPend)} / San +{fmtThousands(totals.sanPend)}{showNieto ? ` / Nie +${fmtThousands(totals.nietoPend)}` : ''}</span>
      </div>
    </div>
  );
}
