import { useState, useRef, useCallback } from 'react';
import { analyseArchitecture } from '../utils/api';

const STEP_TIMINGS = [0, 4000, 9000, 15000, 21000];
const STEP_LABELS = [
  'Step 1 — Parsing architecture diagram',
  'Step 2 — Detecting issues & anti-patterns',
  'Step 3 — Building optimized architecture',
  'Step 4 — Generating optimized diagram',
  'Step 5 — Validating with Gemini',
];

const SAMPLE_MERMAID = `graph TD

subgraph Client["Client Layer"]
  User["End User"]
end

subgraph API["API Layer"]
  APIGateway["API Gateway REST"]
end

subgraph Compute["Compute Layer"]
  LambdaAPI["Lambda API Handler"]
end

subgraph Data["Data Layer"]
  DynamoDB["Amazon DynamoDB"]
end

User --> APIGateway
APIGateway -->|"request"| LambdaAPI
LambdaAPI -->|"read/write"| DynamoDB`;

export default function AnalyserForm({ onResult, onLoading, onError, onReset }) {
  const [mermaidCode, setMermaidCode] = useState('');
  const [description, setDescription] = useState('');
  const [analysing, setAnalysing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepStates, setStepStates] = useState(Array(5).fill('idle'));
  const [buttonText, setButtonText] = useState('🔍 ANALYSE ARCHITECTURE');

  const progressRef = useRef(null);
  const stepTimersRef = useRef([]);

  const loadSample = useCallback(() => {
    setMermaidCode(SAMPLE_MERMAID);
    setDescription('A simple REST API with Lambda and DynamoDB for a basic CRUD application serving about 500 users. No authentication, no caching, no CDN.');
  }, []);

  const startProgress = useCallback(() => {
    const steps = [5, 12, 22, 38, 55, 70, 82, 90, 95];
    let si = 0;
    setProgress(0);
    progressRef.current = setInterval(() => {
      if (si < steps.length) {
        setProgress(steps[si]);
        si++;
      }
    }, 3200);
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

  const handleAnalyse = async () => {
    if (!mermaidCode.trim()) { alert('Please paste your Mermaid architecture diagram.'); return; }
    if (!description.trim()) { alert('Please describe your architecture.'); return; }

    setAnalysing(true);
    setButtonText('🔍 ANALYSING...');
    onLoading();
    startProgress();
    animateSteps();

    try {
      const data = await analyseArchitecture({
        mermaid: mermaidCode.trim(),
        description: description.trim(),
      });

      stepTimersRef.current.forEach(clearTimeout);
      setStepStates(Array(5).fill('done'));
      clearInterval(progressRef.current);
      setProgress(100);

      localStorage.setItem('analysisData', JSON.stringify(data));

      setTimeout(() => {
        onResult(data);
        setButtonText('🔍 RE-ANALYSE');
        setAnalysing(false);
      }, 600);

    } catch (err) {
      stepTimersRef.current.forEach(clearTimeout);
      clearInterval(progressRef.current);
      setProgress(0);
      setStepStates(Array(5).fill('idle'));
      onError(err.message);
      setButtonText('🔍 ANALYSE ARCHITECTURE');
      setAnalysing(false);
    }
  };

  const handleReset = () => {
    setProgress(0);
    clearInterval(progressRef.current);
    stepTimersRef.current.forEach(clearTimeout);
    setStepStates(Array(5).fill('idle'));
    setButtonText('🔍 ANALYSE ARCHITECTURE');
    setAnalysing(false);
    onReset();
  };

  return {
    formPanel: (
      <div className="pp">
        <div className="pp-hd">
          <span>🔬</span>
          <span className="pht">Architecture Analyser</span>
          <span className="phtag analyse-tag">Audit Mode</span>
        </div>
        <div className="pform">
          <div className="fgroup">
            <label className="flabel">
              Mermaid Diagram *
              <button className="sample-btn" onClick={loadSample} type="button">
                📋 Load Sample
              </button>
            </label>
            <textarea
              className="finput code-input"
              rows="8"
              placeholder={`Paste your Mermaid architecture diagram here...\n\nExample:\ngraph TD\n  User["End User"]\n  API["API Gateway"]\n  User --> API`}
              value={mermaidCode}
              onChange={(e) => setMermaidCode(e.target.value)}
              spellCheck={false}
            />
          </div>
          <div className="fgroup">
            <label className="flabel">Architecture Description *</label>
            <textarea
              className="finput"
              rows="3"
              placeholder="Describe what this architecture is for, expected users, and key requirements. e.g. 'E-commerce platform serving 50k users with real-time inventory updates, payments, and file uploads.'"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <div className="rprog">
          <div className="rbar analyse-bar" style={{ width: progress + '%' }}></div>
        </div>
        <button
          className="rbtn analyse-rbtn"
          disabled={analysing}
          onClick={handleAnalyse}
        >
          {buttonText}
        </button>
      </div>
    ),
    loadingPanel: (
      <div className="oc show">
        <div className="och">
          <div className="cdot analyse-dot"></div>
          <h4>AI Analysis Running</h4>
          <span className="ocm">Bedrock + Gemini</span>
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
