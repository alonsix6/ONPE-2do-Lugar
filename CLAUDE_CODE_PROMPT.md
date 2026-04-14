# Super Prompt — ONPE 2026 Electoral Dashboard
## Para Claude Code

---

## Contexto del proyecto

Construir una aplicación web de análisis electoral en tiempo real para las Elecciones Generales del Perú 2026. La app hace scraping de la API oficial de la ONPE, calcula una proyección bottom-up del 2do lugar presidencial (Rafael López Aliaga vs. Roberto Sánchez), y presenta un dashboard interactivo con auto-refresh.

**Stack:**
- Frontend: React + Vite + Recharts
- Backend: Netlify Functions (proxy CORS para la API de ONPE)
- Deploy: Netlify (desde GitHub, CI/CD automático)
- Estilos: CSS puro (sin Tailwind, sin librerías UI)

---

## Estructura del repositorio

```
onpe-2026/
├── netlify.toml
├── vite.config.js
├── package.json
├── index.html
├── netlify/
│   └── functions/
│       ├── onpe-nacional.js
│       ├── onpe-region.js
│       └── onpe-all-regions.js
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── App.css
    ├── constants/
    │   ├── regions.js
    │   └── ipsos.js
    ├── hooks/
    │   ├── useONPEData.js
    │   └── useProjection.js
    ├── components/
    │   ├── Header.jsx
    │   ├── GapCard.jsx
    │   ├── ProgressBar.jsx
    │   ├── RegionalTable.jsx
    │   ├── SensitivityPanel.jsx
    │   ├── ModelComparison.jsx
    │   ├── ProjectionResult.jsx
    │   └── AutoRefreshBadge.jsx
    └── utils/
        ├── projection.js
        └── format.js
```

---

## API de la ONPE — documentación real

### Base URL
```
https://resultadoelectoral.onpe.gob.pe/presentacion-backend
```

### Endpoint 1 — Totales nacionales de actas
```
GET /resumen-general/totales?idAmbitoGeografico=1&idEleccion=10&tipoFiltro=nacional
```

Respuesta:
```json
{
  "success": true,
  "data": {
    "actasContabilizadas": 68.886,
    "contabilizadas": 63903,
    "totalActas": 92766,
    "actasPendientesJee": 30.351,
    "pendientesJee": 28155,
    "fechaActualizacion": 1776143839285
  }
}
```

### Endpoint 2 — Totales de actas por departamento
```
GET /resumen-general/totales?idAmbitoGeografico=1&idEleccion=10&tipoFiltro=ubigeo_nivel_01&idUbigeoDepartamento={codigo}
```

Respuesta:
```json
{
  "success": true,
  "data": {
    "actasContabilizadas": 47.0,
    "contabilizadas": 1991,
    "totalActas": 4240,
    "actasPendientesJee": 52.7,
    "pendientesJee": 2235,
    "fechaActualizacion": 1776143839285
  }
}
```

### Endpoint 3 — Votos presidenciales por departamento
```
GET /eleccion-presidencial/participantes-ubicacion-geografica-nombre?tipoFiltro=ubigeo_nivel_01&idAmbitoGeografico=1&ubigeoNivel1={codigo}&idEleccion=10
```

Respuesta (array de candidatos):
```json
{
  "success": true,
  "data": [
    {
      "nombreAgrupacionPolitica": "JUNTOS POR EL PERÚ",
      "codigoAgrupacionPolitica": "10",
      "nombreCandidato": "ROBERTO HELBERT SANCHEZ PALOMINO",
      "dniCandidato": "16002918",
      "totalVotosValidos": 125033,
      "porcentajeVotosValidos": 38.024,
      "porcentajeVotosEmitidos": 30.207
    }
  ]
}
```

**IMPORTANTE:** Filtrar candidatos que no tienen `porcentajeVotosValidos` (votos en blanco, nulos, impugnados).

---

## Mapa de códigos ONPE por departamento

**CRÍTICO:** Los códigos NO siguen el orden INEI estándar. Van por primera provincia alfabética del departamento:

