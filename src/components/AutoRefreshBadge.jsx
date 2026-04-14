import { useState, useEffect } from 'react';

export default function AutoRefreshBadge({ nextRefresh, onRefresh, loading }) {
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!nextRefresh) return;
    const tick = () => {
      const diff = Math.max(0, nextRefresh.getTime() - Date.now());
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${m}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextRefresh]);

  return (
    <div className="refresh-badge">
      <span className="refresh-text">
        {loading ? 'Actualizando…' : `Próx. refresh: ${countdown}`}
      </span>
      <button className="refresh-btn" onClick={onRefresh} disabled={loading}>
        ↻ Refrescar
      </button>
    </div>
  );
}
