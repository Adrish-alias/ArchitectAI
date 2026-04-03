import { useState, useEffect, useRef } from 'react';
import AnalyserForm from '../components/AnalyserForm';
import IssuesPanel from '../components/IssuesPanel';
import CostComparisonPanel from '../components/CostComparisonPanel';
import ArchitectureDiagram from '../components/ArchitectureDiagram';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function AnalysePage() {
  const [state, setState] = useState('empty'); // empty | loading | error | result
  const [resultData, setResultData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [panelsVisible, setPanelsVisible] = useState([false, false, false, false, false]);
  const [activeTab, setActiveTab] = useState('issues');
  const sectionRef = useRef(null);
  const initializedRef = useRef(false);

  // Restore from localStorage on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const raw = localStorage.getItem('analysisData');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        setResultData(data);
        setState('result');
        setPanelsVisible([true, true, true, true, true]);
      } catch (e) {
        // invalid
      }
    }
  }, []);

  // Scroll reveal
  useEffect(() => {
    const els = sectionRef.current?.querySelectorAll('.rv');
    if (!els) return;
    const observers = [];
    els.forEach((el) => {
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) el.classList.add('on'); },
        { threshold: 0.08 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const handleResult = (data) => {
    setResultData(data);
    setState('result');
    setActiveTab('issues');
    [0, 1, 2, 3, 4].forEach((i) => {
      setTimeout(() => {
        setPanelsVisible(prev => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, 100 + i * 180);
    });
  };

  const handleLoading = () => {
    setState('loading');
    setPanelsVisible([false, false, false, false, false]);
  };

  const handleError = (msg) => {
    setState('error');
    setErrorMsg(msg);
  };

  const handleReset = () => {
    setState('empty');
    setResultData(null);
    setErrorMsg('');
    setPanelsVisible([false, false, false, false, false]);
    localStorage.removeItem('analysisData');
  };

  const { formPanel, loadingPanel, handleReset: formReset } = AnalyserForm({
    onResult: handleResult,
    onLoading: handleLoading,
    onError: handleError,
    onReset: handleReset,
  });

  // Extract highlighted nodes from issues for old architecture
  const highlightedNodes = (resultData?.issues || [])
    .filter(i => i.node_id)
    .map(i => ({
      nodeId: i.node_id,
      type: i.type,
      severity: i.severity,
    }));

  const originalMermaid = (resultData?.original_mermaid || '').trim();
  const optimizedMermaid = (resultData?.mermaid || '').trim();

  return (
    <>
      <Navbar />

      {/* Hero mini-header */}
      <section className="analyse-hero" id="analyser">
        <div className="hgrid"></div>
        <div className="analyse-hero-glow"></div>
        <div className="htag analyse-htag">
          <span className="dot analyse-dot-pulse"></span>Architecture Audit · AI-Powered Analysis
        </div>
        <h1 className="analyse-hero-title">
          <span className="d">ANALYSE</span><br />
          <span className="analyse-gradient">ARCHITECTURE</span>
        </h1>
        <p className="hero-sub">
          Paste your existing architecture diagram. AI will identify issues, anti-patterns, and generate an optimized alternative.
        </p>
      </section>

      <section className="gen-sec analyse-sec" id="analyse-generator" ref={sectionRef}>
        <div className="sl rv">// 01 · Architecture Analyser</div>
        <h2 className="st rv" style={{ transitionDelay: '.1s' }}>
          AUDIT YOUR<br /><span className="analyse-accent">ARCHITECTURE</span>
        </h2>
        <p className="ss rv" style={{ transitionDelay: '.2s' }}>
          Paste your Mermaid diagram and describe your system. AI will detect issues, highlight inefficiencies, and propose an optimized design.
        </p>

        <div className="gen-grid rv" style={{ transitionDelay: '.3s' }}>
          {/* LEFT: FORM */}
          {formPanel}

          {/* RIGHT: OUTPUT */}
          <div className="op">
            {/* Empty State */}
            {state === 'empty' && (
              <div className="empty-state analyse-empty">
                <div className="empty-icon">🔬</div>
                <div className="empty-title">READY TO ANALYSE</div>
                <div className="empty-sub">
                  Paste your Mermaid architecture diagram and describe your system. The AI will parse the diagram, identify issues, and generate an optimized architecture.
                </div>
                <div className="empty-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}

            {/* Loading */}
            {state === 'loading' && loadingPanel}

            {/* Error */}
            {state === 'error' && (
              <div className="oc show">
                <div className="och">
                  <div className="cdot dm2"></div>
                  <h4>Analysis Failed</h4>
                  <span className="ocm">Error</span>
                </div>
                <div className="econtent">
                  <div className="emsg">{errorMsg || 'Something went wrong. Please try again.'}</div>
                  <button className="retry-btn" onClick={() => { formReset(); handleReset(); }}>
                    🔄 Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Results */}
            {state === 'result' && resultData && (
              <>
                {/* Tab Bar */}
                <div style={{
                  opacity: panelsVisible[0] ? 1 : 0,
                  transform: panelsVisible[0] ? 'translateY(0)' : 'translateY(18px)',
                  transition: 'opacity .5s, transform .5s',
                }}>
                  <div className="analyse-tabs">
                    <button
                      className={`analyse-tab ${activeTab === 'issues' ? 'active' : ''}`}
                      onClick={() => setActiveTab('issues')}
                    >
                      <span className="analyse-tab-icon">⚠️</span>
                      Issues
                      <span className="analyse-tab-count">{(resultData.issues || []).length}</span>
                    </button>
                    <button
                      className={`analyse-tab ${activeTab === 'old' ? 'active' : ''}`}
                      onClick={() => setActiveTab('old')}
                    >
                      <span className="analyse-tab-icon">📐</span>
                      Original Arch
                    </button>
                    <button
                      className={`analyse-tab ${activeTab === 'new' ? 'active' : ''}`}
                      onClick={() => setActiveTab('new')}
                    >
                      <span className="analyse-tab-icon">✨</span>
                      Optimized Arch
                    </button>
                    <button
                      className={`analyse-tab ${activeTab === 'cost' ? 'active' : ''}`}
                      onClick={() => setActiveTab('cost')}
                    >
                      <span className="analyse-tab-icon">💰</span>
                      Cost Comparison
                    </button>
                  </div>
                </div>

                {/* Issues Tab */}
                {activeTab === 'issues' && (
                  <div style={{
                    opacity: panelsVisible[1] ? 1 : 0,
                    transform: panelsVisible[1] ? 'translateY(0)' : 'translateY(18px)',
                    transition: 'opacity .5s, transform .5s',
                  }}>
                    <IssuesPanel issues={resultData.issues} />
                  </div>
                )}

                {/* Old Architecture Tab */}
                {activeTab === 'old' && (
                  <div style={{
                    opacity: panelsVisible[2] ? 1 : 0,
                    transform: panelsVisible[2] ? 'translateY(0)' : 'translateY(18px)',
                    transition: 'opacity .5s, transform .5s',
                  }}>
                    <div className="oc show">
                      <div className="och">
                        <div className="cdot dm2"></div>
                        <h4>Original Architecture</h4>
                        <span className="ocm">Issues Highlighted</span>
                      </div>
                      <div className="db2">
                        <div className="analyse-diagram-legend">
                          <span className="legend-item legend-unnecessary">
                            <span className="legend-dot"></span>Unnecessary
                          </span>
                          <span className="legend-item legend-missing">
                            <span className="legend-dot"></span>Missing
                          </span>
                          <span className="legend-item legend-antipattern">
                            <span className="legend-dot"></span>Anti-pattern
                          </span>
                          <span className="legend-item legend-cost">
                            <span className="legend-dot"></span>Cost Issue
                          </span>
                        </div>
                        <div style={{
                          background: 'rgba(0,0,0,.45)',
                          border: '1px solid rgba(255,61,92,.12)',
                          borderRadius: 10,
                          padding: 0,
                          minHeight: 380,
                          overflow: 'hidden',
                        }}>
                          <ArchitectureDiagram
                            mermaidString={originalMermaid}
                            compact
                            highlightedNodes={highlightedNodes}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* New Architecture Tab */}
                {activeTab === 'new' && (
                  <div style={{
                    opacity: panelsVisible[3] ? 1 : 0,
                    transform: panelsVisible[3] ? 'translateY(0)' : 'translateY(18px)',
                    transition: 'opacity .5s, transform .5s',
                  }}>
                    <div className="oc show">
                      <div className="och">
                        <div className="cdot dc3"></div>
                        <h4>Optimized Architecture</h4>
                        <span className="ocm">AI Recommended</span>
                      </div>
                      <div className="db2">
                        {resultData.optimization_summary && (
                          <div className="optimized-summary">
                            ✨ {resultData.optimization_summary}
                          </div>
                        )}
                        <div style={{
                          background: 'rgba(0,0,0,.45)',
                          border: '1px solid rgba(0,240,180,.12)',
                          borderRadius: 10,
                          padding: 0,
                          minHeight: 380,
                          overflow: 'hidden',
                        }}>
                          <ArchitectureDiagram
                            mermaidString={optimizedMermaid}
                            compact
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cost Comparison Tab */}
                {activeTab === 'cost' && (
                  <div style={{
                    opacity: panelsVisible[4] ? 1 : 0,
                    transform: panelsVisible[4] ? 'translateY(0)' : 'translateY(18px)',
                    transition: 'opacity .5s, transform .5s',
                  }}>
                    <CostComparisonPanel
                      originalEstimate={resultData.original_cost_estimate}
                      optimizedEstimate={resultData.optimized_cost_estimate}
                      costDelta={resultData.cost_delta}
                      savingsPercentage={resultData.savings_percentage}
                      optimizationSummary={resultData.optimization_summary}
                      optimizedServices={resultData.optimized_services || []}
                      optimizedCostBreakdown={resultData.optimized_cost_breakdown || {}}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
