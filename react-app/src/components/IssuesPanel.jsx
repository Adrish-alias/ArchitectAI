const SEVERITY_CONFIG = {
  high:   { color: '#ff3d5c', bg: 'rgba(255,61,92,.08)',  border: 'rgba(255,61,92,.2)',  icon: '🔴' },
  medium: { color: '#ffaa30', bg: 'rgba(255,170,48,.08)', border: 'rgba(255,170,48,.2)', icon: '🟡' },
  low:    { color: '#00f0b4', bg: 'rgba(0,240,180,.08)',  border: 'rgba(0,240,180,.2)',  icon: '🟢' },
};

const TYPE_LABELS = {
  unnecessary:  { label: 'UNNECESSARY',  color: '#ff3daa', bg: 'rgba(255,61,170,.1)', border: 'rgba(255,61,170,.2)' },
  missing:      { label: 'MISSING',      color: '#3d7fff', bg: 'rgba(61,127,255,.1)',  border: 'rgba(61,127,255,.2)' },
  anti_pattern: { label: 'ANTI-PATTERN', color: '#ff3d5c', bg: 'rgba(255,61,92,.1)',   border: 'rgba(255,61,92,.2)' },
  cost:         { label: 'COST ISSUE',   color: '#ffd060', bg: 'rgba(255,208,96,.1)',   border: 'rgba(255,208,96,.2)' },
};

export default function IssuesPanel({ issues = [] }) {
  const highCount   = issues.filter(i => i.severity === 'high').length;
  const mediumCount = issues.filter(i => i.severity === 'medium').length;
  const lowCount    = issues.filter(i => i.severity === 'low').length;

  return (
    <div className="oc show" id="issues-panel">
      <div className="och">
        <div className="cdot" style={{ background: highCount > 0 ? '#ff3d5c' : '#ffaa30' }}></div>
        <h4>Architecture Issues</h4>
        <span className="ocm">{issues.length} issue{issues.length !== 1 ? 's' : ''} found</span>
      </div>
      <div className="issues-body">
        {/* Severity summary */}
        <div className="issues-summary">
          {highCount > 0 && (
            <div className="issue-count-pill" style={{ background: SEVERITY_CONFIG.high.bg, borderColor: SEVERITY_CONFIG.high.border, color: SEVERITY_CONFIG.high.color }}>
              {SEVERITY_CONFIG.high.icon} {highCount} High
            </div>
          )}
          {mediumCount > 0 && (
            <div className="issue-count-pill" style={{ background: SEVERITY_CONFIG.medium.bg, borderColor: SEVERITY_CONFIG.medium.border, color: SEVERITY_CONFIG.medium.color }}>
              {SEVERITY_CONFIG.medium.icon} {mediumCount} Medium
            </div>
          )}
          {lowCount > 0 && (
            <div className="issue-count-pill" style={{ background: SEVERITY_CONFIG.low.bg, borderColor: SEVERITY_CONFIG.low.border, color: SEVERITY_CONFIG.low.color }}>
              {SEVERITY_CONFIG.low.icon} {lowCount} Low
            </div>
          )}
        </div>

        {/* Issue cards */}
        <div className="issues-list">
          {issues.map((issue, idx) => {
            const sev = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.medium;
            const typ = TYPE_LABELS[issue.type] || TYPE_LABELS.anti_pattern;
            return (
              <div key={idx} className="issue-card" style={{ borderLeftColor: sev.color }}>
                <div className="issue-card-header">
                  <span className="issue-type-badge" style={{ background: typ.bg, borderColor: typ.border, color: typ.color }}>
                    {typ.label}
                  </span>
                  <span className="issue-severity-badge" style={{ background: sev.bg, borderColor: sev.border, color: sev.color }}>
                    {sev.icon} {issue.severity?.toUpperCase()}
                  </span>
                </div>
                <div className="issue-title">{issue.title}</div>
                {issue.service_name && (
                  <div className="issue-service">
                    <span className="issue-service-icon">☁️</span>
                    {issue.service_name}
                    {issue.node_id && <span className="issue-node-id">({issue.node_id})</span>}
                  </div>
                )}
                <div className="issue-description">{issue.description}</div>
                <div className="issue-recommendation">
                  <span className="issue-rec-icon">💡</span>
                  {issue.recommendation}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
