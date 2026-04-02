import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import ArchitectureDiagram from '../components/ArchitectureDiagram';
import { getServiceIcon, parseCostNum } from '../utils/serviceHelpers';
import ComparisonMatrix from '../components/ComparisonMatrix';

const COST_COLORS = [
  'var(--cyan)', '#80aaff', 'var(--magenta)', 'var(--gold)',
  '#7ddd9a', '#b0b0ff', '#ffaa30', '#ff80cc',
];

const TIER_META = {
  cost: { icon: '💰', label: 'Cost-Efficient', color: 'var(--cyan)', accent: 'rgba(0,240,180', tagline: 'Minimal viable architecture at the lowest cost' },
  balanced: { icon: '⚖️', label: 'Balanced', color: 'var(--blue)', accent: 'rgba(61,127,255', tagline: 'Right-sized for production workloads' },
  performance: { icon: '🚀', label: 'High-Performance', color: 'var(--magenta)', accent: 'rgba(255,61,170', tagline: 'Enterprise-grade with full redundancy' },
};

export default function ResultPage() {
  const [tiersData, setTiersData] = useState(null);
  const [activeTier, setActiveTier] = useState('balanced');
  const [activeTab, setActiveTab] = useState('diagram');
  const [rawVisible, setRawVisible] = useState(false);
  const [diagramFullscreen, setDiagramFullscreen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tier')) setActiveTier(params.get('tier'));

    const raw = localStorage.getItem('architectureDataTiered');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.tiers) setTiersData(parsed.tiers);
    } catch (e) { /* invalid data */ }
  }, []);

  // Animate cost bars
  useEffect(() => {
    if (!tiersData || activeTier === 'compare') return;
    const timer = setTimeout(() => {
      document.querySelectorAll('.cost-bar-fill[data-pct]').forEach(bar => {
        bar.style.width = bar.dataset.pct + '%';
      });
    }, 700);
    return () => clearTimeout(timer);
  }, [tiersData, activeTier, activeTab]);

  const toggleRaw = () => setRawVisible(prev => !prev);

  const exportJSON = () => {
    if (!tiersData) { alert('No data to export.'); return; }
    const blob = new Blob([JSON.stringify(tiersData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'architectures.json';
    a.click();
  };

  if (!tiersData) {
    return (
      <div className="page">
        <nav>
          <Link to="/" className="logo" style={{ textDecoration: 'none' }}>ArchitectAI</Link>
          <div className="nav-mid"><span>Architecture Result</span></div>
          <div className="nav-right">
            <Link to="/" className="nbtn primary">← Generate Architecture</Link>
          </div>
        </nav>
        <div className="no-data">
          <div className="no-data-icon">📭</div>
          <div className="no-data-title">NO ARCHITECTURE LOADED</div>
          <div className="no-data-sub">
            Go back to the generator, describe your project, and click Generate. Results will appear here automatically.
          </div>
          <Link to="/" className="go-back-btn">← Generate Architecture</Link>
        </div>
      </div>
    );
  }

  const isCompare = activeTier === 'compare';
  const data = isCompare ? null : tiersData[activeTier];
  const tm = TIER_META[activeTier] || TIER_META.balanced;

  const svcs = data?.aws_services || [];
  const cb = data?.cost_breakdown || {};
  const perSvc = cb.per_service || [];
  const ov = data?.architecture_overview || {};
  const steps = data?.implementation_steps || [];
  const mermaidSrc = (data?.mermaid || '').trim();
  const maxCostNum = perSvc.reduce((m, s) => Math.max(m, parseCostNum(s.cost)), 500);
  const scaleMatch = (data?.scale_analysis || '').match(/free_tier|growth|scale|large_scale|distributed/i);

  const flowDefs = [
    { key: 'read_flow', label: 'Read Flow', cls: 'read' },
    { key: 'write_flow', label: 'Write Flow', cls: 'write' },
    { key: 'realtime_flow', label: 'Realtime Flow', cls: 'realtime' },
    { key: 'async_flow', label: 'Async Flow', cls: 'async' },
  ];

  const activeFlows = flowDefs.filter(f => ov[f.key] && !ov[f.key].startsWith('N/A'));

  // Fullscreen diagram overlay
  if (diagramFullscreen && !isCompare) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 24px', borderBottom: '1px solid var(--border)',
          background: 'rgba(3,5,13,.85)', backdropFilter: 'blur(16px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.2rem' }}>{tm.icon}</span>
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem',
              letterSpacing: '.06em', color: tm.color,
            }}>{tm.label} Architecture</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '.6rem',
              color: 'var(--muted)', background: 'rgba(255,255,255,.03)',
              border: '1px solid var(--border)', padding: '3px 10px', borderRadius: 4,
            }}>FULLSCREEN</span>
          </div>
          <button
            onClick={() => setDiagramFullscreen(false)}
            style={{
              background: 'rgba(255,61,170,.08)', border: '1px solid rgba(255,61,170,.2)',
              color: 'var(--magenta)', padding: '8px 18px', borderRadius: 7,
              fontFamily: "'JetBrains Mono', monospace", fontSize: '.7rem',
              cursor: 'none', transition: 'all .2s',
            }}
          >✕ Exit Fullscreen</button>
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <ArchitectureDiagram mermaidString={mermaidSrc} />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Nav */}
      <nav>
        <Link to="/" className="logo" style={{ textDecoration: 'none' }}>ArchitectAI</Link>
        <div className="nav-mid">
          <div className="tier-tabs">
             <button className={`tier-tab ${activeTier === 'compare' ? 'active' : ''}`} onClick={() => setActiveTier('compare')}>📊 Compare</button>
             <button className={`tier-tab ${activeTier === 'cost' ? 'active tcost' : ''}`} onClick={() => setActiveTier('cost')}>💰 Cost-Efficient</button>
             <button className={`tier-tab ${activeTier === 'balanced' ? 'active tbal' : ''}`} onClick={() => setActiveTier('balanced')}>⚖️ Balanced</button>
             <button className={`tier-tab ${activeTier === 'performance' ? 'active tperf' : ''}`} onClick={() => setActiveTier('performance')}>🚀 High-Performance</button>
          </div>
        </div>
        <div className="nav-right">
          {!isCompare && <button className="nbtn" onClick={toggleRaw}>⟨/⟩ Raw</button>}
          <button className="nbtn" onClick={exportJSON}>↓ Export</button>
          <Link to="/" className="nbtn primary">← Back</Link>
        </div>
      </nav>

      {/* Compare View */}
      {isCompare ? (
         <div className="compare-layout" style={{ maxWidth: 1200, margin: '40px auto', padding: '0 24px' }}>
            <h2 className="sec-title" style={{ textAlign: 'center', marginBottom: 40, letterSpacing: '0.06em' }}>ARCHITECTURE COMPARISON</h2>
            <ComparisonMatrix tiersData={tiersData} />
         </div>
      ) : (
      <div className="layout">
        {/* LEFT SIDEBAR — Services & Implementation */}
        <div className="sidebar-left">
          <div style={{ paddingTop: 20 }}>
            {/* Tier Badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: `${tm.accent},.06)`, border: `1px solid ${tm.accent},.15)`,
              borderRadius: 8, padding: '10px 14px', marginBottom: 18,
            }}>
              <span style={{ fontSize: '1.2rem' }}>{tm.icon}</span>
              <div>
                <div style={{
                  fontFamily: "'Bebas Neue', sans-serif", fontSize: '.9rem',
                  letterSpacing: '.04em', color: tm.color,
                }}>{tm.label}</div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '.55rem',
                  color: 'var(--muted2)', letterSpacing: '.04em',
                }}>{data?.tier_description || tm.tagline}</div>
              </div>
            </div>

            {/* Architecture Pattern */}
            {ov.pattern && (
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: '.6rem',
                color: tm.color, letterSpacing: '.08em', textTransform: 'uppercase',
                marginBottom: 8, padding: '5px 10px',
                background: `${tm.accent},.04)`, border: `1px solid ${tm.accent},.1)`,
                borderRadius: 6,
              }}>
                ◉ {ov.pattern}
              </div>
            )}

            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '.6rem',
              color: 'var(--cyan)', letterSpacing: '.14em', textTransform: 'uppercase',
              marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border)',
            }}>
              AWS Services ({svcs.length})
            </div>

            <div>
              {svcs.map((svc, i) => (
                <div key={i} className="svc-item">
                  <div className="svc-head">
                    <span className="svc-icon">{getServiceIcon(svc.name)}</span>
                    <span className="svc-name">{svc.name}</span>
                  </div>
                  <div className="svc-role">{svc.role || ''}</div>
                  <div className="svc-just">{svc.justification || ''}</div>
                  {svc.configuration && (
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: '.58rem',
                      color: 'var(--muted2)', paddingLeft: 28, marginTop: 3,
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                      ⚙️ {svc.configuration}
                    </div>
                  )}
                  {svc.data_flow && (
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: '.56rem',
                      color: 'rgba(0,240,180,.45)', paddingLeft: 28, marginTop: 3,
                      borderLeft: '2px solid rgba(0,240,180,.15)', paddingTop: 2, paddingBottom: 2,
                      marginLeft: 28,
                    }}>
                      {svc.data_flow}
                    </div>
                  )}
                  {svc.estimated_monthly_cost && (
                    <div className="svc-cost-tag">💰 {svc.estimated_monthly_cost}</div>
                  )}
                </div>
              ))}
            </div>

            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '.6rem',
              color: '#80aaff', letterSpacing: '.14em', textTransform: 'uppercase',
              margin: '20px 0 14px', paddingTop: 16, borderTop: '1px solid var(--border)',
            }}>
              Implementation Plan
            </div>
            <div>
              {steps.map((s, i) => (
                <div key={i} className="impl-item">
                  <div className="impl-item-head">
                    <div className="impl-num">{i + 1}</div>
                    <div className="impl-phase-name">
                      {(s.phase || '').replace(/Phase \d+ — /, '')}
                    </div>
                    <div className="impl-dur-tag">{s.duration || ''}</div>
                  </div>
                  <ul className="impl-tasks">
                    {(s.tasks || []).map((task, j) => (
                      <li key={j}>{task}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER */}
        <div className="main-center">
          {/* Stats Row */}
          <div className="stat-row">
            <div className="stat-pill stat-cyan">
              <div className="stat-pill-val">{svcs.length}</div>
              <div className="stat-pill-key">Services</div>
            </div>
            <div className="stat-pill stat-gold">
              <div className="stat-pill-val">{cb.monthly_estimate || '—'}</div>
              <div className="stat-pill-key">Monthly Est.</div>
            </div>
            <div className="stat-pill stat-blue">
              <div className="stat-pill-val">
                {scaleMatch ? scaleMatch[0].replace('_', ' ').toUpperCase() : '—'}
              </div>
              <div className="stat-pill-key">Scale Tier</div>
            </div>
            <div className="stat-pill stat-mag">
              <div className="stat-pill-val">{steps.length}</div>
              <div className="stat-pill-key">Impl Phases</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button className={`tab ${activeTab === 'diagram' ? 'active' : ''}`} onClick={() => setActiveTab('diagram')}>
              Architecture Diagram
            </button>
            <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              System Overview
            </button>
            <button className={`tab ${activeTab === 'costs' ? 'active' : ''}`} onClick={() => setActiveTab('costs')}>
              Cost Analysis
            </button>
          </div>

          {/* Diagram Tab */}
          <div className={`tab-panel ${activeTab === 'diagram' ? 'active' : ''}`}>
            <div className="section-block" style={{ marginTop: 20 }}>
              <div className="diagram-wrap">
                <div className="diagram-toolbar">
                  <div className="dtag">
                    <span className="dot"></span>React Flow · Live Render · {tm.label}
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <button
                      className="dact-btn"
                      onClick={() => setDiagramFullscreen(true)}
                      style={{ cursor: 'none' }}
                    >
                      ⛶ Fullscreen
                    </button>
                  </div>
                </div>
                {!rawVisible && (
                  <div key={activeTier} id="diagram-render" style={{ height: 600, minHeight: 600 }}>
                    <ArchitectureDiagram mermaidString={mermaidSrc} />
                  </div>
                )}
                {rawVisible && (
                  <pre id="raw-mermaid" style={{ display: 'block' }}>
                    {mermaidSrc}
                  </pre>
                )}
              </div>
            </div>
          </div>

          {/* Overview Tab */}
          <div className={`tab-panel ${activeTab === 'overview' ? 'active' : ''}`}>
            <div className="section-block" style={{ marginTop: 20 }}>
              <div className="sec-label">Architecture Strategy</div>
              <div className="overview-card">
                <div className="overview-strategy">{ov.strategy || data?.scale_analysis || '—'}</div>
                {ov.key_tradeoffs && (
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '.7rem',
                    color: 'var(--gold)', background: 'rgba(255,208,96,.04)',
                    border: '1px solid rgba(255,208,96,.1)', borderRadius: 8,
                    padding: '10px 14px', marginBottom: 16, lineHeight: 1.6,
                    display: 'flex', alignItems: 'flex-start', gap: 6,
                  }}>
                    <span>⚠️</span> <span><strong>Tradeoffs:</strong> {ov.key_tradeoffs}</span>
                  </div>
                )}
                <div className="flows-grid">
                  {activeFlows.length > 0 ? activeFlows.map(f => {
                    const isAlone = activeFlows.length === 1;
                    return (
                      <div key={f.key} className={`flow-item ${f.cls}${isAlone ? ' full' : ''}`}>
                        <div className="flow-label">{f.label}</div>
                        <div className="flow-text">{ov[f.key]}</div>
                      </div>
                    );
                  }) : (
                    <div className="flow-item full read">
                      <div className="flow-label">Read Flow</div>
                      <div className="flow-text">{ov.read_flow || '—'}</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="sec-label" style={{ marginTop: 24 }}>Scale Analysis</div>
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 18, fontSize: '.84rem',
                color: 'var(--muted2)', lineHeight: 1.75,
              }}>
                {data?.scale_analysis || '—'}
              </div>
            </div>
          </div>

          {/* Cost Analysis Tab */}
          <div className={`tab-panel ${activeTab === 'costs' ? 'active' : ''}`}>
            <div className="section-block" style={{ marginTop: 20 }}>
              {/* Cost Overview Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                <div style={{
                  background: 'rgba(0,240,180,.04)', border: '1px solid rgba(0,240,180,.12)',
                  borderRadius: 12, padding: 18, textAlign: 'center',
                }}>
                  <div style={{
                    fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem',
                    background: 'linear-gradient(110deg, var(--cyan), var(--blue))',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1,
                  }}>
                    {cb.monthly_estimate || '—'}
                  </div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '.55rem',
                    color: 'var(--muted)', letterSpacing: '.05em', marginTop: 4,
                  }}>MONTHLY ESTIMATE</div>
                </div>
                <div style={{
                  background: 'rgba(61,127,255,.04)', border: '1px solid rgba(61,127,255,.12)',
                  borderRadius: 12, padding: 18, textAlign: 'center',
                }}>
                  <div style={{
                    fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem',
                    color: '#80aaff', lineHeight: 1,
                  }}>
                    {cb.annual_estimate || '—'}
                  </div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '.55rem',
                    color: 'var(--muted)', letterSpacing: '.05em', marginTop: 4,
                  }}>ANNUAL ESTIMATE</div>
                </div>
                <div style={{
                  background: 'rgba(255,208,96,.04)', border: '1px solid rgba(255,208,96,.12)',
                  borderRadius: 12, padding: 18, textAlign: 'center',
                }}>
                  <div style={{
                    fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem',
                    color: 'var(--gold)', lineHeight: 1,
                  }}>
                    {cb.cost_per_user || '—'}
                  </div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '.55rem',
                    color: 'var(--muted)', letterSpacing: '.05em', marginTop: 4,
                  }}>PER 1K USERS/MO</div>
                </div>
              </div>

              {/* Free Tier Savings */}
              {cb.free_tier_savings && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(0,240,180,.04)', border: '1px solid rgba(0,240,180,.1)',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 18,
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '.68rem',
                  color: 'var(--cyan)',
                }}>
                  <span>🎁</span> Free Tier Savings: {cb.free_tier_savings}
                </div>
              )}

              {/* Per-Service Cost Breakdown */}
              <div className="sec-label">Service Cost Breakdown</div>
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 18, marginBottom: 18,
              }}>
                {perSvc.map((s, i) => {
                  const v = parseCostNum(s.cost);
                  const pct = Math.max(4, Math.min((v / maxCostNum) * 100, 100));
                  return (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '160px 1fr 80px 50px',
                      alignItems: 'center', gap: 10, padding: '8px 0',
                      borderBottom: i < perSvc.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
                    }}>
                      <div style={{
                        fontSize: '.78rem', color: 'var(--muted2)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }} title={s.service}>
                        <span style={{ marginRight: 6 }}>{getServiceIcon(s.service)}</span>
                        {s.service}
                      </div>
                      <div className="cost-bar-wrap" style={{ width: '100%', height: 6, borderRadius: 3 }}>
                        <div
                          className="cost-bar-fill"
                          style={{ width: '0%', background: COST_COLORS[i % COST_COLORS.length], height: 6, borderRadius: 3 }}
                          data-pct={pct}
                        ></div>
                      </div>
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: '.68rem',
                        color: 'var(--text)', textAlign: 'right',
                      }}>{s.cost}</div>
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: '.58rem',
                        color: COST_COLORS[i % COST_COLORS.length], textAlign: 'right',
                        opacity: .8,
                      }}>{s.percentage || ''}</div>
                    </div>
                  );
                })}
              </div>

              {/* Cost Notes */}
              {cb.cost_notes && (
                <div className="cost-note" style={{ marginBottom: 14 }}>💡 {cb.cost_notes}</div>
              )}

              {/* Optimization Tips */}
              {cb.cost_optimization_tips && cb.cost_optimization_tips.length > 0 && (
                <div>
                  <div className="sec-label" style={{ marginTop: 12 }}>Optimization Tips</div>
                  <div style={{
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: 14,
                  }}>
                    {cb.cost_optimization_tips.map((tip, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                        padding: '8px 0',
                        borderBottom: i < cb.cost_optimization_tips.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
                      }}>
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: '.6rem',
                          color: 'var(--cyan)', background: 'rgba(0,240,180,.08)',
                          border: '1px solid rgba(0,240,180,.15)', padding: '1px 6px',
                          borderRadius: 3, flexShrink: 0, marginTop: 2,
                        }}>{i + 1}</span>
                        <span style={{
                          fontSize: '.8rem', color: 'var(--muted2)', lineHeight: 1.6,
                        }}>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR — Quick Cost Summary */}
        <div className="sidebar-right">
          <div className="sr-section">
            <div className="sr-label">Cost Estimate</div>
            <div>
              <div className="cost-total">{cb.monthly_estimate || '—'}</div>
              <div className="cost-sub">estimated / month</div>
              {perSvc.slice(0, 6).map((s, i) => {
                const v = parseCostNum(s.cost);
                const pct = Math.max(4, Math.min((v / maxCostNum) * 100, 100));
                return (
                  <div key={i} className="cost-row">
                    <div className="cost-name" title={s.service}>{s.service}</div>
                    <div className="cost-bar-wrap">
                      <div
                        className="cost-bar-fill"
                        style={{ width: '0%', background: COST_COLORS[i % COST_COLORS.length] }}
                        data-pct={pct}
                      ></div>
                    </div>
                    <div className="cost-val">{s.cost}</div>
                  </div>
                );
              })}
              {perSvc.length > 6 && (
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '.58rem',
                  color: 'var(--muted)', marginTop: 8, textAlign: 'center',
                }}>
                  +{perSvc.length - 6} more — see Cost Analysis tab
                </div>
              )}
              {cb.cost_notes && (
                <div className="cost-note">💡 {cb.cost_notes}</div>
              )}
            </div>
          </div>

          {/* Annual / Per-User Quick Stats */}
          <div className="sr-section">
            <div className="sr-label">Quick Stats</div>
            {cb.annual_estimate && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 10,
              }}>
                <span style={{ fontSize: '.75rem', color: 'var(--muted2)' }}>Annual</span>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '.7rem', color: 'var(--text)',
                }}>{cb.annual_estimate}</span>
              </div>
            )}
            {cb.cost_per_user && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 10,
              }}>
                <span style={{ fontSize: '.75rem', color: 'var(--muted2)' }}>Per 1K Users</span>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '.7rem', color: 'var(--text)',
                }}>{cb.cost_per_user}</span>
              </div>
            )}
            {cb.free_tier_savings && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: '.75rem', color: 'var(--muted2)' }}>Free Tier</span>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '.7rem', color: 'var(--cyan)',
                }}>{cb.free_tier_savings}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
