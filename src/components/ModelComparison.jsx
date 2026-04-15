import { fmtThousands } from '../utils/format';

export default function ModelComparison({ bottomUpResult }) {
  const gapLabel = bottomUpResult
    ? `${bottomUpResult.resultado === 'RLA' ? 'RLA' : 'Sánchez'} 2do (+${fmtThousands(bottomUpResult.margen)})`
    : '—';
  const gapColor = bottomUpResult?.resultado === 'RLA' ? '#185FA5' : '#A32D2D';

  return (
    <div className="section">
      <div className="section-title">Comparación de modelos</div>
      <div className="conflict">
        <div className="conflict-card">
          <div className="conflict-src">Bottom-up v4 (este análisis)</div>
          <div className="conflict-val" style={{ color: gapColor }}>{gapLabel}</div>
          <div className="conflict-lbl">Datos reales ONPE por región. Supone que % pendiente = % observado.</div>
        </div>
        <div className="conflict-card">
          <div className="conflict-src">
            Ipsos/NDI/Transparencia <span className="stars">★★★★★</span>
          </div>
          <div className="conflict-val" style={{ color: '#A32D2D' }}>Sánchez 12.4%</div>
          <div className="conflict-lbl">Muestra estratificada 124 provincias. Captura ruralidad real.</div>
        </div>
        <div className="conflict-card">
          <div className="conflict-src">Datum conteo rápido</div>
          <div className="conflict-val" style={{ color: '#185FA5' }}>RLA +~200,000</div>
          <div className="conflict-lbl">1,500 actas. Metodología no publicada.</div>
        </div>
        <div className="conflict-card">
          <div className="conflict-src">Tendencia ONPE lineal</div>
          <div className="conflict-val" style={{ color: '#A32D2D' }}>Sánchez (70-73%)</div>
          <div className="conflict-lbl">Tasa cierre: 20,855 votos/1%. Sesgado — Lima-pesado.</div>
        </div>
      </div>
    </div>
  );
}
