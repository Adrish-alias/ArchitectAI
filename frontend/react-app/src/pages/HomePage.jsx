import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSection from '../components/HeroSection';
import GeneratorForm from '../components/GeneratorForm';
import HowItWorks from '../components/HowItWorks';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

export default function HomePage() {
  const [state, setState] = useState('empty'); // empty | loading | error
  const [errorMsg, setErrorMsg] = useState('');
  const sectionRef = useRef(null);
  const navigate = useNavigate();

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
    // Automatically navigate to the result page with the single architecture
    navigate('/result');
  };

  const handleLoading = () => {
    setState('loading');
  };

  const handleError = (msg) => {
    setState('error');
    setErrorMsg(msg);
  };

  const handleReset = () => {
    setState('empty');
    setErrorMsg('');
    localStorage.removeItem('architectureDataSingle');
  };

  const { formPanel, loadingPanel, handleReset: formReset } = GeneratorForm({
    onResult: handleResult,
    onLoading: handleLoading,
    onError: handleError,
    onReset: handleReset,
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

            {/* Error State */}
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

            {/* Loading / Pipeline State */}
            {state === 'loading' && loadingPanel}
          </div>
        </div>
      </section>

      <HowItWorks />
      <Footer />
    </>
  );
}
