import { useMemo } from 'react';
import { fmtThousands } from '../utils/format';

export default function VoteTotals({ regiones, regionesAjustadas }) {
  const totals = useMemo(() => {
    const regs = regionesAjustadas || regiones;
    if (!regs?.length) return null;

    // Current counted votes (real, from actas already processed)
    const rlaActual = regs.reduce((s, r) => s + (r.rla?.votos ?? r.votosRla ?? 0), 0);
    const sanActual = regs.reduce((s, r) => s + (r.sanchez?.votos ?? r.votosSanchez ?? 0), 0);

    // Projected votes from pending actas (using adjusted percentages)
    let rlaPend = 0;
    let sanPend = 0;
    for (const r of regs) {
      const pctRla = r.rla?.pct ?? r.pctRla ?? 0;
      const pctSan = r.sanchez?.pct ?? r.pctSanchez ?? 0;
      rlaPend += (r.votosPend || 0) * (pctRla / 100);
      sanPend += (r.votosPend || 0) * (pctSan / 100);
    }

    const rlaTotal = rlaActual + Math.round(rlaPend);
    const sanTotal = sanActual + Math.round(sanPend);
    const gap = rlaTotal - sanTotal;

    return { rlaActual, sanActual, rlaPend: Math.round(rlaPend), sanPend: Math.round(sanPend), rlaTotal, sanTotal, gap };
  }, [regiones, regionesAjustadas]);

  if (!totals) return null;

  const maxVotos = Math.max(totals.rlaTotal, totals.sanTotal);

  return (
    <div className="vote-totals">
      <div className="vote-row">
        <span className="vote-label">RLA</span>
        <div className="vote-bar-wrap">
          <div className="vote-bar rla" style={{ width: `${(totals.rlaTotal / maxVotos) * 100}%` }}>
            <span className="vote-bar-value">{fmtThousands(totals.rlaTotal)}</span>
          </div>
        </div>
      </div>
      <div className="vote-row">
        <span className="vote-label">Sanchez</span>
        <div className="vote-bar-wrap">
          <div className="vote-bar san" style={{ width: `${(totals.sanTotal / maxVotos) * 100}%` }}>
            <span className="vote-bar-value">{fmtThousands(totals.sanTotal)}</span>
          </div>
        </div>
      </div>
      <div className="vote-detail">
        <span>Contados: RLA {fmtThousands(totals.rlaActual)} / San {fmtThousands(totals.sanActual)}</span>
        <span>Pend. proy.: RLA +{fmtThousands(totals.rlaPend)} / San +{fmtThousands(totals.sanPend)}</span>
      </div>
    </div>
  );
}
