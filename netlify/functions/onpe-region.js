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
      'Accept': 'application/json',
      'Referer': 'https://resultadoelectoral.onpe.gob.pe/',
      'User-Agent': 'Mozilla/5.0',
    };

    const [totalesRes, votosRes] = await Promise.all([
      fetch(`${BASE}/resumen-general/totales?idAmbitoGeografico=1&idEleccion=10&tipoFiltro=ubigeo_nivel_01&idUbigeoDepartamento=${cod}`, { headers }),
      fetch(`${BASE}/eleccion-presidencial/participantes-ubicacion-geografica-nombre?tipoFiltro=ubigeo_nivel_01&idAmbitoGeografico=1&ubigeoNivel1=${cod}&idEleccion=10`, { headers }),
    ]);

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
