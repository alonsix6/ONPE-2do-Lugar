import { fmtDate } from '../utils/format';

const SOURCE_LABELS = {
  live: { text: 'EN VIVO', class: '', desc: 'en vivo (directo)' },
  proxy: { text: 'EN VIVO', class: '', desc: 'en vivo (proxy)' },
  snapshot: { text: 'SNAPSHOT', class: ' cached', desc: 'snapshot' },
};

export default function Header({ lastUpdated, loading, source }) {
  const info = SOURCE_LABELS[source] || SOURCE_LABELS.snapshot;
  return (
    <div className="hdr">
      <span className="hdr-title">
        Perú 2026 — proyección 2do lugar
        <span className={`live-badge${loading ? ' loading' : ''}${info.class}`}>
          {loading ? 'CARGANDO…' : info.text}
        </span>
      </span>
      <span className="hdr-ts">
        {lastUpdated
          ? `${fmtDate(lastUpdated)} · datos ONPE ${info.desc}`
          : 'Conectando con ONPE…'}
      </span>
    </div>
  );
}
