import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  MarkerType,
  reconnectEdge,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { parseMermaidToFlow } from '../utils/mermaidParser';
import { getServiceIcon, getServiceDescription } from '../utils/serviceHelpers';

/* ═══════════════════════════════════════
   AWS SERVICE CATALOG
   ═══════════════════════════════════════ */
const AWS_CATALOG = [
  { category: 'Compute', services: [
    { id: 'ecs', label: 'Amazon ECS Fargate', icon: '🐳' },
    { id: 'lambda', label: 'AWS Lambda', icon: 'λ' },
    { id: 'ec2', label: 'Amazon EC2', icon: '🖥️' },
    { id: 'lightsail', label: 'Amazon Lightsail', icon: '💡' },
    { id: 'beanstalk', label: 'Elastic Beanstalk', icon: '🌱' },
  ]},
  { category: 'Storage', services: [
    { id: 's3', label: 'Amazon S3', icon: '🪣' },
    { id: 'ebs', label: 'Amazon EBS', icon: '💾' },
    { id: 'efs', label: 'Amazon EFS', icon: '📁' },
  ]},
  { category: 'Database', services: [
    { id: 'dynamodb', label: 'Amazon DynamoDB', icon: '🗃' },
    { id: 'rds', label: 'Amazon RDS', icon: '🛢️' },
    { id: 'elasticache', label: 'ElastiCache Redis', icon: '⚡' },
    { id: 'neptune', label: 'Amazon Neptune', icon: '🔗' },
  ]},
  { category: 'Networking', services: [
    { id: 'apigateway', label: 'API Gateway', icon: '⚙️' },
    { id: 'cloudfront', label: 'Amazon CloudFront', icon: '🌐' },
    { id: 'elb', label: 'Elastic Load Balancer', icon: '⚖️' },
    { id: 'route53', label: 'Amazon Route 53', icon: '🗺️' },
  ]},
  { category: 'Security', services: [
    { id: 'cognito', label: 'Amazon Cognito', icon: '🔐' },
    { id: 'iam', label: 'AWS IAM', icon: '🛡️' },
    { id: 'waf', label: 'AWS WAF', icon: '🧱' },
  ]},
  { category: 'Messaging', services: [
    { id: 'sqs', label: 'Amazon SQS', icon: '📬' },
    { id: 'sns', label: 'Amazon SNS', icon: '📢' },
    { id: 'eventbridge', label: 'EventBridge', icon: '🔔' },
    { id: 'kinesis', label: 'Amazon Kinesis', icon: '🌊' },
  ]},
  { category: 'Analytics', services: [
    { id: 'opensearch', label: 'OpenSearch', icon: '🔍' },
    { id: 'athena', label: 'Amazon Athena', icon: '📊' },
    { id: 'redshift', label: 'Amazon Redshift', icon: '📈' },
  ]},
  { category: 'Other', services: [
    { id: 'user', label: 'End User', icon: '👤' },
    { id: 'custom', label: 'Custom Service', icon: '☁️' },
  ]},
];

/* ═══════════════════════════════════════
   HIGHLIGHT COLORS
   ═══════════════════════════════════════ */
const HIGHLIGHT_STYLES = {
  unnecessary:  { border: '#ff3daa', glow: 'rgba(255,61,170,.35)', label: 'UNNECESSARY' },
  missing:      { border: '#3d7fff', glow: 'rgba(61,127,255,.35)',  label: 'MISSING' },
  anti_pattern: { border: '#ff3d5c', glow: 'rgba(255,61,92,.35)',   label: 'ANTI-PATTERN' },
  cost:         { border: '#ffd060', glow: 'rgba(255,208,96,.35)',   label: 'COST ISSUE' },
};

/* ═══════════════════════════════════════
   CUSTOM AWS SERVICE NODE
   ═══════════════════════════════════════ */