```javascript
export const DEPARTAMENTOS = [
  { nombre: 'Amazonas',      cod: '010000' },  // Bagua
  { nombre: 'Ancash',        cod: '020000' },  // Aija
  { nombre: 'Apurímac',      cod: '030000' },  // Abancay
  { nombre: 'Arequipa',      cod: '040000' },  // Arequipa
  { nombre: 'Ayacucho',      cod: '050000' },  // Cangallo
  { nombre: 'Cajamarca',     cod: '060000' },  // Cajabamba
  { nombre: 'Cusco',         cod: '070000' },  // Acomayo
  { nombre: 'Huancavelica',  cod: '080000' },  // Acobamba
  { nombre: 'Huánuco',       cod: '090000' },  // Ambo
  { nombre: 'Ica',           cod: '100000' },  // Chincha
  { nombre: 'Junín',         cod: '110000' },  // Chanchamayo
  { nombre: 'La Libertad',   cod: '120000' },  // Ascope
  { nombre: 'Lambayeque',    cod: '130000' },  // Chiclayo
  { nombre: 'Lima',          cod: '140000' },  // Barranca (incluye Lima Metropolitana)
  { nombre: 'Loreto',        cod: '150000' },  // Alto Amazonas
  { nombre: 'Madre de Dios', cod: '160000' },  // Manú
  { nombre: 'Moquegua',      cod: '170000' },  // Gral. Sánchez Cerro
  { nombre: 'Pasco',         cod: '180000' },  // Daniel A. Carrión
  { nombre: 'Piura',         cod: '190000' },  // Ayabaca
  { nombre: 'Puno',          cod: '200000' },  // Azángaro
  { nombre: 'San Martín',    cod: '210000' },  // Bellavista
  { nombre: 'Tacna',         cod: '220000' },  // Candarave
  { nombre: 'Tumbes',        cod: '230000' },  // Contralmirante Villar
  { nombre: 'Callao',        cod: '240000' },  // Callao (1 provincia)
  { nombre: 'Ucayali',       cod: '250000' },  // Atalaya
];
```

---

## Netlify Functions — implementación

### netlify/functions/onpe-all-regions.js
Esta es la función principal. Consulta todas las regiones en paralelo.

