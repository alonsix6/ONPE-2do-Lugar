import { useState, useCallback } from 'react';
import { useONPEData } from './hooks/useONPEData';
import { useProjection } from './hooks/useProjection';
import { fmtThousands, fmtPct } from './utils/format';

import Header from './components/Header';
import ProgressBar from './components/ProgressBar';
import GapCard from './components/GapCard';
import SensitivityPanel from './components/SensitivityPanel';
import ProjectionResult from './components/ProjectionResult';
import RegionalTable from './components/RegionalTable';
import ModelComparison from './components/ModelComparison';
import AutoRefreshBadge from './components/AutoRefreshBadge';
import DataUpdater from './components/DataUpdater';

export default function App() {
  const { data, loading, error, lastUpdated, nextRefresh, refetch, source, setManualData } = useONPEData();
  const [adjustments, setAdjustments] = useState({});

  const handleAdjust = useCallback((adj) => {
    setAdjustments(adj);
  }, []);

  const { projection } = useProjection(data, adjustments);

  // Primera carga
  if (!data && loading) {
    return (
      <div className="db">
        <div className="loading-screen">
          <div className="spinner" />
          Cargando datos de ONPE…
        </div>
      </div>
    );
  }

  // Error sin datos previos
  if (!data && error) {
    return (
      <div className="db">
        <Header lastUpdated={null} loading={false} source={source} />
        <div className="error-box">
          <span>Error: {error}</span>
          <button onClick={refetch}>Reintentar</button>
        </div>
        <DataUpdater onUpdate={setManualData} />
      </div>
    );
  }

  const nacional = data?.nacional;
  const gapActual = data?.gapActual;
  const regiones = projection?.regionesAjustadas || data?.regiones || [];
  const gapFinal = projection?.gapFinal ?? data?.gapFinal;
  const resultado = projection?.resultado ?? data?.resultado;
  const deltaSanchez = projection?.deltaTotalSanchez ?? data?.deltaTotalSanchez;

  const isRla = resultado === 'RLA';

  return (
    <div className="db">
      <Header lastUpdated={lastUpdated} loading={loading} source={source} />

      <ProgressBar percentage={nacional?.actasContabilizadas} />

      <div className="cards">
        <GapCard
          label="Actas procesadas"
          value={nacional ? fmtPct(nacional.actasContabilizadas) : '—'}
          subtitle={nacional ? `${fmtThousands(nacional.contabilizadas)} / ${fmtThousands(nacional.totalActas)}` : ''}
        />
        <GapCard
          label="Gap actual"
          value={gapActual != null ? fmtThousands(gapActual) : '—'}
          subtitle="RLA sobre Sánchez"
          colorClass="rla"
        />
        <GapCard
          label="Δ Sánchez pend."
          value={deltaSanchez != null ? `+${fmtThousands(deltaSanchez)}` : '—'}
          subtitle="votos netos proyect."
          colorClass="san"
        />
        <GapCard
          label="Gap proyectado"
          value={gapFinal != null ? `+${fmtThousands(Math.abs(gapFinal))}` : '—'}
          subtitle={isRla ? 'RLA 2do lugar' : 'Sánchez 2do lugar'}
          colorClass={isRla ? 'rla' : 'san'}
        />
      </div>

      <SensitivityPanel
        regiones={data?.regiones}
        onAdjust={handleAdjust}
      />

      <ProjectionResult gapFinal={gapFinal} resultado={resultado} />

      <RegionalTable regiones={regiones} />

      <ModelComparison bottomUpResult={projection} />

      <DataUpdater onUpdate={setManualData} />

      <AutoRefreshBadge
        nextRefresh={nextRefresh}
        onRefresh={refetch}
        loading={loading}
      />
    </div>
  );
}
