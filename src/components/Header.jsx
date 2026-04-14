import { fmtDate } from '../utils/format';

export default function Header({ lastUpdated, loading, isLive }) {
  return (
    <div className="hdr">
      <span className="hdr-title">
        Perú 2026 — proyección 2do lugar
        <span className={`live-badge${loading ? ' loading' : ''}${!isLive ? ' cached' : ''}`}>
          {loading ? 'CARGANDO…' : isLive ? 'EN VIVO' : 'SNAPSHOT'}
        </span>
      </span>
      <span className="hdr-ts">
        {lastUpdated
          ? `${fmtDate(lastUpdated)} · datos ONPE ${isLive ? 'en vivo' : 'snapshot'}`
          : 'Conectando con ONPE…'}
      </span>
    </div>
  );
}
