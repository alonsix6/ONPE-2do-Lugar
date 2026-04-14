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
