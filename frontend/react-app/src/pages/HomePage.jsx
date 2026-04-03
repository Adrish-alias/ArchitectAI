import { useState, useEffect, useRef } from 'react';
import HeroSection from '../components/HeroSection';
import GeneratorForm from '../components/GeneratorForm';
import OverviewPanel from '../components/OverviewPanel';
import ServicesPanel from '../components/ServicesPanel';
import DiagramPanel from '../components/DiagramPanel';
import CostPanel from '../components/CostPanel';
import ImplStepsPanel from '../components/ImplStepsPanel';
import TierCard from '../components/TierCard';
import HowItWorks from '../components/HowItWorks';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

export default function HomePage() {
  const [state, setState] = useState('empty'); // empty | loading | error | result
  const [resultData, setResultData] = useState({});
  const [errorMsg, setErrorMsg] = useState('');
  const sectionRef = useRef(null);
  const initializedRef = useRef(false);

  // Restore result data from localStorage on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const raw = localStorage.getItem('architectureDataTiered');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.tiers) {
          setResultData(parsed.tiers);
          setState('result');
        }
      } catch (e) {
        // invalid data, stay in empty state
      }
    }
  }, []);

  // Scroll reveal for the generator section
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

  // Scroll reveal for how-it-works
  useEffect(() => {
    const howSection = document.querySelector('.how-sec');
    if (!howSection) return;
    const els = howSection.querySelectorAll('.rv');
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
  };

  const handleTierLoad = (tier, data) => {
    setResultData(prev => ({ ...prev, [tier]: data }));
  };

  const handleLoading = () => {
    setState('loading');
    setResultData({});
  };

  const handleError = (msg) => {
    setState('error');
    setErrorMsg(msg);
  };

  const handleReset = () => {
    setState('empty');
    setResultData({});
    setErrorMsg('');
    localStorage.removeItem('architectureDataTiered');
  };

  const { formPanel, loadingPanel, handleReset: formReset } = GeneratorForm({
    onResult: handleResult,
    onLoading: handleLoading,
    onError: handleError,
    onReset: handleReset,
    onTierLoad: handleTierLoad
  });

  return (
    <>
      <HeroSection />

      <section className="gen-sec" id="generator" ref={sectionRef}>
        <div className="sl rv">// 01 · Architecture Generator</div>
        <h2 className="st rv" style={{ transitionDelay: '.1s' }}>
          BUILD YOUR<br /><span className="a">ARCHITECTURE</span>
        </h2>
        <p className="ss rv" style={{ transitionDelay: '.2s' }}>
          Describe your project and watch AI design your complete AWS stack with real-time cost estimates.
        </p>

        <div className="gen-grid rv" style={{ transitionDelay: '.3s' }}>
          {/* LEFT: FORM */}
          {formPanel}

          {/* RIGHT: OUTPUT */}
          <div className="op">
            {/* Empty State */}
            {state === 'empty' && (
              <div className="empty-state">
                <div className="empty-icon">🏗️</div>
                <div className="empty-title">READY TO BUILD</div>
                <div className="empty-sub">
                  Fill in your project details and click Generate. The AI pipeline will classify your requirements, select AWS services, estimate costs, and render a live architecture diagram.
                </div>
                <div className="empty-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}

            {state === 'error' && (
              <div className="oc show">
                <div className="och">
                  <div className="cdot dm2"></div>
                  <h4>Generation Failed</h4>
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

            {/* Results / Progressive Tiers */}
            {(state === 'loading' || state === 'result') && (
              <div className="tiers-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                {['cost', 'balanced', 'performance'].map((tier) => (
                   <TierCard key={tier} tier={tier} data={resultData?.[tier]} isLoading={!resultData?.[tier]} />
                ))}
                
                {state === 'result' && (
                   <div style={{ marginTop: '12px', textAlign: 'center' }}>
                     <Link to="/result" className="nbtn primary" style={{ padding: '12px 24px', fontSize: '1rem', display: 'inline-block' }}>
                       View Full Tabbed Comparison →
                     </Link>
                   </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <HowItWorks />
      <Footer />
    </>
  );
}
