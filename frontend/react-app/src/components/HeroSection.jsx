import { useEffect, useRef } from 'react';

export default function HeroSection() {
  const sectionRef = useRef(null);

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

  return (
    <section className="hero" id="hero" ref={sectionRef}>
      <div className="hgrid"></div>
      <div className="hglow"></div>
      <div className="orb oa"></div>
      <div className="orb ob"></div>
      <div className="htag">
        <span className="dot"></span>Amazon Bedrock · Llama 3.3 · Gemini 2.5
      </div>
      <h1>
        <span className="d">YOUR</span><br />
        <span className="g">ARCHITECT</span><br />
        <span className="d">AI</span>
      </h1>
      <p className="hero-sub">
        Describe your idea in plain English. Get a complete AWS architecture, cost estimate, and visual diagram in seconds.
      </p>
      <div className="scroll-hint">
        <span>start building</span>
        <div className="sline"></div>
      </div>
    </section>
  );
}
