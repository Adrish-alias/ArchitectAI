import { useState, useRef, useCallback } from 'react';
import { generateArchitecture } from '../utils/api';

const DEFAULT_FEATURES = [
  { value: 'real-time collaboration', label: 'Real-time collab', checked: false },
  { value: 'user authentication', label: 'User auth', checked: true },
  { value: 'file storage', label: 'File storage', checked: false },
  { value: 'full-text search', label: 'Full-text search', checked: false },
  { value: 'payments', label: 'Payments', checked: false },
  { value: 'background processing', label: 'Background jobs', checked: false },
  { value: 'analytics dashboard', label: 'Analytics', checked: false },
  { value: 'video streaming', label: 'Video streaming', checked: false },
];

const STEP_TIMINGS = [0, 3000, 7000, 11000, 16000];
const STEP_LABELS = [
  'Step 1 — Analyzing requirements',
  'Step 2 — Retrieving relevant AWS architectures',
  'Step 3 — Grounding architectural decisions',
  'Step 4 — Selecting AWS services & building topology',
  'Step 5 — Validating architecture & estimating cost',
];

export default function GeneratorForm({ onResult, onLoading, onError, onReset }) {
  const [idea, setIdea] = useState('');
  const [users, setUsers] = useState('');
  const [budget, setBudget] = useState('');
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [customFeat, setCustomFeat] = useState('');
  
  const [advOpen, setAdvOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepStates, setStepStates] = useState(Array(5).fill('idle'));
  const [buttonText, setButtonText] = useState('⚡ GENERATE ARCHITECTURE');

  const progressRef = useRef(null);
  const stepTimersRef = useRef([]);

  const toggleFeature = useCallback((index) => {
    setFeatures(prev => prev.map((f, i) =>
      i === index ? { ...f, checked: !f.checked } : f
    ));
  }, []);

  const addCustomFeature = useCallback(() => {
    const val = customFeat.trim();
    if (!val) return;
    setFeatures(prev => [...prev, { value: val, label: val, checked: true }]);
    setCustomFeat('');
  }, [customFeat]);

  const startProgress = useCallback(() => {
    const steps = [5, 15, 25, 45, 65, 80, 90, 95];
    let si = 0;
    setProgress(0);
    progressRef.current = setInterval(() => {
      if (si < steps.length) {
        setProgress(steps[si]);
        si++;
      }
    }, 2800);
  }, []);

  const animateSteps = useCallback(() => {
    stepTimersRef.current.forEach(clearTimeout);
    stepTimersRef.current = [];
    setStepStates(Array(5).fill('idle'));

    STEP_TIMINGS.forEach((delay, i) => {
      const timer = setTimeout(() => {
        setStepStates(prev => {
          const next = [...prev];
          if (i > 0) next[i - 1] = 'done';
          next[i] = 'active';
          return next;
        });
      }, delay);
      stepTimersRef.current.push(timer);
    });
  }, []);

  const handleGenerate = async () => {
    if (!idea.trim()) { alert('Please describe your project idea.'); return; }
    
    // Default to some users if left blank by the user in the new UI
    const usersNum = parseInt(users) || 10000;

    const selectedFeatures = features.filter(f => f.checked).map(f => f.value);

    setGenerating(true);
    setButtonText('⚡ GENERATING ARCHITECTURE...');
    onLoading();
    startProgress();
    animateSteps();

    try {
      const architecture = await generateArchitecture({
        idea: idea.trim(),
        users: usersNum,
        budget: budget.trim() || undefined,
        features: selectedFeatures,
      });

      stepTimersRef.current.forEach(clearTimeout);
      setStepStates(Array(5).fill('done'));
      clearInterval(progressRef.current);
      setProgress(100);

      if (!architecture) {
        throw new Error("Failed to generate architecture.");
      }

      localStorage.setItem('architectureData', JSON.stringify(architecture));

      setTimeout(() => {
        onResult(architecture);
        setButtonText('⚡ REGENERATE');
        setGenerating(false);
      }, 600);

    } catch (err) {
      stepTimersRef.current.forEach(clearTimeout);
      clearInterval(progressRef.current);
      setProgress(0);
      setStepStates(Array(5).fill('idle'));
      onError(err.message || 'Generation failed');
      setButtonText('⚡ GENERATE ARCHITECTURE');
      setGenerating(false);
    }
  };

  const handleReset = () => {
    setProgress(0);
    clearInterval(progressRef.current);
    stepTimersRef.current.forEach(clearTimeout);
    setStepStates(Array(5).fill('idle'));
    setButtonText('⚡ GENERATE ARCHITECTURE');
    setGenerating(false);
    onReset();
  };

  return {
    formPanel: (
      <div className="pp" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="pp-hd">
          <span>🚀</span>
          <span className="pht">Architecture Composer</span>
          <span className="phtag">Live Mode</span>
        </div>
        <div className="pform" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="fgroup" style={{ margin: 0 }}>
            <textarea
              className="finput composer-input"
              rows="6"
              placeholder="Describe the system you want to build... (e.g., A multi-tenant SaaS platform for 100k users. Users access a highly available web dashboard...)"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleGenerate();
                }
              }}
              style={{ fontSize: '1rem', lineHeight: '1.5', padding: '16px' }}
            />
          </div>

          <div className="adv-req-container">
            <button 
              className="adv-req-toggle"
              onClick={() => setAdvOpen(!advOpen)}
              style={{
                background: 'transparent', border: 'none', color: 'var(--muted2)',
                fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 0', textTransform: 'uppercase', letterSpacing: '0.05em'
              }}
            >
              <span style={{ transform: advOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
              {advOpen ? 'Hide Advanced Requirements' : 'Advanced Requirements'}
            </button>
            
            {advOpen && (
              <div className="adv-req-content" style={{ marginTop: '12px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="frow" style={{ marginBottom: '16px' }}>
                  <div className="fgroup" style={{ margin: 0 }}>
                    <label className="flabel">Expected Users</label>
                    <input
                      type="number"
                      className="finput"
                      placeholder="e.g. 10000"
                      min="1"
                      value={users}
                      onChange={(e) => setUsers(e.target.value)}
                    />
                  </div>
                  <div className="fgroup" style={{ margin: 0 }}>
                    <label className="flabel">Monthly Budget</label>
                    <input
                      type="text"
                      className="finput"
                      placeholder="e.g. $3,000/month"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                    />
                  </div>
                </div>
                <div className="fgroup" style={{ margin: 0 }}>
                  <label className="flabel">Key Features</label>
                  <div className="features-grid">
                    {features.map((feat, i) => (
                      <label key={i} className="fcheck" style={{ cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={feat.checked}
                          onChange={() => toggleFeature(i)}
                          style={{ cursor: 'pointer' }}
                        />
                        {' '}{feat.label}
                      </label>
                    ))}
                  </div>
                  <div className="custom-feat" style={{ marginTop: 10 }}>
                    <input
                      type="text"
                      className="finput"
                      placeholder="Add custom feature..."
                      value={customFeat}
                      onChange={(e) => setCustomFeat(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCustomFeature()}
                    />
                    <button className="add-feat-btn" onClick={addCustomFeature} style={{ cursor: 'pointer' }}>+ Add</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
        </div>
        <div className="rprog" style={{ marginTop: 'auto' }}>
          <div className="rbar" style={{ width: progress + '%' }}></div>
        </div>
        <button
          className="rbtn"
          disabled={generating}
          onClick={handleGenerate}
          style={{ cursor: generating ? 'not-allowed' : 'pointer' }}
        >
          {buttonText}
        </button>
      </div>
    ),
    loadingPanel: (
      <div className="oc show">
        <div className="och">
          <div className="cdot dc3"></div>
          <h4>AI Pipeline Running</h4>
          <span className="ocm">Amazon Bedrock</span>
        </div>
        <div className="lcontent">
          <div className="lsteps-wrap">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className={`lstep ${stepStates[i]}`}>
                <span className="lico">
                  {stepStates[i] === 'done' ? '✓' : '◌'}
                </span>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    handleReset,
  };
}
