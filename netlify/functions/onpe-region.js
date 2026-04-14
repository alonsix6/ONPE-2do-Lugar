const BASE = 'https://resultadoelectoral.onpe.gob.pe/presentacion-backend';

export const handler = async (event) => {
  const cod = event.queryStringParameters?.cod;
  if (!cod) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing ?cod= parameter (e.g. 060000)' }),
    };
  }

  try {
    const headers = {
      'Referer': 'https://resultadoelectoral.onpe.gob.pe/main/resumen',
      'Origin': 'https://resultadoelectoral.onpe.gob.pe',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'es-PE,es;q=0.9',
      'X-Requested-With': 'XMLHttpRequest',
      'Connection': 'keep-alive',
    };

    const [totalesRes, votosRes] = await Promise.all([
      fetch(`${BASE}/resumen-general/totales?idAmbitoGeografico=1&idEleccion=10&tipoFiltro=ubigeo_nivel_01&idUbigeoDepartamento=${cod}`, { headers }),
      fetch(`${BASE}/eleccion-presidencial/participantes-ubicacion-geografica-nombre?tipoFiltro=ubigeo_nivel_01&idAmbitoGeografico=1&ubigeoNivel1=${cod}&idEleccion=10`, { headers }),
    ]);

    if (!totalesRes.ok) throw new Error(`HTTP ${totalesRes.status}`);
    if (!votosRes.ok) throw new Error(`HTTP ${votosRes.status}`);

    const totales = await totalesRes.json();
    const votos = await votosRes.json();

    const candidatos = (votos.data || []).filter(c => c.porcentajeVotosValidos != null);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=120',
      },
      body: JSON.stringify({
        timestamp: Date.now(),
        totales: totales.success ? totales.data : null,
        candidatos: candidatos.map(c => ({
          nombre: c.nombreCandidato,
          partido: c.nombreAgrupacionPolitica,
          votos: c.totalVotosValidos,
          pct: c.porcentajeVotosValidos,
        })),
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
