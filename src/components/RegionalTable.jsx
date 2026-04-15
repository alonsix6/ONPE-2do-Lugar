import { fmtNum, fmtPct } from '../utils/format';

export default function RegionalTable({ regiones }) {
  if (!regiones || regiones.length === 0) return null;

  const showNieto = regiones.some(r => r.nieto?.pct > 0 || r.pctNieto > 0);

  return (
    <div className="section">
      <div className="section-title">Bottom-up por región (impacto en 2do lugar)</div>
      <table className="tbl">
        <thead>
          <tr>
            <th>Región</th>
            <th className="r">% proc.</th>
            <th className="r">Sánchez%</th>
            <th className="r">RLA%</th>
            {showNieto && <th className="r">Nieto%</th>}
            <th className="r">Δ votos</th>
            <th>Progreso</th>
            <th>Gana</th>
          </tr>
        </thead>
        <tbody>
          {regiones.map(r => {
            const isSan = r.favorDe === 'SANCHEZ';
            const barW = Math.min(100, Math.abs(r.delta) / 1500);
            const col = isSan ? '#A32D2D' : '#185FA5';
            const nietoPct = r.nieto?.pct ?? r.pctNieto ?? 0;
            return (
              <tr key={r.nombre || r.cod}>
                <td style={{ fontWeight: 500, fontSize: 12 }}>
                  {r.cod === 'EXT' ? '🌍 ' : ''}{r.nombre}
                </td>
                <td className="r" style={{ color: 'var(--color-text-secondary)' }}>
                  {fmtPct(r.pctProcesado)}
                </td>
                <td className="r" style={{ color: '#A32D2D' }}>
                  {fmtPct(r.sanchez.pct)}
                </td>
                <td className="r" style={{ color: '#185FA5' }}>
                  {fmtPct(r.rla.pct)}
                </td>
                {showNieto && (
                  <td className="r" style={{ color: '#8B5CF6' }}>
                    {nietoPct > 0 ? fmtPct(nietoPct) : '—'}
                  </td>
                )}
                <td className="r" style={{ color: col, fontWeight: 500 }}>
                  {fmtNum(r.delta)}
                </td>
                <td>
                  <div className="bar-wrap">
                    <div
                      className="bar-fill"
                      style={{ width: `${barW}%`, background: col }}
                    />
                  </div>
                </td>
                <td>
                  <span className={`badge ${isSan ? 'san' : 'rla'}`}>
                    {isSan ? 'Sánchez' : 'RLA'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
