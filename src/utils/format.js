export function fmtNum(n) {
  return (n >= 0 ? '+' : '') + Math.round(n).toLocaleString('es-PE');
}

export function fmtPct(n) {
  return n.toFixed(1) + '%';
}

export function fmtThousands(n) {
  return Math.round(n).toLocaleString('es-PE');
}

export function fmtDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}
