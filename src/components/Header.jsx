import { fmtDate } from '../utils/format';

export default function Header({ lastUpdated, loading }) {
  return (
    <div className="hdr">
      <span className="hdr-title">
        Perú 2026 — proyección 2do lugar
        <span className={`live-badge${loading ? ' loading' : ''}`}>
          {loading ? 'CARGANDO…' : 'EN VIVO'}
        </span>
      </span>
      <span className="hdr-ts">
        {lastUpdated
          ? `${fmtDate(lastUpdated)} · datos ONPE oficial`
          : 'Conectando con ONPE…'}
      </span>
    </div>
  );
}
