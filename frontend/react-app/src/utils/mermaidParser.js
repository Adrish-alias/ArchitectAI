import dagre from 'dagre';

/**
 * Parses a Mermaid "graph TD" string into React Flow nodes and edges.
 * Handles subgraphs, node declarations, and edge connections with labels.
 */
export function parseMermaidToFlow(mermaidStr) {
  if (!mermaidStr || !mermaidStr.trim().startsWith('graph')) {
    return { nodes: [], edges: [] };
  }

  const lines = mermaidStr.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const rawNodes = {};
  const rawEdges = [];
  const subgraphs = [];
  let currentSubgraph = null;
  const nodeToSubgraph = {};

  // --- Pass 1: Parse lines ---
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip the first "graph TD" line
    if (line.match(/^graph\s+(TD|TB|LR|RL|BT)/i)) continue;

    // Subgraph start
    const sgMatch = line.match(/^subgraph\s+(.+)/i);
    if (sgMatch) {
      const sgId = sgMatch[1].trim().replace(/['"]/g, '');
      currentSubgraph = sgId;
      subgraphs.push(sgId);
      continue;
    }

    // Subgraph end
    if (line === 'end') {
      currentSubgraph = null;
      continue;
    }

    // Edge: A -->|"label"| B  or  A --> B  or  A -->|label| B
    const edgeMatch = line.match(
      /^(\w+)\s*(-+>|=+>|-.->|--+>)\s*(?:\|"?([^"|]*)"?\|\s*)?(\w+)\s*$/
    );
    if (edgeMatch) {
      const [, source, , label, target] = edgeMatch;
      rawEdges.push({ source, target, label: label || '' });
      // Register nodes if not already known
      if (!rawNodes[source]) rawNodes[source] = { id: source, label: source };
      if (!rawNodes[target]) rawNodes[target] = { id: target, label: target };
      continue;
    }

    // Node declaration: NodeId["Label"] or NodeId("Label") or NodeId{"Label"} or just NodeId
    const nodeMatch = line.match(/^\s*(\w+)\s*[\[("{\s]*"?([^"\])}]+)"?\s*[\])}]?\s*$/);
    if (nodeMatch) {
      const [, id, label] = nodeMatch;
      if (id.toLowerCase() !== 'end' && id.toLowerCase() !== 'subgraph') {
        rawNodes[id] = { id, label: label.trim() };
        if (currentSubgraph) {
          nodeToSubgraph[id] = currentSubgraph;
        }
      }
    }
  }

  // --- Pass 2: Build React Flow nodes ---
  const g = new dagre.graphlib.Graph({ compound: true });
  g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 100, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  // Add subgraph (group) nodes
  subgraphs.forEach(sg => {
    g.setNode(sg, { width: 280, height: 80 });
  });

  // Add regular nodes
  Object.values(rawNodes).forEach(node => {
    g.setNode(node.id, { width: 200, height: 60 });
    const sg = nodeToSubgraph[node.id];
    if (sg) {
      g.setParent(node.id, sg);
    }
  });

  // Add edges
  rawEdges.forEach(edge => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  // Build React Flow nodes from dagre layout
  const nodes = [];

  // Subgraph group nodes
  subgraphs.forEach(sg => {
    const dgNode = g.node(sg);
    if (!dgNode) return;

    // Find children bounds for sizing
    const children = Object.keys(nodeToSubgraph).filter(k => nodeToSubgraph[k] === sg);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    children.forEach(cId => {
      const cn = g.node(cId);
      if (cn) {
        minX = Math.min(minX, cn.x - cn.width / 2);
        minY = Math.min(minY, cn.y - cn.height / 2);
        maxX = Math.max(maxX, cn.x + cn.width / 2);
        maxY = Math.max(maxY, cn.y + cn.height / 2);
      }
    });

    const padding = 30;
    const headerHeight = 36;

    if (children.length > 0 && minX !== Infinity) {
      nodes.push({
        id: sg,
        type: 'group',
        position: { x: minX - padding, y: minY - padding - headerHeight },
        data: { label: sg },
        style: {
          width: maxX - minX + padding * 2,
          height: maxY - minY + padding * 2 + headerHeight,
          background: 'rgba(7,12,24,.75)',
          border: '1px solid rgba(0,240,180,.15)',
          borderRadius: 12,
          padding: 10,
          fontSize: 11,
          color: 'rgba(0,240,180,.6)',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        },
      });

      // Update children positions relative to group
      children.forEach(cId => {
        const cn = g.node(cId);
        if (cn) {
          cn._relX = cn.x - cn.width / 2 - (minX - padding);
          cn._relY = cn.y - cn.height / 2 - (minY - padding - headerHeight);
        }
      });
    }
  });

  // Regular nodes
  Object.values(rawNodes).forEach(node => {
    const dgNode = g.node(node.id);
    if (!dgNode) return;

    const parentSg = nodeToSubgraph[node.id];
    const isChild = parentSg && subgraphs.includes(parentSg);

    nodes.push({
      id: node.id,
      type: 'awsService',
      position: {
        x: isChild && dgNode._relX != null ? dgNode._relX : dgNode.x - dgNode.width / 2,
        y: isChild && dgNode._relY != null ? dgNode._relY : dgNode.y - dgNode.height / 2,
      },
      data: { label: node.label },
      ...(isChild ? { parentId: parentSg, extent: 'parent' } : {}),
    });
  });

  // Build React Flow edges
  const edges = rawEdges.map((edge, idx) => ({
    id: `e-${edge.source}-${edge.target}-${idx}`,
    source: edge.source,
    target: edge.target,
    label: edge.label || undefined,
    type: 'smoothstep',
    animated: true,
    style: {
      stroke: 'rgba(0,240,180,.55)',
      strokeWidth: 1.5,
    },
    labelStyle: {
      fill: '#eef0f8',
      fontSize: 10,
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 400,
    },
    labelBgStyle: {
      fill: 'rgba(3,5,13,.9)',
      fillOpacity: 0.9,
    },
    labelBgPadding: [6, 4],
    labelBgBorderRadius: 4,
  }));

  return { nodes, edges };
}
