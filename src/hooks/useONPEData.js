import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchONPEDirect } from '../utils/fetchONPE';
import { STATIC_SNAPSHOT } from '../constants/snapshot';
import { loadFromLocalStorage, saveToLocalStorage, loadFromHash } from '../components/DataUpdater';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos

export function useONPEData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [nextRefresh, setNextRefresh] = useState(null);
  const [source, setSource] = useState(null);
  const hasData = useRef(false);
  const initDone = useRef(false);

  // On mount: check hash fragment first (auto-transfer from ONPE console)
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    // Priority 1: hash fragment (just transferred from ONPE console)
    const hashData = loadFromHash();
    if (hashData) {
      setData(hashData);
      setLastUpdated(new Date(hashData.timestamp || Date.now()));
      setSource('manual');
      setLoading(false);
      hasData.current = true;
      saveToLocalStorage(hashData);
      return;
    }

    // Priority 2: localStorage (previously saved data)
    const cached = loadFromLocalStorage();
    if (cached) {
      setData(cached);
      setLastUpdated(new Date(cached.timestamp || Date.now()));
      setSource('manual');
      setLoading(false);
      hasData.current = true;
    }
  }, []);

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

    // Strategy 3: localStorage / static snapshot (already loaded on mount)
    if (!hasData.current) {
      setData(STATIC_SNAPSHOT);
      setLastUpdated(new Date(STATIC_SNAPSHOT.timestamp));
      setSource('snapshot');
      hasData.current = true;
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const setManualData = useCallback((json) => {
    setData(json);
    setLastUpdated(new Date(json.timestamp || Date.now()));
    setSource('manual');
    setError(null);
    hasData.current = true;
    saveToLocalStorage(json);
  }, []);

  return { data, loading, error, lastUpdated, nextRefresh, refetch: fetchData, source, setManualData };
}
