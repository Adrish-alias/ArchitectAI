import { Link } from 'react-router-dom';
import ArchitectureDiagram from './ArchitectureDiagram';

export default function DiagramPanel({ mermaidString }) {
  return (
    <div className="oc show" id="oc2">
      <div className="och">
        <div className="cdot dm2"></div>
        <h4>Architecture Diagram</h4>
        <span className="ocm">React Flow · Live Render</span>
      </div>
      <div className="db2">
        <div id="mermaid-diagram" style={{
          background: 'rgba(0,0,0,.45)',
          border: '1px solid rgba(0,240,180,.07)',
          borderRadius: 10,
          padding: 0,
          minHeight: 380,
          overflow: 'hidden',
        }}>
          <ArchitectureDiagram mermaidString={mermaidString} compact />
        </div>
      </div>
      <Link to="/result" className="open-full-btn">
        ⬡ OPEN FULL ARCHITECTURE VIEW →
      </Link>
    </div>
  );
}