function AWSServiceNode({ id, data, selected }) {
  const icon = data.icon || getServiceIcon(data.label);
  const hl = data.highlight ? HIGHLIGHT_STYLES[data.highlight.type] : null;

  const [isHovered, setIsHovered] = useState(false);

  const nodeClass = [
    'rf-node',
    selected ? 'rf-node--selected' : '',
    hl ? 'rf-node--highlighted' : '',
  ].filter(Boolean).join(' ');

  const nodeStyle = hl ? {
    borderColor: hl.border,
    boxShadow: `0 0 18px ${hl.glow}, 0 0 40px ${hl.glow}`,
  } : {};

  return (
    <div 
      className={nodeClass} 
      style={nodeStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Connection Handles */}
      <Handle type="target" position={Position.Top} className="rf-handle rf-handle--target" id="top" />
      <Handle type="target" position={Position.Left} className="rf-handle rf-handle--target" id="left" />

      {/* Highlight badge */}
      {hl && (
        <div className="rf-node__highlight-badge" style={{ background: hl.border, color: '#000' }}>
          {hl.label}
        </div>
      )}

      {/* Delete button */}
      {data.onDelete && (
        <button
          className="rf-node__delete"
          onClick={(e) => { e.stopPropagation(); data.onDelete(id); }}
          title="Delete node"
        >×</button>
      )}

      {/* Node content */}
      <div className="rf-node__icon-wrap">
        <span className="rf-node__icon">{icon}</span>
      </div>
      <div className="rf-node__info">
        <div className="rf-node__label">{data.label}</div>
        {data.role && <div className="rf-node__role">{data.role}</div>}
      </div>

      {/* Service Tooltip */}
      {isHovered && (
        <div className="rf-node__tooltip">
          <strong>{data.label}</strong>
          <p>{getServiceDescription(data.label)}</p>
        </div>
      )}

      {/* Glow ring */}
      <div className="rf-node__glow" />

      <Handle type="source" position={Position.Bottom} className="rf-handle rf-handle--source" id="bottom" />
      <Handle type="source" position={Position.Right} className="rf-handle rf-handle--source" id="right" />
    </div>
  );
}

const nodeTypes = { awsService: AWSServiceNode };

/* ═══════════════════════════════════════
   ADD NODE PANEL
   ═══════════════════════════════════════ */
