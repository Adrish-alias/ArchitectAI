import { parseCostNum } from '../utils/serviceHelpers';

export default function ComparisonMatrix({ tiersData }) {
  if (!tiersData || !tiersData.cost || !tiersData.balanced || !tiersData.performance) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading comparison...</div>;
  }

  const tiers = ['cost', 'balanced', 'performance'];
  const titles = { cost: 'Cost-Efficient', balanced: 'Balanced', performance: 'High-Performance' };
  const icons = { cost: '💰', balanced: '⚖️', performance: '🚀' };
  const colors = { cost: 'var(--cyan)', balanced: 'var(--blue)', performance: 'var(--magenta)' };

  const getRating = (tier, category) => {
    const data = tiersData[tier];
    if (!data) return 1;
    const svcs = data.aws_services?.map(s => s.name.toLowerCase()) || [];
    const hasECS = svcs.some(s => s.includes('ecs'));
    const hasCache = svcs.some(s => s.includes('elasticache'));
    const hasSQS = svcs.some(s => s.includes('sqs'));
    const hasOpenSearch = svcs.some(s => s.includes('opensearch'));
    const hasCloudFront = svcs.some(s => s.includes('cloudfront'));
    const hasWAF = svcs.some(s => s.includes('waf'));
    const hasCloudWatch = svcs.some(s => s.includes('cloudwatch'));

    let score = 3;

    switch(category) {
      case 'scalability':
        score = tier === 'cost' ? 2 : (tier === 'balanced' ? 4 : 5);
        if (hasECS) score = Math.max(score, 4);
        break;
      case 'latency':
        score = tier === 'cost' ? 2 : (tier === 'balanced' ? 3 : 5);
        if (hasCache) score = Math.max(score, 4);
        if (hasCloudFront) score = Math.min(score + 1, 5);
        break;
      case 'reliability':
        score = tier === 'cost' ? 2 : (tier === 'balanced' ? 3 : 5);
        if (hasSQS) score = Math.min(score + 1, 5);
        if (hasECS) score = Math.min(score + 1, 5);
        break;
      case 'security':
        score = tier === 'cost' ? 2 : (tier === 'balanced' ? 3 : 5);
        if (hasWAF) score = Math.min(score + 1, 5);
        break;
      case 'observability':
        score = tier === 'cost' ? 1 : (tier === 'balanced' ? 3 : 5);
        if (hasCloudWatch) score = Math.min(score + 1, 5);
        break;
      case 'complexity':
        score = 1;
        if (hasECS) score++;
        if (hasCache) score++;
        if (hasSQS) score++;
        if (hasOpenSearch) score += 2;
        if (hasWAF) score++;
        score = Math.min(score, 5);
        break;
    }
    return score;
  };

  const renderDots = (score, color) => {
    return (
      <div className="rating-dots">
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} className="rdot" style={{
            backgroundColor: n <= score ? color : 'rgba(255,255,255,0.1)',
            boxShadow: n <= score ? `0 0 8px ${color}` : 'none'
          }}></span>
        ))}
      </div>
    );
  };

  // Collect all unique services across tiers
  const allServices = new Set();
  tiers.forEach(t => {
    (tiersData[t]?.aws_services || []).forEach(s => allServices.add(s.name));
  });

  // Get cost midpoint for comparison
  const getCostMidpoint = (tier) => {
    const est = tiersData[tier]?.cost_breakdown?.monthly_estimate || '';
    return parseCostNum(est);
  };

  return (
    <div>
      {/* Main Comparison Matrix */}
      <div className="cmp-matrix-wrap" style={{ marginBottom: 28 }}>
        <table className="cmp-matrix">
          <thead>
            <tr>
              <th>Parameter</th>
              {tiers.map(t => (
                <th key={t} style={{ color: colors[t] }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    <span>{icons[t]}</span> {titles[t]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Monthly Cost</td>
              {tiers.map(t => (
                <td key={t} className="cval-cost">{tiersData[t]?.cost_breakdown?.monthly_estimate || '—'}</td>
              ))}
            </tr>
            <tr>
              <td>Annual Cost</td>
              {tiers.map(t => (
                <td key={t} style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '.78rem',
                  color: 'var(--muted2)',
                }}>{tiersData[t]?.cost_breakdown?.annual_estimate || '—'}</td>
              ))}
            </tr>
            <tr>
              <td>Cost per 1K Users</td>
              {tiers.map(t => (
                <td key={t} style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '.78rem',
                  color: 'var(--gold)',
                }}>{tiersData[t]?.cost_breakdown?.cost_per_user || '—'}</td>
              ))}
            </tr>
            <tr>
              <td>Service Count</td>
              {tiers.map(t => (
                <td key={t} style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem' }}>
                  {tiersData[t]?.aws_services?.length || 0}
                </td>
              ))}
            </tr>
            <tr>
              <td>Architecture Pattern</td>
              {tiers.map(t => (
                <td key={t} style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '.65rem',
                  color: colors[t], lineHeight: 1.5,
                }}>{tiersData[t]?.architecture_overview?.pattern || '—'}</td>
              ))}
            </tr>
            <tr>
              <td>Scalability</td>
              {tiers.map(t => (
                <td key={t}>{renderDots(getRating(t, 'scalability'), colors[t])}</td>
              ))}
            </tr>
            <tr>
              <td>Low Latency</td>
              {tiers.map(t => (
                <td key={t}>{renderDots(getRating(t, 'latency'), colors[t])}</td>
              ))}
            </tr>
            <tr>
              <td>Reliability</td>
              {tiers.map(t => (
                <td key={t}>{renderDots(getRating(t, 'reliability'), colors[t])}</td>
              ))}
            </tr>
            <tr>
              <td>Security</td>
              {tiers.map(t => (
                <td key={t}>{renderDots(getRating(t, 'security'), colors[t])}</td>
              ))}
            </tr>
            <tr>
              <td>Observability</td>
              {tiers.map(t => (
                <td key={t}>{renderDots(getRating(t, 'observability'), colors[t])}</td>
              ))}
            </tr>
            <tr>
              <td>Complexity</td>
              {tiers.map(t => (
                <td key={t}>{renderDots(getRating(t, 'complexity'), colors[t])}</td>
              ))}
            </tr>
            <tr>
              <td style={{ borderBottom: 'none' }}>Best For</td>
              <td style={{ borderBottom: 'none', color: 'var(--muted2)', fontSize: '.82rem', lineHeight: 1.5 }}>
                {tiersData.cost?.tier_description || 'MVPs, Startups, Hobby projects, Predictable low traffic'}
              </td>
              <td style={{ borderBottom: 'none', color: 'var(--muted2)', fontSize: '.82rem', lineHeight: 1.5 }}>
                {tiersData.balanced?.tier_description || 'Growing products, Standard web apps, SMBs'}
              </td>
              <td style={{ borderBottom: 'none', color: 'var(--muted2)', fontSize: '.82rem', lineHeight: 1.5 }}>
                {tiersData.performance?.tier_description || 'Enterprise apps, High-traffic platforms, Mission-critical systems'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Service Availability Matrix */}
      <div className="cmp-matrix-wrap">
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '.65rem',
          color: 'var(--cyan)', letterSpacing: '.12em', textTransform: 'uppercase',
          marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid var(--border)',
        }}>
          Service Availability Across Tiers
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '200px repeat(3, 1fr)', gap: 0 }}>
          {/* Header */}
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '.58rem',
            color: 'var(--muted)', padding: '8px 0', borderBottom: '1px solid var(--border)',
            letterSpacing: '.08em', textTransform: 'uppercase',
          }}>Service</div>
          {tiers.map(t => (
            <div key={t} style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '.58rem',
              color: colors[t], padding: '8px 0', borderBottom: '1px solid var(--border)',
              textAlign: 'center', letterSpacing: '.08em', textTransform: 'uppercase',
            }}>{titles[t]}</div>
          ))}

          {/* Service rows */}
          {[...allServices].sort().map((svcName, i) => (
            <>
              <div key={`name-${i}`} style={{
                fontSize: '.78rem', color: 'var(--muted2)', padding: '8px 0',
                borderBottom: '1px dotted rgba(255,255,255,.04)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {svcName}
              </div>
              {tiers.map(t => {
                const has = (tiersData[t]?.aws_services || []).some(s => s.name === svcName);
                return (
                  <div key={`${t}-${i}`} style={{
                    textAlign: 'center', padding: '8px 0',
                    borderBottom: '1px dotted rgba(255,255,255,.04)',
                  }}>
                    {has ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 22, height: 22, borderRadius: '50%',
                        background: `${colors[t] === 'var(--cyan)' ? 'rgba(0,240,180,.12)' : colors[t] === 'var(--blue)' ? 'rgba(61,127,255,.12)' : 'rgba(255,61,170,.12)'}`,
                        color: colors[t], fontSize: '.7rem', fontWeight: 700,
                      }}>✓</span>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,.15)', fontSize: '.7rem' }}>—</span>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
