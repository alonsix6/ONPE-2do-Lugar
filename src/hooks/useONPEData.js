import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchONPEDirect } from '../utils/fetchONPE';
import { STATIC_SNAPSHOT } from '../constants/snapshot';
import { loadFromLocalStorage, saveToLocalStorage, loadFromHash } from '../components/DataUpdater';
import { normalizeData } from '../utils/normalize';

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

  function loadData(raw, src) {
    const normalized = normalizeData(raw);
    setData(normalized);
    setLastUpdated(new Date(normalized.timestamp || Date.now()));
    setSource(src);
    hasData.current = true;
    saveToLocalStorage(normalized);
  }

  // On mount: check hash fragment first (auto-transfer from ONPE console)
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const hashData = loadFromHash();
    if (hashData) {
      loadData(hashData, 'manual');
      setLoading(false);
      return;
    }

    const cached = loadFromLocalStorage();
    if (cached) {
      loadData(cached, 'manual');
      setLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Strategy 1: Call ONPE API directly from the browser
    try {
      const json = await fetchONPEDirect();
      if (json.regiones && json.regiones.length > 0) {
        loadData(json, 'live');
        setNextRefresh(new Date(Date.now() + REFRESH_INTERVAL));
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Client-side ONPE fetch failed:', e.message);
    }

    // Strategy 2: static snapshot
    if (!hasData.current) {
      loadData(STATIC_SNAPSHOT, 'snapshot');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const setManualData = useCallback((json) => {
    loadData(json, 'manual');
    setError(null);
  }, []);

  return { data, loading, error, lastUpdated, nextRefresh, refetch: fetchData, source, setManualData };
}
