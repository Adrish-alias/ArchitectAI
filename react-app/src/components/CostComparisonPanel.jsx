import { useEffect, useRef } from 'react';

const BAR_COLORS_OLD = [
  'linear-gradient(90deg, #5a6278, #8892a8)',
  'linear-gradient(90deg, #5a6278, #7a8498)',
];

const BAR_COLORS_NEW = [
  'linear-gradient(90deg, var(--cyan), #00b890)',
  'linear-gradient(90deg, var(--blue), #6090ff)',
  'linear-gradient(90deg, var(--magenta), #ff70cc)',
  'linear-gradient(90deg, var(--gold), #ffaa30)',
  'linear-gradient(90deg, #7ddd9a, #40cc70)',
];

function parseCost(str) {
  if (!str) return 0;
  const m = (str.match(/[\d,]+/) || [])[0];
  return m ? parseInt(m.replace(/,/g, '')) : 0;
}

export default function CostComparisonPanel({
  originalEstimate = '',
  optimizedEstimate = '',
  costDelta = '',
  savingsPercentage = '',
  optimizationSummary = '',
  originalServices = [],
  optimizedCostBreakdown = {},
  optimizedServices = [],
}) {
  const barsRef = useRef(null);
  const perService = optimizedCostBreakdown.per_service || [];

  // Compute max cost for bar scaling
  const allCosts = [
    ...originalServices.map(s => parseCost(s.estimated_monthly_cost)),
    ...perService.map(s => parseCost(s.cost)),
  ];
  const maxCost = Math.max(...allCosts, 500);

  const isDelta = costDelta?.startsWith('-') || costDelta?.startsWith('+');
  const isSaving = costDelta?.startsWith('-');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (barsRef.current) {
        barsRef.current.querySelectorAll('.cbar[data-pct]').forEach(bar => {
          bar.style.width = bar.dataset.pct + '%';
        });
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [optimizedCostBreakdown]);

  return (
    <div className="oc show" id="cost-comparison-panel">
      <div className="och">
        <div className="cdot" style={{ background: isSaving ? 'var(--cyan)' : 'var(--gold)' }}></div>
        <h4>Cost Comparison</h4>
        <span className="ocm">Original → Optimized</span>
      </div>
      <div className="cost-compare-body" ref={barsRef}>
        {/* Delta hero */}
        <div className="cost-delta-hero">
          <div className="cost-delta-row">
            <div className="cost-delta-card cost-delta-old">
              <div className="cost-delta-label">Original</div>
              <div className="cost-delta-value">{originalEstimate || '—'}</div>
            </div>
            <div className="cost-delta-arrow">→</div>
            <div className="cost-delta-card cost-delta-new">
              <div className="cost-delta-label">Optimized</div>
              <div className="cost-delta-value">{optimizedEstimate || optimizedCostBreakdown.monthly_estimate || '—'}</div>
            </div>
          </div>
          {isDelta && (
            <div className={`cost-delta-badge ${isSaving ? 'saving' : 'extra'}`}>
              {isSaving ? '📉' : '📈'} {costDelta}/month
              {savingsPercentage && ` (${savingsPercentage})`}
            </div>
          )}
        </div>

        {/* Summary */}
        {optimizationSummary && (
          <div className="cost-opt-summary">
            💡 {optimizationSummary}
          </div>
        )}

        {/* Service changes */}
        <div className="cost-services-section">
          <div className="cost-section-label">Service Changes</div>
          <div className="cost-service-changes">
            {optimizedServices.map((svc, i) => {
              const statusColors = {
                kept: { bg: 'rgba(0,240,180,.06)', border: 'rgba(0,240,180,.15)', color: 'var(--cyan)', icon: '✓' },
                added: { bg: 'rgba(61,127,255,.08)', border: 'rgba(61,127,255,.2)', color: '#80aaff', icon: '+' },
                removed: { bg: 'rgba(255,61,92,.06)', border: 'rgba(255,61,92,.15)', color: '#ff3d5c', icon: '×' },
                replaced: { bg: 'rgba(255,208,96,.06)', border: 'rgba(255,208,96,.15)', color: 'var(--gold)', icon: '↻' },
              };
              const sc = statusColors[svc.status] || statusColors.kept;
              return (
                <div key={i} className="cost-svc-change" style={{ borderLeftColor: sc.color }}>
                  <div className="cost-svc-change-header">
                    <span className="cost-svc-name">{svc.name}</span>
                    <span className="cost-svc-status" style={{ background: sc.bg, borderColor: sc.border, color: sc.color }}>
                      {sc.icon} {svc.status?.toUpperCase()}
                    </span>
                  </div>
                  <div className="cost-svc-reason">{svc.change_reason}</div>
                  {svc.estimated_monthly_cost && svc.status !== 'removed' && (
                    <div className="cost-svc-amount">💰 {svc.estimated_monthly_cost}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Optimized cost bars */}
        {perService.length > 0 && (
          <div className="cost-services-section">
            <div className="cost-section-label">Optimized Cost Breakdown</div>
            <div className="crows">
              {perService.map((s, i) => {
                const v = parseCost(s.cost);
                const pct = Math.max(4, Math.min((v / maxCost) * 100, 100));
                return (
                  <div key={i} className="crow">
                    <div className="cn" title={s.service}>{s.service}</div>
                    <div className="cbw">
                      <div
                        className="cbar"
                        style={{ width: '0%', background: BAR_COLORS_NEW[i % BAR_COLORS_NEW.length] }}
                        data-pct={pct}
                      ></div>
                    </div>
                    <div className="ca">{s.cost}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {optimizedCostBreakdown.cost_notes && (
          <div className="ctip">💡 {optimizedCostBreakdown.cost_notes}</div>
        )}
      </div>
    </div>
  );
}
