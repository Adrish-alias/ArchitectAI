import { useEffect, useRef } from 'react';

const BAR_COLORS = [
  'linear-gradient(90deg,var(--cyan),#00b890)',
  'linear-gradient(90deg,var(--blue),#6090ff)',
  'linear-gradient(90deg,var(--magenta),#ff70cc)',
  'linear-gradient(90deg,var(--gold),#ffaa30)',
  'linear-gradient(90deg,#7ddd9a,#40cc70)',
  'linear-gradient(90deg,#9ec4ff,var(--blue))',
  'linear-gradient(90deg,var(--cyan),var(--blue))',
  'linear-gradient(90deg,var(--gold),var(--magenta))',
];

export default function CostPanel({ costBreakdown = {} }) {
  const barsRef = useRef(null);

  const perService = costBreakdown.per_service || [];
  const maxCost = perService.reduce((m, s) => {
    const v = parseInt((s.cost || '0').replace(/[^0-9]/g, ''));
    return Math.max(m, v);
  }, 1000);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (barsRef.current) {
        barsRef.current.querySelectorAll('.cbar[data-pct]').forEach(bar => {
          bar.style.width = bar.dataset.pct + '%';
        });
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [costBreakdown]);

  return (
    <div className="oc show" id="oc3">
      <div className="och">
        <div className="cdot db3"></div>
        <h4>Cost Analysis</h4>
        <span className="ocm">Monthly Estimate</span>
      </div>
      <div className="cb2" ref={barsRef}>
        <div className="cbig">{costBreakdown.monthly_estimate || '—'}</div>
        <div className="csub">// estimated monthly infrastructure cost</div>
        <div className="crows">
          {perService.map((s, i) => {
            const v = parseInt((s.cost || '0').replace(/[^0-9]/g, ''));
            const pct = Math.max(4, Math.min((v / maxCost) * 100, 100));
            return (
              <div key={i} className="crow">
                <div className="cn" title={s.service}>{s.service}</div>
                <div className="cbw">
                  <div
                    className="cbar"
                    style={{ width: '0%', background: BAR_COLORS[i % BAR_COLORS.length] }}
                    data-pct={pct}
                  ></div>
                </div>
                <div className="ca">{s.cost}</div>
              </div>
            );
          })}
        </div>
        {costBreakdown.cost_notes && (
          <div className="ctip">💡 {costBreakdown.cost_notes}</div>
        )}
      </div>
    </div>
  );
}
