export default function HowItWorks() {
  return (
    <section className="how-sec" id="how">
      <div className="how-inner">
        <div className="sl rv">// 02 · Pipeline</div>
        <h2 className="st rv" style={{ transitionDelay: '.1s' }}>
          HOW THE<br /><span className="a">AI WORKS</span>
        </h2>
        <div className="steps-row rv" style={{ transitionDelay: '.2s' }}>
          <div className="step-card">
            <div className="step-num">01</div>
            <div className="step-icon">🔍</div>
            <div className="step-title">Scale Classification</div>
            <div className="step-desc">
              Llama 3.3 classifies your project across scale tier, compute intensity, data complexity, and real-time needs.
            </div>
          </div>
          <div className="step-card">
            <div className="step-num">02</div>
            <div className="step-icon">⚙️</div>
            <div className="step-title">Service Selection</div>
            <div className="step-desc">
              Every AWS service is chosen conditionally — no over-engineering. Each inclusion is justified by a specific feature or scale requirement.
            </div>
          </div>
          <div className="step-card">
            <div className="step-num">03</div>
            <div className="step-icon">📊</div>
            <div className="step-title">Cost Estimation</div>
            <div className="step-desc">
              Realistic monthly costs calibrated per scale tier, broken down per service with a total estimate and cost optimization tips.
            </div>
          </div>
          <div className="step-card">
            <div className="step-num">04</div>
            <div className="step-icon">🎨</div>
            <div className="step-title">Diagram Generation</div>
            <div className="step-desc">
              Architecture is pre-built in code then validated by Gemini 2.5 Flash for syntactically perfect Mermaid diagrams every time.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