```javascript
const BASE = 'https://resultadoelectoral.onpe.gob.pe/presentacion-backend';

const DEPARTAMENTOS = [
  { nombre: 'Amazonas', cod: '010000' },
  { nombre: 'Ancash', cod: '020000' },
  { nombre: 'Apurímac', cod: '030000' },
  { nombre: 'Arequipa', cod: '040000' },
  { nombre: 'Ayacucho', cod: '050000' },
  { nombre: 'Cajamarca', cod: '060000' },
  { nombre: 'Cusco', cod: '070000' },
  { nombre: 'Huancavelica', cod: '080000' },
  { nombre: 'Huánuco', cod: '090000' },
  { nombre: 'Ica', cod: '100000' },
  { nombre: 'Junín', cod: '110000' },
  { nombre: 'La Libertad', cod: '120000' },
  { nombre: 'Lambayeque', cod: '130000' },
  { nombre: 'Lima', cod: '140000' },
  { nombre: 'Loreto', cod: '150000' },
  { nombre: 'Madre de Dios', cod: '160000' },
  { nombre: 'Moquegua', cod: '170000' },
  { nombre: 'Pasco', cod: '180000' },
  { nombre: 'Piura', cod: '190000' },
  { nombre: 'Puno', cod: '200000' },
  { nombre: 'San Martín', cod: '210000' },
  { nombre: 'Tacna', cod: '220000' },
  { nombre: 'Tumbes', cod: '230000' },
  { nombre: 'Callao', cod: '240000' },
  { nombre: 'Ucayali', cod: '250000' },
];

async function fetchRegion(dep) {
  const headers = {
    'Accept': 'application/json',
    'Referer': 'https://resultadoelectoral.onpe.gob.pe/',
    'User-Agent': 'Mozilla/5.0',
  };

  const [totalesRes, votosRes] = await Promise.all([
    fetch(`${BASE}/resumen-general/totales?idAmbitoGeografico=1&idEleccion=10&tipoFiltro=ubigeo_nivel_01&idUbigeoDepartamento=${dep.cod}`, { headers }),
    fetch(`${BASE}/eleccion-presidencial/participantes-ubicacion-geografica-nombre?tipoFiltro=ubigeo_nivel_01&idAmbitoGeografico=1&ubigeoNivel1=${dep.cod}&idEleccion=10`, { headers }),
  ]);

  const totales = await totalesRes.json();
  const votos = await votosRes.json();

  if (!totales.success || !votos.success) return null;

  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const candidatos = votos.data.filter(c => c.porcentajeVotosValidos != null);
  const rla = candidatos.find(c => norm(c.nombreCandidato || '').includes('LOPEZ ALIAGA'));
  const san = candidatos.find(c => norm(c.nombreCandidato || '').includes('SANCHEZ PALOMINO'));
  const keiko = candidatos.find(c => norm(c.nombreCandidato || '').includes('FUJIMORI'));
  const belmont = candidatos.find(c => norm(c.nombreCandidato || '').includes('BELMONT'));

  if (!rla || !san) return null;

  const { totalActas, contabilizadas, actasContabilizadas } = totales.data;
  const actasPend = totalActas - contabilizadas;
  const totalValidosReg = rla.totalVotosValidos / (rla.porcentajeVotosValidos / 100);
  const votosXActa = contabilizadas > 0 ? totalValidosReg / contabilizadas : 160;
  const votosPend = actasPend * votosXActa;
  const delta = votosPend * ((san.porcentajeVotosValidos - rla.porcentajeVotosValidos) / 100);

  return {
    nombre: dep.nombre,
    cod: dep.cod,
    pctProcesado: actasContabilizadas,
    totalActas,
    contabilizadas,
    actasPend,
    votosPend: Math.round(votosPend),
    rla: {
      votos: rla.totalVotosValidos,
      pct: rla.porcentajeVotosValidos,
    },
    sanchez: {
      votos: san.totalVotosValidos,
      pct: san.porcentajeVotosValidos,
    },
    keiko: keiko ? { votos: keiko.totalVotosValidos, pct: keiko.porcentajeVotosValidos } : null,
    belmont: belmont ? { votos: belmont.totalVotosValidos, pct: belmont.porcentajeVotosValidos } : null,
    delta: Math.round(delta),
    favorDe: delta > 0 ? 'SANCHEZ' : 'RLA',
    todosLosCandidatos: candidatos.map(c => ({
      nombre: c.nombreCandidato,
      partido: c.nombreAgrupacionPolitica,
      votos: c.totalVotosValidos,
      pct: c.porcentajeVotosValidos,
    })),
  };
}

export const handler = async () => {
  try {
    // Nacional
    const nacRes = await fetch(
      `${BASE}/resumen-general/totales?idAmbitoGeografico=1&idEleccion=10&tipoFiltro=nacional`,
      { headers: { Accept: 'application/json', Referer: 'https://resultadoelectoral.onpe.gob.pe/' } }
    );
    const nacional = await nacRes.json();

    // Votos nacionales
    const votNacRes = await fetch(
      `${BASE}/eleccion-presidencial/participantes-ubicacion-geografica-nombre?tipoFiltro=nacional&idAmbitoGeografico=1&idEleccion=10`,
      { headers: { Accept: 'application/json', Referer: 'https://resultadoelectoral.onpe.gob.pe/' } }
    );
    const votNac = await votNacRes.json();

    // Todas las regiones en paralelo
    const resultados = await Promise.all(DEPARTAMENTOS.map(fetchRegion));
    const regiones = resultados.filter(Boolean);

    const deltaTotalSanchez = regiones.reduce((s, r) => s + r.delta, 0);

    // Gap actual desde votos nacionales
    const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const candidatosNac = (votNac.data || []).filter(c => c.porcentajeVotosValidos != null);
    const rlaNac = candidatosNac.find(c => norm(c.nombreCandidato || '').includes('LOPEZ ALIAGA'));
    const sanNac = candidatosNac.find(c => norm(c.nombreCandidato || '').includes('SANCHEZ PALOMINO'));
    const gapActual = rlaNac && sanNac ? rlaNac.totalVotosValidos - sanNac.totalVotosValidos : null;
    const gapFinal = gapActual !== null ? gapActual - deltaTotalSanchez : null;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=120',
      },
      body: JSON.stringify({
        timestamp: Date.now(),
        nacional: nacional.success ? nacional.data : null,
        candidatosNacionales: candidatosNac.map(c => ({
          nombre: c.nombreCandidato,
          partido: c.nombreAgrupacionPolitica,
          votos: c.totalVotosValidos,
          pct: c.porcentajeVotosValidos,
        })),
        gapActual,
        deltaTotalSanchez: Math.round(deltaTotalSanchez),
        gapFinal: gapFinal !== null ? Math.round(gapFinal) : null,
        resultado: gapFinal > 0 ? 'RLA' : 'SANCHEZ',
        regiones: regiones.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
```

