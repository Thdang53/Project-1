import dagre from 'dagre';

export type LayoutDirection = 'TB' | 'LR';

const nodeWidth = 250;
const nodeHeight = 80;

export const getLayoutedElements = (nodes: any[], edges: any[], direction: LayoutDirection = 'TB') => {
  // Nếu AI không trả về node nào thì dừng luôn, tránh crash
  if (!nodes || nodes.length === 0) return { nodes: [], edges: [] };
  
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 80 });

  // Ép toàn bộ ID thành chuỗi (string) vì AI hay trả về số
  const safeNodes = nodes.map(n => ({ ...n, id: String(n.id) }));
  
  safeNodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  // 💡 BỘ LỌC THẦN THÁNH: Chỉ giữ lại dây nối (Edges) nếu cả 2 đầu của nó đều có thật
  const safeEdges = (edges || []).map(e => ({
    ...e,
    id: String(e.id || Math.random()),
    source: String(e.source),
    target: String(e.target)
  })).filter(e => 
    safeNodes.some(n => n.id === e.source) && 
    safeNodes.some(n => n.id === e.target)
  );

  safeEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  try {
    // Chạy thuật toán
    dagre.layout(dagreGraph);
  } catch (error) {
    console.error("Lỗi thuật toán Dagre:", error);
    return { nodes: safeNodes, edges: safeEdges };
  }

  const layoutedNodes = safeNodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    if (!nodeWithPosition) return node;

    return {
      ...node,
      targetPosition: direction === 'TB' ? 'top' : 'left',
      sourcePosition: direction === 'TB' ? 'bottom' : 'right',
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges: safeEdges };
};