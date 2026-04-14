export default function ProgressBar({ percentage }) {
  const pct = percentage != null ? percentage : 0;
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