---

## netlify.toml

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[dev]
  command = "npm run dev"
  port = 3000
  targetPort = 5173

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/.netlify/functions/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Headers = "Content-Type"
```

---

## Lógica de proyección — src/utils/projection.js

```javascript
export function calcBottomUp(regiones, gapActual, adjustments = {}) {
  const regionesAjustadas = regiones.map(r => {
    if (!adjustments[r.nombre]) return r;
    const adj = adjustments[r.nombre];
    const pctSanchezNew = adj.pctSanchez ?? r.sanchez.pct;
    const pctRlaNew = adj.pctRla ?? r.rla.pct;
    const deltaNew = r.votosPend * ((pctSanchezNew - pctRlaNew) / 100);
    return { ...r, delta: Math.round(deltaNew) };
  });

  const deltaTotalSanchez = regionesAjustadas.reduce((s, r) => s + r.delta, 0);
  const gapFinal = gapActual - deltaTotalSanchez;

  return {
    deltaTotalSanchez: Math.round(deltaTotalSanchez),
    gapFinal: Math.round(gapFinal),
    resultado: gapFinal > 0 ? 'RLA' : 'SANCHEZ',
    margen: Math.abs(gapFinal),
    regionesAjustadas,
  };
}

export function calcSensitivity(regiones, gapActual, steps = 50) {
  // Para el slider de Cajamarca: muestra cómo cambia el resultado
  const caj = regiones.find(r => r.nombre === 'Cajamarca');
  if (!caj) return [];
  const results = [];
  for (let pct = 30; pct <= 55; pct += (55-30)/steps) {
    const deltaAdj = caj.votosPend * ((pct - caj.rla.pct) / 100);
    const deltaTotal = regiones.reduce((s,r) =>
      r.nombre === 'Cajamarca' ? s + deltaAdj : s + r.delta, 0
    );
    results.push({ pct: Math.round(pct * 10) / 10, gapFinal: Math.round(gapActual - deltaTotal) });
  }
  return results;
}
```

---

## Hook principal — src/hooks/useONPEData.js

```javascript
import { useState, useEffect, useCallback } from 'react';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos

export function useONPEData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [nextRefresh, setNextRefresh] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.fetch('/api/onpe-all-regions');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
      setNextRefresh(new Date(Date.now() + REFRESH_INTERVAL));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetch]);

  return { data, loading, error, lastUpdated, nextRefresh, refetch: fetch };
}
```

---

## Datos de referencia — src/constants/ipsos.js

```javascript
// Conteo Rápido Integral Ipsos/NDI/Transparencia al 95.7%
export const IPSOS_NDI = {
  fuente: 'Ipsos/NDI/Transparencia',
  metodologia: 'PRVT estratificado polietápico, 124 provincias, 25 regiones',
  muestra: '1,037 actas (991 recibidas, 95.7%)',
  margenError: '±1.0-1.3pp',
  trackRecord: '<1pp vs ONPE final desde 2001',
  resultados: {
    keiko:   { pct: 17.1, me: 1.0 },
    sanchez: { pct: 12.4, me: 1.3 },
    rla:     { pct: 11.3, me: 1.2 },
    nieto:   { pct: 10.7, me: 0.9 },
    belmont: { pct: 10.2, me: 0.5 },
  },
  desagregado: {
    urbano: { sanchez: 7.9, rla: 13.1, keiko: 17.4 },
    rural:  { sanchez: 33.8, rla: 3.0, keiko: 15.9 },
    costa:  { sanchez: 5.2, rla: 15.2, keiko: 19.7 },
    sierra: { sanchez: 23.9, rla: 5.4, keiko: 10.8 },
    selva:  { sanchez: 22.7, rla: 5.0, keiko: 19.8 },
  },
};

