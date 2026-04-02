export default function ImplStepsPanel({ steps = [] }) {
  return (
    <div className="oc show" id="oc4">
      <div className="och">
        <div className="cdot dc3"></div>
        <h4>Implementation Plan</h4>
        <span className="ocm">Step-by-step Roadmap</span>
      </div>
      <div className="impl-body">
        {steps.map((s, i) => (
          <div key={i} className="impl-step">
            <div className="impl-head">
              <div className="impl-phase">{s.phase}</div>
              <div className="impl-dur">{s.duration || ''}</div>
            </div>
            <ul className="impl-tasks">
              {(s.tasks || []).map((task, j) => (
                <li key={j}>{task}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