function AddNodePanel({ isOpen, onClose, onAddNode }) {
  const [search, setSearch] = useState('');
  const [customLabel, setCustomLabel] = useState('');

  const filtered = useMemo(() => {
    if (!search) return AWS_CATALOG;
    const s = search.toLowerCase();
    return AWS_CATALOG.map(cat => ({
      ...cat,
      services: cat.services.filter(svc =>
        svc.label.toLowerCase().includes(s) || cat.category.toLowerCase().includes(s)
      )
    })).filter(cat => cat.services.length > 0);
  }, [search]);

  const handleAdd = (svc) => {
    const label = svc.id === 'custom' && customLabel.trim() ? customLabel.trim() : svc.label;
    onAddNode({ label, icon: svc.icon });
    setSearch('');
    setCustomLabel('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="rf-add-panel">
      <div className="rf-add-panel__header">
        <span className="rf-add-panel__title">Add AWS Service</span>
        <button className="rf-add-panel__close" onClick={onClose}>×</button>
      </div>
      <div className="rf-add-panel__search">
        <input
          type="text"
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>
      <div className="rf-add-panel__list">
        {filtered.map(cat => (
          <div key={cat.category} className="rf-add-panel__category">
            <div className="rf-add-panel__cat-label">{cat.category}</div>
            {cat.services.map(svc => (
              <button
                key={svc.id}
                className="rf-add-panel__service"
                onClick={() => svc.id === 'custom' ? null : handleAdd(svc)}
              >
                <span className="rf-add-panel__svc-icon">{svc.icon}</span>
                <span className="rf-add-panel__svc-name">{svc.label}</span>
                {svc.id === 'custom' && (
                  <div className="rf-add-panel__custom-row" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      placeholder="Service name..."
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && customLabel.trim()) handleAdd(svc); }}
                      className="rf-add-panel__custom-input"
                    />
                    <button className="rf-add-panel__custom-btn" onClick={() => { if (customLabel.trim()) handleAdd(svc); }}>+</button>
                  </div>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   EDGE LABEL EDITOR
   ═══════════════════════════════════════ */
function EdgeLabelEditor({ edge, position, onSave, onClose }) {
  const [label, setLabel] = useState(edge?.label || '');
  if (!edge) return null;

  return (
    <div className="rf-edge-editor" style={{ left: position.x, top: position.y }}>
      <div className="rf-edge-editor__title">Edge Label</div>
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="e.g. request, JWT, pub/sub..."
        autoFocus
        onKeyDown={(e) => { if (e.key === 'Enter') onSave(edge.id, label); if (e.key === 'Escape') onClose(); }}
      />
      <div className="rf-edge-editor__actions">
        <button onClick={() => onSave(edge.id, label)}>Save</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   NODE DETAIL SIDEBAR
   ═══════════════════════════════════════ */
function NodeDetailSidebar({ node, onClose, onUpdateLabel, onUpdateRole, onDelete }) {
  if (!node) return null;

  return (
    <div className="rf-detail-sidebar">
      <div className="rf-detail-sidebar__header">
        <span className="rf-detail-sidebar__icon">{node.data.icon || getServiceIcon(node.data.label)}</span>
        <button className="rf-detail-sidebar__close" onClick={onClose}>×</button>
      </div>
      <div className="rf-detail-sidebar__body">
        <div className="rf-detail-sidebar__field">
          <label>Service Name</label>
          <input
            type="text"
            value={node.data.label}
            onChange={(e) => onUpdateLabel(node.id, e.target.value)}
          />
        </div>
        <div className="rf-detail-sidebar__field">
          <label>Role / Description</label>
          <input
            type="text"
            value={node.data.role || ''}
            onChange={(e) => onUpdateRole(node.id, e.target.value)}
            placeholder="e.g. User authentication, API handler..."
          />
        </div>
        <div className="rf-detail-sidebar__field">
          <label>Node ID</label>
          <div className="rf-detail-sidebar__id">{node.id}</div>
        </div>
        <button className="rf-detail-sidebar__delete" onClick={() => { onDelete(node.id); onClose(); }}>
          🗑 Delete Node
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN DIAGRAM EDITOR (inner, needs ReactFlowProvider)
   ═══════════════════════════════════════ */
function DiagramEditorInner({ mermaidString, compact = false, highlightedNodes = [] }) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => parseMermaidToFlow(mermaidString || ''),
    [mermaidString]
  );

  // Build highlight lookup
  const highlightMap = useMemo(() => {
    const map = {};
    highlightedNodes.forEach(h => { if (h.nodeId) map[h.nodeId] = h; });
    return map;
  }, [highlightedNodes]);

  // Inject onDelete + highlight into initial node data
  const injectCallbacks = useCallback((nodeList, deleteFn) => {
    return nodeList.map(n => {
      if (n.type !== 'awsService') return n;
      const hl = highlightMap[n.id] || null;
      return {
        ...n,
        data: { ...n.data, onDelete: deleteFn, highlight: hl },
      };
    });
  }, [highlightMap]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [editingEdge, setEditingEdge] = useState(null);
  const [edgeEditorPos, setEdgeEditorPos] = useState({ x: 0, y: 0 });
  const edgeReconnectSuccessful = useRef(true);
  const nodeCounter = useRef(100);
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  // Delete a node and its connected edges
  const deleteNode = useCallback((nodeId) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(prev => prev?.id === nodeId ? null : prev);
  }, [setNodes, setEdges]);

  // Initialize nodes with delete callback
  useEffect(() => {
    const withCallbacks = injectCallbacks(initialNodes, deleteNode);
    setNodes(withCallbacks);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, injectCallbacks, deleteNode, setNodes, setEdges]);

  // Re-inject the delete callback whenever nodes change externally
  // (so new nodes also get the callback)

  const hasData = initialNodes.length > 0 || nodes.length > 0;

  // ─── Edge creation ───
  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      animated: true,
      style: { stroke: 'rgba(0,240,180,.55)', strokeWidth: 1.5 },
      labelStyle: { fill: '#eef0f8', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" },
      labelBgStyle: { fill: 'rgba(3,5,13,.9)', fillOpacity: 0.9 },
      labelBgPadding: [6, 4],
      labelBgBorderRadius: 4,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: 'rgba(0,240,180,.55)' },
    }, eds));
  }, [setEdges]);

  // ─── Edge reconnection ───
  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect = useCallback((oldEdge, newConnection) => {
    edgeReconnectSuccessful.current = true;
    setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
  }, [setEdges]);

  const onReconnectEnd = useCallback((_, edge) => {
    if (!edgeReconnectSuccessful.current) {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    }
    edgeReconnectSuccessful.current = true;
  }, [setEdges]);

  // ─── Node click → detail sidebar ───
  const onNodeClick = useCallback((event, node) => {
    if (node.type === 'awsService') {
      setSelectedNode(node);
    }
  }, []);

  // ─── Edge double-click → label editor ───
  const onEdgeDoubleClick = useCallback((event, edge) => {
    event.stopPropagation();
    setEditingEdge(edge);
    setEdgeEditorPos({ x: event.clientX - 120, y: event.clientY - 80 });
  }, []);

  // ─── Save edge label ───
  const saveEdgeLabel = useCallback((edgeId, label) => {
    setEdges(eds => eds.map(e => e.id === edgeId ? { ...e, label: label || undefined } : e));
    setEditingEdge(null);
  }, [setEdges]);

  // ─── Delete selected elements (keyboard) ───
  const onNodesDelete = useCallback((deleted) => {
    const ids = new Set(deleted.map(n => n.id));
    setEdges(eds => eds.filter(e => !ids.has(e.source) && !ids.has(e.target)));
    setSelectedNode(prev => prev && ids.has(prev.id) ? null : prev);
  }, [setEdges]);

  // ─── Add new node ───
  const addNode = useCallback(({ label, icon }) => {
    const id = `new_${nodeCounter.current++}`;
    const position = screenToFlowPosition({
      x: (reactFlowWrapper.current?.clientWidth || 600) / 2,
      y: (reactFlowWrapper.current?.clientHeight || 400) / 2,
    });
    const newNode = {
      id,
      type: 'awsService',
      position: { x: position.x + (Math.random() - 0.5) * 80, y: position.y + (Math.random() - 0.5) * 80 },
      data: { label, icon, onDelete: deleteNode },
    };
    setNodes(nds => [...nds, newNode]);
  }, [setNodes, deleteNode, screenToFlowPosition]);

  // ─── Update node label/role ───
  const updateNodeLabel = useCallback((nodeId, label) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, label } } : n));
    setSelectedNode(prev => prev?.id === nodeId ? { ...prev, data: { ...prev.data, label } } : prev);
  }, [setNodes]);

  const updateNodeRole = useCallback((nodeId, role) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, role } } : n));
    setSelectedNode(prev => prev?.id === nodeId ? { ...prev, data: { ...prev.data, role } } : prev);
  }, [setNodes]);

  // ─── Pane click → deselect ───
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setEditingEdge(null);
  }, []);

  if (!hasData && !compact) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 380, flexDirection: 'column', gap: 12,
        color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace", fontSize: '.7rem',
      }}>
        <span style={{ fontSize: '2rem', opacity: 0.3 }}>⬡</span>
        Diagram unavailable — no mermaid data.
      </div>
    );
  }

  return (
    <div ref={reactFlowWrapper} className="rf-editor-wrap" style={{ width: '100%', height: compact ? 420 : '100%', minHeight: compact ? 420 : 580 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
        onNodeClick={onNodeClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onPaneClick={onPaneClick}
        onNodesDelete={onNodesDelete}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={3}
        deleteKeyCode={['Backspace', 'Delete']}
        connectionLineStyle={{ stroke: 'var(--cyan)', strokeWidth: 2, strokeDasharray: '6 3' }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: 'rgba(0,240,180,.55)', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: 'rgba(0,240,180,.55)' },
        }}
        snapToGrid
        snapGrid={[20, 20]}
      >
        <Background color="rgba(0,240,180,.045)" gap={40} size={1} variant="dots" />

        {/* Toolbar */}
        <Panel position="top-left" className="rf-toolbar">
          <button className="rf-toolbar__btn rf-toolbar__btn--primary" onClick={() => setAddPanelOpen(true)} title="Add node">
            <span>+</span> Add Node
          </button>
          <button className="rf-toolbar__btn" onClick={() => fitView({ padding: 0.25, duration: 400 })} title="Fit view">
            ⊞ Fit
          </button>
          <div className="rf-toolbar__hint">
            <span className="rf-toolbar__hint-key">Drag</span> handles to connect
            <span className="rf-toolbar__hint-sep">·</span>
            <span className="rf-toolbar__hint-key">Del</span> to remove
            <span className="rf-toolbar__hint-sep">·</span>
            <span className="rf-toolbar__hint-key">Dbl-click</span> edge to label
          </div>
        </Panel>

        {!compact && (
          <Controls
            position="bottom-right"
            className="rf-controls"
          />
        )}

        {!compact && (
          <MiniMap
            position="bottom-left"
            nodeColor={(n) => n.type === 'group' ? 'rgba(0,240,180,.15)' : 'rgba(0,240,180,.4)'}
            maskColor="rgba(3,5,13,.85)"
            className="rf-minimap"
          />
        )}
      </ReactFlow>

      {/* Add Node Panel */}
      <AddNodePanel
        isOpen={addPanelOpen}
        onClose={() => setAddPanelOpen(false)}
        onAddNode={addNode}
      />

      {/* Node Detail Sidebar */}
      {selectedNode && (
        <NodeDetailSidebar
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onUpdateLabel={updateNodeLabel}
          onUpdateRole={updateNodeRole}
          onDelete={deleteNode}
        />
      )}

      {/* Edge Label Editor */}
      {editingEdge && (
        <EdgeLabelEditor
          edge={editingEdge}
          position={edgeEditorPos}
          onSave={saveEdgeLabel}
          onClose={() => setEditingEdge(null)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   EXPORTED WRAPPER (provides ReactFlowProvider)
   ═══════════════════════════════════════ */
export default function ArchitectureDiagram({ highlightedNodes, ...rest }) {
  return (
    <ReactFlowProvider>
      <DiagramEditorInner {...rest} highlightedNodes={highlightedNodes || []} />
    </ReactFlowProvider>
  );
}
