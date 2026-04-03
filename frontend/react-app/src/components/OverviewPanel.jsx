export default function OverviewPanel({ data }) {
  const ov = data?.architecture_overview || {};
  const scaleText = data?.scale_analysis || '';

  const flows = [
    { key: 'read_flow', label: 'Read Flow', cls: '' },
    { key: 'write_flow', label: 'Write Flow', cls: 'write' },
    { key: 'realtime_flow', label: 'Realtime Flow', cls: 'realtime' },
    { key: 'async_flow', label: 'Async Flow', cls: 'async' },
  ];

  return (
    <div className="oc show" id="oc0">
      <div className="och">
        <div className="cdot dc3"></div>
        <h4>Architecture Overview</h4>
        <span className="ocm">{scaleText.split('.')[0] || '—'}</span>
      </div>
      <div className="ov-body">
        <p style={{
          fontSize: '.83rem', color: 'var(--muted2)',
          lineHeight: 1.7, marginBottom: 16
        }}>
          {ov.strategy || scaleText}
        </p>
        <div className="ov-flows">
          {flows.map((f) => {
            const val = ov[f.key];
            if (!val || val === 'N/A - no real-time features' || val === 'N/A - no async processing') {
              return null;
            }
            return (
              <div key={f.key} className={`ov-flow ${f.cls}`}>
                <div className="ov-tag">{f.label}</div>
                <div className="ov-text">{val}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
