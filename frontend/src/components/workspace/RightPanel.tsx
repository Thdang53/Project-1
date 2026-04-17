import { Terminal as TerminalIcon, ListChecks, BrainCircuit, Code, Loader2, CheckCircle2, XCircle, Flag, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface TestCaseResult {
  id: number;
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
}

interface SubmitResponse {
  status: string;
  totalTests: number;
  passedTests: number;
  results: TestCaseResult[];
  message?: string;
}

interface RightPanelProps {
  activeTab: "output" | "grading" | "ai";
  setActiveTab: (tab: "output" | "grading" | "ai") => void;
  output: string;
  customInput: string;
  setCustomInput: (input: string) => void;
  isSubmitting: boolean;
  submitResult: SubmitResponse | null;
  aiFeedback: string;
  isAILoading: boolean;
  defaultAiFeedback: string;
  MarkdownComponents: any;
  // 🚀 CẬP NHẬT INTERFACE: Chỉ cần nhận 1 tham số là Nội dung AI gốc
  handleReportAI: (originalAIResponse: string) => void;
  exerciseId: number; 
  userEmail: string;
  token: string; 
}

const RightPanel = ({
  activeTab,
  setActiveTab,
  output,
  customInput,
  setCustomInput,
  isSubmitting,
  submitResult,
  aiFeedback,
  isAILoading,
  defaultAiFeedback,
  MarkdownComponents,
  handleReportAI,
  exerciseId,
  userEmail,
  token 
}: RightPanelProps) => {
  
  const [isAnalyzingBigO, setIsAnalyzingBigO] = useState(false);
  const [bigOReport, setBigOReport] = useState<string | null>(null);

  const handleAnalyzeBigO = async () => {
      setIsAnalyzingBigO(true);
      setBigOReport(null);

      try {
          const response = await fetch(`${API_BASE_URL}/api/AIAssistant/analyze-big-o`, {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}` 
              },
              body: JSON.stringify({ UserEmail: userEmail, ExerciseId: exerciseId })
          });

          const data = await response.json();
          
          if (data.success) {
              setBigOReport(data.report);
          } else {
              toast({ title: "Lỗi AI Phân tích", description: data.message, variant: "destructive" });
          }
      } catch (error) {
          toast({ title: "Lỗi kết nối", description: "Không thể gọi Giám khảo AI lúc này.", variant: "destructive" });
      } finally {
          setIsAnalyzingBigO(false);
      }
  };

  return (
    <div className="w-[30%] min-w-[300px] border-l border-editor-line flex flex-col relative">
      <div className="flex border-b border-editor-line">
        <button
          onClick={() => setActiveTab("output")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "output" ? "text-primary border-b-2 border-primary" : "text-editor-foreground/40 hover:text-editor-foreground/60"
          }`}
        >
          <TerminalIcon className="h-4 w-4" /> Output
        </button>
        <button
          onClick={() => setActiveTab("grading")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "grading" ? "text-success border-b-2 border-success" : "text-editor-foreground/40 hover:text-editor-foreground/60"
          }`}
        >
          <ListChecks className="h-4 w-4" /> Chấm điểm
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "ai" ? "text-primary border-b-2 border-primary" : "text-editor-foreground/40 hover:text-editor-foreground/60"
          }`}
        >
          <BrainCircuit className="h-4 w-4" /> AI Feedback
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 flex flex-col">
        {activeTab === "output" && (
          <>
            <pre className="font-mono text-sm text-editor-foreground/80 whitespace-pre-wrap flex-1">{output}</pre>
            
            <div className="mt-4 pt-4 border-t border-editor-line">
              <label className="flex items-center gap-2 text-xs font-semibold text-editor-foreground/70 mb-2">
                <Code className="h-3.5 w-3.5" /> Dữ liệu đầu vào (Custom Input)
              </label>
              <textarea 
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Dùng khi code có hàm input()..."
                className="w-full h-24 bg-editor-line border-none rounded-md p-2 text-sm font-mono text-editor-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
              />
            </div>
          </>
        )}

        {activeTab === "grading" && (
           <div className="space-y-4">
             {!submitResult && !isSubmitting && (
               <p className="text-sm text-editor-foreground/60 text-center mt-10">Nhấn nút Nộp bài để xem điểm.</p>
             )}
             {isSubmitting && (
                <div className="flex flex-col items-center mt-10 space-y-3">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-sm text-editor-foreground/80">Đang chạy Test Case...</span>
                </div>
             )}
             {submitResult && submitResult.message && (
                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded">{submitResult.message}</p>
             )}
             {submitResult && !submitResult.message && (
                <>
                   <div className={`p-4 rounded border ${submitResult.status === 'Accepted' ? 'bg-success/10 border-success/30 text-success' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
                       <h3 className="font-bold">{submitResult.status === 'Accepted' ? 'Thành công!' : 'Sai kết quả'}</h3>
                       <p className="text-sm opacity-90 mt-1">Vượt qua: {submitResult.passedTests}/{submitResult.totalTests} Tests</p>
                   </div>

                   {submitResult.status === 'Accepted' && (
                       <div className="mt-4 p-3 rounded-lg border border-purple-500/30 bg-purple-500/5">
                           <p className="text-xs text-editor-foreground/80 mb-2 font-medium">Bạn có muốn xem thuật toán của mình đã tối ưu nhất chưa?</p>
                           <button 
                               onClick={handleAnalyzeBigO}
                               disabled={isAnalyzingBigO}
                               className="w-full py-2 px-3 text-sm font-bold rounded-md bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                           >
                               {isAnalyzingBigO ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse"/>}
                               {isAnalyzingBigO ? "AI Đang chấm độ phức tạp..." : "AI Soi Chuẩn Big-O"}
                           </button>

                           {bigOReport && (
                               <div className="mt-4 pt-3 border-t border-purple-500/20 prose prose-sm prose-invert max-w-none text-[13px] leading-relaxed">
                                   <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                                       {bigOReport}
                                   </ReactMarkdown>
                               </div>
                           )}
                       </div>
                   )}

                   <div className="space-y-2 mt-4">
                       {submitResult.results.map(tc => (
                           <div key={tc.id} className="p-3 bg-editor-line rounded text-sm">
                               <div className="flex items-center gap-2 font-bold text-editor-foreground">
                                   {tc.passed ? <CheckCircle2 className="h-4 w-4 text-success"/> : <XCircle className="h-4 w-4 text-destructive"/>}
                                   Test Case {tc.id}
                               </div>
                               {!tc.passed && (
                                   <div className="mt-2 text-xs font-mono bg-editor p-2 rounded">
                                       <p className="opacity-50 text-editor-foreground">Input:</p>
                                       <p className="mb-2 text-editor-foreground">{tc.input}</p>
                                       <p className="text-success opacity-80">Expected:</p>
                                       <p className="mb-2 text-success">{tc.expectedOutput}</p>
                                       <p className="text-destructive opacity-80">Your Output:</p>
                                       <p className="text-destructive">{tc.actualOutput}</p>
                                   </div>
                               )}
                           </div>
                       ))}
                   </div>
                </>
             )}
           </div>
        )}

        {activeTab === "ai" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 space-y-4 text-sm prose prose-sm prose-invert max-w-none text-editor-foreground/80">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                  {aiFeedback}
              </ReactMarkdown>
            </div>
            
            {/* 🚀 ĐƠN GIẢN HÓA: Chỉ gọi thẳng hàm handleReportAI mà file cha truyền xuống */}
            {!isAILoading && aiFeedback !== defaultAiFeedback && (
              <div className="mt-4 pt-4 border-t border-editor-line/50 opacity-80 hover:opacity-100 transition-opacity flex justify-start">
                <button
                  onClick={() => handleReportAI(aiFeedback)}
                  className="text-[12px] flex items-center gap-1.5 text-orange-400 bg-orange-400/10 hover:bg-orange-400/20 px-3 py-1.5 rounded-md font-medium transition-colors"
                  title="Gửi yêu cầu hỗ trợ đến giảng viên"
                >
                  <Flag className="w-3.5 h-3.5" /> Cần giảng viên hỗ trợ
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RightPanel;