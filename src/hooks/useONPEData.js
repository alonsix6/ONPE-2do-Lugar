import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchONPEDirect } from '../utils/fetchONPE';
import { STATIC_SNAPSHOT } from '../constants/snapshot';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos

// Strategy: browser-direct → Netlify Function → static snapshot
// WAF blocks servers but browsers work fine

export function useONPEData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [nextRefresh, setNextRefresh] = useState(null);
  const [source, setSource] = useState(null); // 'live' | 'proxy' | 'snapshot'
  const hasData = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Strategy 1: Call ONPE API directly from the browser
    try {
      const json = await fetchONPEDirect();
      if (json.regiones && json.regiones.length > 0) {
        setData(json);
        setLastUpdated(new Date());
        setNextRefresh(new Date(Date.now() + REFRESH_INTERVAL));
        setSource('live');
        hasData.current = true;
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Client-side ONPE fetch failed:', e.message);
    }

    // Strategy 2: Try Netlify Function proxy
    try {
      const res = await window.fetch('/api/onpe-all-regions');
      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const json = await res.json();
          if (!json.error && json.regiones) {
            setData(json);
            setLastUpdated(new Date());
            setNextRefresh(new Date(Date.now() + REFRESH_INTERVAL));
            setSource('proxy');
            hasData.current = true;
            setLoading(false);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Netlify proxy failed:', e.message);
    }

    // Strategy 3: Static snapshot fallback
    if (!hasData.current) {
      setData(STATIC_SNAPSHOT);
      setLastUpdated(new Date(STATIC_SNAPSHOT.timestamp));
      setSource('snapshot');
      hasData.current = true;
      setError('API en vivo no disponible — usando snapshot estático');
    } else {
      setError('No se pudo actualizar — mostrando datos anteriores');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, lastUpdated, nextRefresh, refetch: fetchData, source };
}
