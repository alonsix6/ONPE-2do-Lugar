export default function GapCard({ label, value, subtitle, colorClass }) {
  return (
    <div className="card">
      <div className="card-label">{label}</div>
      <div className={`card-val${colorClass ? ' ' + colorClass : ''}`}>{value}</div>
      <div className="card-sub">{subtitle}</div>
    </div>
  );
}
