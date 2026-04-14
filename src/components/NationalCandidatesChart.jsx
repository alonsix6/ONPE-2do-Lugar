import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell, LabelList, ResponsiveContainer, Tooltip } from 'recharts';
import { aggregateNationalCandidates, getCandidateColor, shortName } from '../utils/candidates';
import { fmtThousands } from '../utils/format';

const TOP_N = 8;

export default function NationalCandidatesChart({ candidatosNacionales, regiones }) {
  const candidates = useMemo(() => {
    const raw = candidatosNacionales?.length > 0
      ? candidatosNacionales
      : aggregateNationalCandidates(regiones || []);
    return raw.slice(0, TOP_N).map(c => ({
      ...c,
      shortName: shortName(c.nombre),
      color: getCandidateColor(c.nombre),
    }));
  }, [candidatosNacionales, regiones]);

  if (!candidates.length) return null;

  return (
    <div className="section">
      <div className="section-title">Candidatos presidenciales — votos nacionales</div>
      <div className="candidates-chart">
        <ResponsiveContainer width="100%" height={TOP_N * 40 + 20}>
          <BarChart layout="vertical" data={candidates} margin={{ left: 120, right: 60, top: 4, bottom: 4 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="shortName"
              width={110}
              tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => [fmtThousands(value) + ' votos', 'Votos']}
              labelFormatter={(label) => label}
              contentStyle={{ background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 6, fontSize: 12 }}
            />
            <Bar dataKey="votos" radius={[0, 4, 4, 0]} barSize={22}>
              {candidates.map((c, i) => (
                <Cell key={i} fill={c.color} />
              ))}
              <LabelList
                dataKey="pct"
                position="right"
                formatter={(v) => v.toFixed(1) + '%'}
                style={{ fontSize: 11, fill: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
