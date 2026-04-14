import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchONPEDirect } from '../utils/fetchONPE';
import { STATIC_SNAPSHOT } from '../constants/snapshot';
import { loadFromLocalStorage, saveToLocalStorage } from '../components/DataUpdater';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos

export function useONPEData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [nextRefresh, setNextRefresh] = useState(null);
  const [source, setSource] = useState(null);
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
        saveToLocalStorage(json);
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
            saveToLocalStorage(json);
            hasData.current = true;
            setLoading(false);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Netlify proxy failed:', e.message);
    }

    // Strategy 3: localStorage (previously pasted data)
    if (!hasData.current) {
      const cached = loadFromLocalStorage();
      if (cached) {
        setData(cached);
        setLastUpdated(new Date(cached.timestamp));
        setSource('manual');
        hasData.current = true;
        setLoading(false);
        return;
      }
    }

    // Strategy 4: Static snapshot fallback
    if (!hasData.current) {
      setData(STATIC_SNAPSHOT);
      setLastUpdated(new Date(STATIC_SNAPSHOT.timestamp));
      setSource('snapshot');
      hasData.current = true;
    }

    setLoading(false);
  }, []);

  // Load from localStorage on mount (before any fetch)
  useEffect(() => {
    const cached = loadFromLocalStorage();
    if (cached) {
      setData(cached);
      setLastUpdated(new Date(cached.timestamp));
      setSource('manual');
      hasData.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Manual data update from DataUpdater paste
  const setManualData = useCallback((json) => {
    setData(json);
    setLastUpdated(new Date(json.timestamp || Date.now()));
    setSource('manual');
    setError(null);
    hasData.current = true;
  }, []);

  return { data, loading, error, lastUpdated, nextRefresh, refetch: fetchData, source, setManualData };
}
