import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ onToggleRaw, onExportJSON }) {
  const location = useLocation();
  const isResult = location.pathname === '/result';
  const isAnalyse = location.pathname === '/analyse';
  const isGenerate = location.pathname === '/generate';

  if (isResult) {
    return (
      <nav>
        <Link to="/" className="logo" style={{ textDecoration: 'none' }}>ArchitectAI</Link>
        <div className="nav-mid">
          <span>Architecture Result</span>
          <span className="sep">/</span>
          <span id="nav-project-name" style={{ color: 'var(--text)' }}>Full View</span>
        </div>
        <div className="nav-right">
          <button className="nbtn" onClick={onToggleRaw}>⟨/⟩ Raw Mermaid</button>
          <button className="nbtn" onClick={onExportJSON}>↓ Export JSON</button>
          <Link to="/generate" className="nbtn primary">← Back to Generator</Link>
        </div>
      </nav>
    );
  }

  if (isAnalyse) {
    return (
      <nav>
        <Link to="/" className="logo" style={{ textDecoration: 'none' }}>ArchitectAI</Link>
        <div className="nav-links">
          <Link to="/generate">Generator</Link>
          <a href="#analyser" className="nav-active">Analyser</a>
          <Link to="/result">Full Diagram View</Link>
        </div>
      </nav>
    );
  }

  // Generator page (and any other with navbar)
  return (
    <nav>
      <Link to="/" className="logo" style={{ textDecoration: 'none' }}>ArchitectAI</Link>
      <div className="nav-links">
        <a href="#generator">Generator</a>
        <Link to="/analyse">Analyser</Link>
        <a href="#how">How It Works</a>
        <Link to="/result">Full Diagram View</Link>
      </div>
    </nav>
  );
}
