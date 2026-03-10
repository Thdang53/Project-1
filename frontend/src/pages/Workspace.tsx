import { useState, useEffect } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Code2, Send, Play, Upload, BrainCircuit, 
  MessageSquare, Terminal as TerminalIcon, 
  BookOpen, Loader2, CheckCircle2, XCircle, ListChecks, Code
} from "lucide-react";
import ReactMarkdown from "react-markdown"; 
import Editor from "@monaco-editor/react";
import { useAuth } from "../hooks/useAuth";

interface Exercise {
  id: number;
  lessonId: number;
  title: string;
  description: string;
  testCases: string;
  difficulty: string;
}

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

const defaultCode = `# Code của bạn ở đây...
def solve():
  # Viết logic của bạn
  pass
`;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Workspace = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation(); // LẤY DỮ LIỆU ĐƯỢC TRUYỀN SANG TỪ DASHBOARD
  const exerciseId = searchParams.get("id");

  // Kiểm tra xem có code cũ gửi sang không
  const pastCode = location.state?.pastCode;
  const pastLanguage = location.state?.pastLanguage;

  // Nếu có pastCode thì hiển thị code cũ, không thì hiển thị mặc định
  const [language, setLanguage] = useState(pastLanguage || "python");
  const [code, setCode] = useState(pastCode || defaultCode);
  
  const [activeTab, setActiveTab] = useState<"output" | "ai" | "grading">("output");
  const [showChat, setShowChat] = useState(true);
  
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [output, setOutput] = useState(">>> Chờ chạy code...");
  const [isExecuting, setIsExecuting] = useState(false);
  
  const [customInput, setCustomInput] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);

  const [aiFeedback, setAiFeedback] = useState("Nhấn 'Hỏi AI' để nhận phân tích chi tiết về code của bạn.");
  const [isAILoading, setIsAILoading] = useState(false);
  
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", content: "Xin chào! Mình là trợ giảng AI. Đọc kĩ đề bài và bắt đầu code nhé, nếu bí thì cứ hỏi mình!" },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const { user } = useAuth();
  const userEmail = user?.email || "";

  useEffect(() => {
    const fetchUrl = exerciseId 
      ? `${API_BASE_URL}/api/Exercises/${exerciseId}`
      : `${API_BASE_URL}/api/Exercises/first`;

    fetch(fetchUrl)
      .then((res) => res.json())
      .then((data) => {
        if (!data.message) setExercise(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Lỗi:", error);
        setIsLoading(false);
      });
  }, [exerciseId]);

  const handleRunCode = async () => {
    setIsExecuting(true);
    setActiveTab("output");
    setOutput(">>> Đang đưa code vào Sandbox để chạy...");

    try {
      const response = await fetch(`${API_BASE_URL}/api/CodeExecution/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: language, code: code, input: customInput }),
      });
      const data = await response.json();
      setOutput(data.output || "Không có kết quả in ra màn hình.");
    } catch (error) {
      setOutput("Lỗi mất kết nối đến máy chủ Sandbox.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!exercise) return;
    
    setIsSubmitting(true);
    setActiveTab("grading");
    setSubmitResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/CodeExecution/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          language: language, 
          code: code, 
          exerciseId: exercise.id,
          userEmail: userEmail 
        }),
      });
      
      const data = await response.json();
      setSubmitResult(data);
    } catch (error) {
      setSubmitResult({
        status: "Error",
        totalTests: 0,
        passedTests: 0,
        results: [],
        message: "Không thể kết nối đến máy chủ chấm điểm."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAIFeedback = async () => {
    setActiveTab("ai");
    setIsAILoading(true);
    setAiFeedback("Thầy đang đọc code của em... Đợi một chút nhé ⏳");

    try {
      const response = await fetch(`${API_BASE_URL}/api/AIAssistant/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code,
          language: language,
          errorOutput: output.includes("LỖI") ? output : "", 
          userQuestion: ""
        }),
      });
      const data = await response.json();
      setAiFeedback(data.feedback);
    } catch (error) {
      setAiFeedback("Lỗi mất kết nối đến Trợ giảng AI.");
    } finally {
      setIsAILoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/AIAssistant/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code,
          language: language,
          errorOutput: output.includes("LỖI") ? output : "",
          userQuestion: userMsg
        }),
      });
      const data = await response.json();
      setChatMessages(prev => [...prev, { role: "assistant", content: data.feedback }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Lỗi kết nối AI." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-editor">
      <div className="flex h-12 items-center justify-between border-b border-editor-line px-4">
        <div className="flex items-center gap-3">
          <Link to="/student-dashboard" className="flex items-center gap-2 hover:opacity-80 transition">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-primary">
              <Code2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-editor-foreground">Trở về</span>
          </Link>
          <span className="text-editor-foreground/30">|</span>
          <span className="text-sm font-medium text-editor-foreground">
            {exercise ? exercise.title : "Đang tải..."}
          </span>
          <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded ml-2">
            {userEmail || "Chưa đăng nhập"}
          </span>
          
          {/* Thông báo nhỏ nếu đang xem code cũ */}
          {pastCode && (
            <span className="text-xs text-warning bg-warning/10 px-2 py-1 rounded ml-2 font-medium">
              Đang xem bản lưu cũ
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            className="h-8 rounded-md border border-editor-line bg-editor px-2 text-sm text-editor-foreground outline-none"
          >
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="javascript">JavaScript</option>
          </select>

          <Button 
            onClick={handleAIFeedback}
            disabled={isAILoading}
            size="sm" variant="ghost" className="text-editor-foreground/60 hover:text-editor-foreground hover:bg-editor-line h-8"
          >
            {isAILoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin text-primary" /> : <BrainCircuit className="mr-1.5 h-4 w-4 text-primary" />} 
            Hỏi AI
          </Button>
          
          <Button 
            onClick={handleRunCode}
            disabled={isExecuting || isSubmitting}
            size="sm" className="bg-success text-success-foreground hover:bg-success/90 h-8"
          >
            {isExecuting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}
            Chạy code
          </Button>
          
          <Button 
            onClick={handleSubmitCode}
            disabled={isExecuting || isSubmitting || !userEmail}
            title={!userEmail ? "Cần đăng nhập để nộp bài" : ""}
            size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 h-8 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
            Nộp bài
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[30%] min-w-[300px] border-r border-editor-line flex flex-col">
          <div className={`${showChat ? "flex-1" : "flex-[2]"} overflow-auto p-5 border-b border-editor-line`}>
            <div className="flex items-center gap-2 text-primary mb-4">
              <BookOpen className="h-5 w-5" />
              <h2 className="font-semibold text-editor-foreground">Đề bài</h2>
            </div>
            <div className="space-y-4 text-sm text-editor-foreground/80 leading-relaxed">
              {isLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-editor-line rounded w-3/4"></div>
                </div>
              ) : exercise ? (
                <div className="prose prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{exercise.description}</p>
                </div>
              ) : (
                <p className="text-destructive">Không tìm thấy dữ liệu bài tập.</p>
              )}
            </div>
          </div>

          {showChat && (
            <div className="flex-1 flex flex-col min-h-[250px]">
              <div className="flex items-center justify-between px-4 py-2 border-b border-editor-line">
                <div className="flex items-center gap-2 text-sm font-medium text-editor-foreground">
                  <MessageSquare className="h-4 w-4 text-primary" /> Chat với AI
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-3">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-editor-line text-editor-foreground"
                    }`}>
                      {msg.role === "assistant" ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-editor-line text-editor-foreground rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" /> AI đang gõ...
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-editor-line">
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Hỏi AI về đoạn code..."
                    className="flex-1 rounded-lg bg-editor-line px-3 py-2 text-sm text-editor-foreground placeholder:text-editor-foreground/30 outline-none focus:ring-1 focus:ring-primary"
                  />
                  <Button onClick={handleSendMessage} disabled={isChatLoading} size="sm" className="bg-gradient-primary text-primary-foreground h-9 w-9 p-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col bg-[#1e1e1e]">
          <Editor
            height="100%"
            language={language === "cpp" ? "cpp" : language}
            theme="vs-dark"
            value={code}
            onChange={(v: string | undefined) => setCode(v || "")}
            options={{ fontSize: 14, minimap: { enabled: false } }}
          />
        </div>

        <div className="w-[30%] min-w-[300px] border-l border-editor-line flex flex-col">
          <div className="flex border-b border-editor-line">
            <button
              onClick={() => setActiveTab("output")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "output" ? "text-primary border-b-2 border-primary" : "text-editor-foreground/40"
              }`}
            >
              <TerminalIcon className="h-4 w-4" /> Output
            </button>
            <button
              onClick={() => setActiveTab("grading")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "grading" ? "text-success border-b-2 border-success" : "text-editor-foreground/40"
              }`}
            >
              <ListChecks className="h-4 w-4" /> Chấm điểm
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "ai" ? "text-primary border-b-2 border-primary" : "text-editor-foreground/40"
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
                    placeholder="Nhập dữ liệu vào đây nếu code của bạn dùng hàm input()..."
                    className="w-full h-24 bg-background border border-editor-line rounded-md p-2 text-sm font-mono text-editor-foreground focus:outline-none focus:border-primary/50 resize-none"
                  />
                </div>
              </>
            )}
            
            {activeTab === "grading" && (
              <div className="space-y-4">
                {!submitResult && !isSubmitting && (
                  <p className="text-sm text-editor-foreground/60 text-center mt-10">Bấm nút "Nộp bài" để hệ thống chấm điểm code của bạn.</p>
                )}
                
                {isSubmitting && (
                  <div className="flex flex-col items-center justify-center space-y-3 mt-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-editor-foreground/80">Hệ thống đang chạy Test Case...</p>
                  </div>
                )}

                {submitResult && submitResult.message && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {submitResult.message}
                  </div>
                )}

                {submitResult && !submitResult.message && (
                  <>
                    <div className={`p-4 rounded-lg border ${submitResult.status === 'Accepted' ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'}`}>
                      <h3 className={`text-lg font-bold ${submitResult.status === 'Accepted' ? 'text-success' : 'text-destructive'}`}>
                        {submitResult.status === 'Accepted' ? 'Hoàn thành xuất sắc!' : 'Sai kết quả'}
                      </h3>
                      <p className="text-sm text-editor-foreground/80 mt-1">
                        Vượt qua: <span className="font-bold">{submitResult.passedTests}/{submitResult.totalTests}</span> Test Cases
                      </p>
                    </div>

                    <div className="space-y-2">
                      {submitResult.results.map((tc) => (
                        <div key={tc.id} className="p-3 rounded-md border border-editor-line bg-editor/50">
                          <div className="flex items-center gap-2 mb-2">
                            {tc.passed ? (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                            <span className="text-sm font-semibold text-editor-foreground">Test Case {tc.id}</span>
                          </div>
                          
                          {!tc.passed && (
                            <div className="text-xs space-y-1.5 mt-2 bg-background p-2 rounded border border-editor-line font-mono">
                              <div className="text-editor-foreground/60">Đầu vào (Input):</div>
                              <div className="text-editor-foreground">{tc.input || "Không có"}</div>
                              
                              <div className="text-editor-foreground/60 mt-2">Kết quả mong đợi:</div>
                              <div className="text-success">{tc.expectedOutput}</div>
                              
                              <div className="text-editor-foreground/60 mt-2">Code của bạn in ra:</div>
                              <div className="text-destructive whitespace-pre-wrap">{tc.actualOutput || "Không in ra gì cả"}</div>
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
              <div className="text-sm text-editor-foreground/80 prose prose-invert max-w-none">
                <ReactMarkdown>{aiFeedback}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workspace;