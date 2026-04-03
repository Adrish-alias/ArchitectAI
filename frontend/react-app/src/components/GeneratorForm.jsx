import { useState, useRef, useEffect, useCallback } from 'react';
import { generateAllTiers } from '../utils/api';

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
  'Step 1 — Classifying scale and requirements',
  'Step 2 — Selecting optimal AWS services',
  'Step 3 — Assembling architecture JSON',
  'Step 4 — Generating Mermaid diagram',
  'Step 5 — Validating with Gemini',
];

export default function GeneratorForm({ onResult, onLoading, onError, onReset, onTierLoad }) {
  const [idea, setIdea] = useState('');
  const [users, setUsers] = useState('');
  const [budget, setBudget] = useState('');
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [customFeat, setCustomFeat] = useState('');
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
    const usersNum = parseInt(users);
    if (!usersNum || usersNum < 1) { alert('Please enter expected number of users.'); return; }

    const selectedFeatures = features.filter(f => f.checked).map(f => f.value);

    setGenerating(true);
    setButtonText('⚡ GENERATING TIERS...');
    onLoading();
    startProgress();
    animateSteps();

    try {
      const results = await generateAllTiers({
        idea: idea.trim(),
        users: usersNum,
        budget: budget.trim() || undefined,
        features: selectedFeatures,
      }, (tier, result) => {
        if (result.success && onTierLoad) {
          onTierLoad(tier, result.data);
        }
      });

      stepTimersRef.current.forEach(clearTimeout);
      setStepStates(Array(5).fill('done'));
      clearInterval(progressRef.current);
      setProgress(100);

      const successfulTiers = {};
      Object.keys(results).forEach(t => {
        if (results[t].success) successfulTiers[t] = results[t].data;
      });

      localStorage.setItem('architectureDataTiered', JSON.stringify({ tiers: successfulTiers }));

      setTimeout(() => {
        onResult(successfulTiers);
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
      <div className="pp">
        <div className="pp-hd">
          <span>🚀</span>
          <span className="pht">Project Input</span>
          <span className="phtag">Live Mode</span>
        </div>
        <div className="pform">
          <div className="fgroup">
            <label className="flabel">Project Idea *</label>
            <textarea
              className="finput"
              rows="3"
              placeholder="Describe your project in plain English. e.g. A real-time collaborative code editor for remote teams, similar to VS Code Web."
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />
          </div>
          <div className="frow">
            <div className="fgroup">
              <label className="flabel">Expected Users *</label>
              <input
                type="number"
                className="finput"
                placeholder="e.g. 50000"
                min="1"
                value={users}
                onChange={(e) => setUsers(e.target.value)}
              />
            </div>
            <div className="fgroup">
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
          <div className="fgroup">
            <label className="flabel">Key Features</label>
            <div className="features-grid">
              {features.map((feat, i) => (
                <label key={i} className="fcheck">
                  <input
                    type="checkbox"
                    checked={feat.checked}
                    onChange={() => toggleFeature(i)}
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
              <button className="add-feat-btn" onClick={addCustomFeature}>+ Add</button>
            </div>
          </div>
        </div>
        <div className="rprog">
          <div className="rbar" style={{ width: progress + '%' }}></div>
        </div>
        <button
          className="rbtn"
          disabled={generating}
          onClick={handleGenerate}
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
