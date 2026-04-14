import { useState, useCallback } from 'react';

export default function SensitivityPanel({ regiones, onAdjust }) {
  const caj = regiones?.find(r => r.nombre === 'Cajamarca');
  const cus = regiones?.find(r => r.nombre === 'Cusco');
  const lim = regiones?.find(r => r.nombre === 'Lima');

  const [cajVal, setCajVal] = useState(() => Math.round(caj?.sanchez?.pct ?? 38));
  const [cusVal, setCusVal] = useState(() => Math.round(cus?.sanchez?.pct ?? 19));
  const [limVal, setLimVal] = useState(() => Math.round(lim?.rla?.pct ?? 20));

  const emitAdjust = useCallback((newCaj, newCus, newLim) => {
    const adj = {};
    if (caj) adj['Cajamarca'] = { pctSanchez: newCaj, pctRla: caj.rla.pct };
    if (cus) adj['Cusco'] = { pctSanchez: newCus, pctRla: cus.rla.pct };
    if (lim) adj['Lima'] = { pctSanchez: lim.sanchez.pct, pctRla: newLim };
    onAdjust(adj);
  }, [caj, cus, lim, onAdjust]);

  const handleCaj = (e) => {
    const v = Number(e.target.value);
    setCajVal(v);
    emitAdjust(v, cusVal, limVal);
  };
  const handleCus = (e) => {
    const v = Number(e.target.value);
    setCusVal(v);
    emitAdjust(cajVal, v, limVal);
  };
  const handleLim = (e) => {
    const v = Number(e.target.value);
    setLimVal(v);
    emitAdjust(cajVal, cusVal, v);
  };

  return (
    <div className="section">
      <div className="section-title">Análisis de sensibilidad</div>
      <div className="proj-box">
        <div className="slider-row">
          <label>Sánchez en Cajamarca</label>
          <input type="range" min="35" max="52" step="1" value={cajVal} onChange={handleCaj} />
          <span>{cajVal}%</span>
        </div>
        <div className="slider-row">
          <label>Sánchez en Cusco</label>
          <input type="range" min="15" max="30" step="1" value={cusVal} onChange={handleCus} />
          <span>{cusVal}%</span>
        </div>
        <div className="slider-row">
          <label>RLA en Lima pend.</label>
          <input type="range" min="15" max="25" step="1" value={limVal} onChange={handleLim} />
          <span>{limVal}%</span>
        </div>
      </div>
    </div>
  );
}
