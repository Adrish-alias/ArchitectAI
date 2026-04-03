import { Link } from 'react-router-dom';
import { getServiceIcon } from '../utils/serviceHelpers';

export default function TierCard({ tier, data, isLoading }) {
  const meta = {
    cost: { title: 'Cost-Efficient', icon: '💰', color: 'var(--cyan)', accent: 'rgba(0,240,180' },
    balanced: { title: 'Balanced', icon: '⚖️', color: 'var(--blue)', accent: 'rgba(61,127,255' },
    performance: { title: 'High-Performance', icon: '🚀', color: 'var(--magenta)', accent: 'rgba(255,61,170' },
  };
  const m = meta[tier] || meta.balanced;

  if (isLoading) {
    return (
      <div className="tier-card skeleton">
        <div className="tc-header">
           <div className="tc-title" style={{ color: 'var(--muted)' }}>{m.icon} {m.title}</div>
           <div className="shimmer-line short"></div>
        </div>
        <div className="tc-body">
           <div className="shimmer-line"></div>
           <div className="shimmer-line"></div>
           <div className="shimmer-line" style={{ width: '60%' }}></div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const cost = data.cost_breakdown?.monthly_estimate || '—';
  const services = data.aws_services?.length || 0;
  const strategy = data.architecture_overview?.strategy || data.scale_analysis || '';
  const pattern = data.architecture_overview?.pattern || '';
  const tierDesc = data.tier_description || '';
  const svcNames = (data.aws_services || []).slice(0, 4);

  return (
    <div className="tier-card" style={{
      borderColor: m.color,
      transform: 'translateY(0)',
      opacity: 1,
      animation: 'fu 0.5s ease both',
    }}>
      <div className="tc-header">
        <div>
          <div className="tc-title" style={{ color: m.color }}>{m.icon} {m.title}</div>
          {pattern && (
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '.55rem',
              color: 'var(--muted2)', marginTop: 2, letterSpacing: '.03em',
            }}>
              {pattern}
            </div>
          )}
        </div>
        <div className="tc-cost">{cost}</div>
      </div>
      <div className="tc-body">
        <div className="tc-stat">
           <span style={{ color: m.color }}>{services}</span> AWS Services
        </div>
        {tierDesc && (
          <div style={{
            fontSize: '.72rem', color: m.color, opacity: .7,
            marginBottom: 6, lineHeight: 1.4,
            fontFamily: "'JetBrains Mono', monospace", fontSize: '.6rem',
          }}>
            {tierDesc.substring(0, 90)}{tierDesc.length > 90 ? '...' : ''}
          </div>
        )}
        <div className="tc-desc">{strategy.substring(0, 100)}{strategy.length > 100 ? '...' : ''}</div>
        {/* Mini service icons */}
        <div style={{
          display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap',
        }}>
          {svcNames.map((svc, i) => (
            <span key={i} style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '.52rem',
              background: `${m.accent},.06)`, border: `1px solid ${m.accent},.12)`,
              padding: '2px 7px', borderRadius: 4, color: 'var(--muted2)',
              display: 'inline-flex', alignItems: 'center', gap: 3,
            }}>
              <span style={{ fontSize: '.65rem' }}>{getServiceIcon(svc.name)}</span>
              {svc.name.length > 18 ? svc.name.substring(0, 16) + '..' : svc.name}
            </span>
          ))}
          {(data.aws_services?.length || 0) > 4 && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '.52rem',
              color: 'var(--muted)', padding: '2px 5px',
            }}>
              +{data.aws_services.length - 4} more
            </span>
          )}
        </div>
      </div>
      <Link to={`/result?tier=${tier}`} className="tc-btn" style={{ color: m.color, borderColor: `rgba(0,0,0,0.2)` }}>
        View Details →
      </Link>
    </div>
  );
}
