import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type DefaultEdgeOptions,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ZoomIn, ZoomOut, Maximize, ArrowDownUp, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

import MindmapNode from './MindmapNode';
import { getLayoutedElements, type LayoutDirection } from './useAutoLayout';

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: 'default',
  style: { stroke: '#94a3b8', strokeWidth: 2 },
  animated: true, // Hiệu ứng dây chuyền dữ liệu chạy chạy
};

function MindmapCanvas({ initialNodes, initialEdges }: { initialNodes: any[], initialEdges: any[] }) {
  const [direction, setDirection] = useState<LayoutDirection>('TB');
  
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(initialNodes, initialEdges, direction),
    [initialNodes, initialEdges, direction]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const nodeTypes = useMemo(() => ({ mindmap: MindmapNode }), []);

  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges, fitView]);

  const handleRelayout = useCallback((dir: LayoutDirection) => {
    setDirection(dir);
  }, []);

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }} // Ẩn logo ReactFlow
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={2} color="#cbd5e1" />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="!bg-white/90 !backdrop-blur-sm !border !border-slate-200 !rounded-xl !shadow-md"
        />
      </ReactFlow>

      {/* Thanh công cụ nổi */}
      <div className="absolute top-4 right-4 flex flex-col gap-1 bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl p-1.5 shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => zoomIn({ duration: 200 })}>
          <ZoomIn className="w-4 h-4 text-slate-700" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => zoomOut({ duration: 200 })}>
          <ZoomOut className="w-4 h-4 text-slate-700" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => fitView({ padding: 0.2, duration: 400 })}>
          <Maximize className="w-4 h-4 text-slate-700" />
        </Button>
        <div className="h-px bg-slate-200 mx-1 my-1" />
        <Button variant="ghost" size="icon" className={direction === 'TB' ? 'bg-indigo-50 text-indigo-600' : ''} onClick={() => handleRelayout('TB')}>
          <ArrowDownUp className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className={direction === 'LR' ? 'bg-indigo-50 text-indigo-600' : ''} onClick={() => handleRelayout('LR')}>
          <ArrowRightLeft className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Đây là cái thẻ chính để sếp gọi ở file AILesson.tsx
export default function KnowledgeGraph({ nodes, edges }: { nodes: any[], edges: any[] }) {
  if (!nodes || nodes.length === 0) return null; // Nếu chưa có dữ liệu thì không render gì cả

  return (
    <div className="w-full h-[600px] rounded-2xl border border-slate-200 bg-slate-50 shadow-inner overflow-hidden">
      <ReactFlowProvider>
        <MindmapCanvas initialNodes={nodes} initialEdges={edges} />
      </ReactFlowProvider>
    </div>
  );
}