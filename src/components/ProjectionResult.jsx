import { fmtThousands } from '../utils/format';

export default function ProjectionResult({ gapFinal, resultado }) {
  if (gapFinal == null) return null;

  const isRla = resultado === 'RLA';
  const bgStyle = isRla
    ? { background: 'var(--color-background-info)' }
    : { background: 'var(--color-background-danger)' };
  const textColor = isRla
    ? 'var(--color-text-info)'
    : 'var(--color-text-danger)';

  return (
    <div className="proj-result" style={bgStyle}>
      <span className="proj-result-label" style={{ color: textColor }}>
        Proyección central
      </span>
      <span className="proj-result-val" style={{ color: textColor }}>
        {isRla ? 'RLA' : 'Sánchez'} +{fmtThousands(Math.abs(gapFinal))}
      </span>
    </div>
  );
}
