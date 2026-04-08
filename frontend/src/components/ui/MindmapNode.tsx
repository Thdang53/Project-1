import { Handle, Position } from '@xyflow/react';
import { Brain, Sparkles, BookOpen } from 'lucide-react';

export default function MindmapNode({ data }: any) {
  // Nếu level = 1 (Chủ đề chính) thì đổi màu rực rỡ, level khác thì màu trắng
  const isRoot = data.level === 1;

  return (
    <div className={`px-5 py-3 shadow-md rounded-xl border-2 min-w-[200px] transition-all duration-300 hover:shadow-lg ${
      isRoot ? 'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-300 text-white' : 'bg-white/90 backdrop-blur-sm border-slate-200 text-slate-800'
    }`}>
      {/* Điểm nối dây đầu vào */}
      {!isRoot && <Handle type="target" position={Position.Top} className="w-3 h-3 border-2 border-white bg-slate-400" />}
      
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isRoot ? 'bg-white/20' : 'bg-indigo-100 text-indigo-600'}`}>
          {isRoot ? <Brain className="w-5 h-5" /> : (data.level === 2 ? <BookOpen className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />)}
        </div>
        <div>
          <h3 className={`font-bold text-sm ${isRoot ? 'text-white' : 'text-slate-800'}`}>
            {data.label || 'Chưa có tên'}
          </h3>
        </div>
      </div>

      {/* Điểm nối dây đầu ra */}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 border-2 border-white bg-indigo-500" />
    </div>
  );
}