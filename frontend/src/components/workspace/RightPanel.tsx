import { Terminal as TerminalIcon, ListChecks, BrainCircuit, Code, Loader2, CheckCircle2, XCircle, Flag } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  handleReportAI: (originalAIResponse: string) => void;
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
  handleReportAI
}: RightPanelProps) => {
  return (
    <div className="w-[30%] min-w-[300px] border-l border-editor-line flex flex-col">
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
                    <span className="text-sm">Đang chạy Test Case...</span>
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
                   <div className="space-y-2 mt-4">
                       {submitResult.results.map(tc => (
                           <div key={tc.id} className="p-3 bg-editor-line rounded text-sm">
                               <div className="flex items-center gap-2 font-bold">
                                   {tc.passed ? <CheckCircle2 className="h-4 w-4 text-success"/> : <XCircle className="h-4 w-4 text-destructive"/>}
                                   Test Case {tc.id}
                               </div>
                               {!tc.passed && (
                                   <div className="mt-2 text-xs font-mono bg-editor p-2 rounded">
                                       <p className="opacity-50">Input:</p>
                                       <p className="mb-2">{tc.input}</p>
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
            
            {!isAILoading && aiFeedback !== defaultAiFeedback && (
              <div className="mt-4 pt-4 border-t border-editor-line/50 opacity-80 hover:opacity-100 transition-opacity flex justify-start">
                <button
                  onClick={() => handleReportAI(aiFeedback)}
                  className="text-[12px] flex items-center gap-1.5 text-orange-400 bg-orange-400/10 hover:bg-orange-400/20 px-3 py-1.5 rounded-md font-medium transition-colors"
                  title="Báo cáo AI phân tích chưa chính xác"
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