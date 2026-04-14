import { useState, useEffect, useCallback } from 'react';
import { STATIC_SNAPSHOT } from '../constants/snapshot';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos

export function useONPEData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [nextRefresh, setNextRefresh] = useState(null);
  const [isLive, setIsLive] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.fetch('/api/onpe-all-regions');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('API returned non-JSON response (possible WAF block)');
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setLastUpdated(new Date());
      setNextRefresh(new Date(Date.now() + REFRESH_INTERVAL));
      setIsLive(true);
    } catch (e) {
      console.warn('Live API failed, using static snapshot:', e.message);
      // Use static snapshot as fallback
      if (!data) {
        setData(STATIC_SNAPSHOT);
        setLastUpdated(new Date(STATIC_SNAPSHOT.timestamp));
        setIsLive(false);
      }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, lastUpdated, nextRefresh, refetch: fetchData, isLive };
}
