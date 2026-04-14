import { useMemo } from 'react';
import { calcBottomUp, calcSensitivity } from '../utils/projection';

export function useProjection(data, adjustments = {}) {
  const projection = useMemo(() => {
    if (!data || !data.regiones) return null;
    return calcBottomUp(data.regiones, data.gapActual, adjustments);
  }, [data, adjustments]);

  const sensitivity = useMemo(() => {
    if (!data || !data.regiones) return [];
    return calcSensitivity(data.regiones, data.gapActual);
  }, [data]);

  return { projection, sensitivity };
}