// Datum conteo rápido al 100%
export const DATUM = {
  fuente: 'Datum Internacional / América TV',
  metodologia: '1,500 actas, ±1%',
  resultados: {
    keiko:   { pct: 16.8 },
    rla:     { pct: 12.9 },
    nieto:   { pct: 11.6 },
    belmont: { pct: 10.1 },
    sanchez: { pct: 9.4  },
  },
};
```

---

## Diseño del dashboard

**Paleta de colores:**
- RLA: `#185FA5` (azul)
- Sánchez: `#A32D2D` (rojo)
- Keiko: `#FF6B00` (naranja)
- Fondo: sistema CSS variables del host
- Fuente: monospace para números, sans-serif para texto

**Componentes clave:**

1. **Header** — título + badge "EN VIVO" parpadeante + última actualización
2. **ProgressBar** — barra del % de actas procesadas
3. **GapCard** — gap actual RLA-Sánchez con flecha de tendencia
4. **ProjectionResult** — resultado proyectado con color dinámico (azul/rojo)
5. **RegionalTable** — tabla ordenada por |delta|, con barras de progreso inline
6. **SensitivityPanel** — sliders para Cajamarca%, Cusco%, Lima% → actualiza proyección en tiempo real
7. **ModelComparison** — cards de los 4 modelos (Bottom-up, Ipsos/NDI, Datum, Tendencia)
8. **AutoRefreshBadge** — countdown al próximo refresh + botón manual

---

## package.json

```json
{
  "name": "onpe-2026",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^2.12.7"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.2"
  }
}
```

---

## vite.config.js

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/.netlify/functions'),
      },
    },
  },
});
```

---

## Instrucciones de desarrollo local

```bash
# 1. Clonar y instalar
git clone https://github.com/TU_USUARIO/onpe-2026.git
cd onpe-2026
npm install
npm install -g netlify-cli

# 2. Correr con Netlify Dev (Functions + Vite juntos)
netlify dev

# 3. La app corre en http://localhost:3000
# Las functions en http://localhost:8888/.netlify/functions/
```

---

## Deploy en Netlify

```bash
# Primera vez
netlify login
netlify init
# → Seleccionar "Create & configure a new site"
# → Build command: npm run build
# → Publish directory: dist

# Deploys automáticos: cada push a main en GitHub dispara el build
```

---

## Features adicionales (fase 2)

- [ ] Nivel provincia: endpoint `/presentacion-backend/resumen-general/totales?tipoFiltro=ubigeo_nivel_02&idUbigeoDepartamento={cod}&idUbigeoProvincia={codProvincia}` — más granular, mejor proyección
- [ ] Histórico de snapshots: guardar cada respuesta en Netlify Blob Storage
- [ ] Gráfico de evolución del gap en el tiempo
- [ ] Alerta cuando Sánchez supere a RLA
- [ ] Compartir resultado en Twitter/X con un click
- [ ] PWA con notificaciones push cuando cambie el resultado proyectado

---

## Notas importantes

1. **La ONPE actualiza sus datos cada ~30 minutos aprox.** — Hacer refresh cada 5min es suficiente
2. **El endpoint de la API ONPE puede cambiar** — Si falla, inspeccionar con el interceptor XHR de la consola
3. **Después del 100% de actas** — La ONPE cierra el conteo, la app entra en modo "resultado final"
4. **Segunda vuelta (7 junio 2026)** — La misma arquitectura sirve para el balotaje, solo cambiar los candidatos objetivo

---

*Generado el 14 de abril de 2026 — Análisis en tiempo real Elecciones Perú 2026*
