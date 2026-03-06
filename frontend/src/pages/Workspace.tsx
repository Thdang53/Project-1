import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Code2, Send, Play, Upload, BrainCircuit, ChevronRight, MessageSquare, Terminal as TerminalIcon, BookOpen, X, Loader2 } from "lucide-react";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown"; // Import thư viện render Markdown

interface Exercise {
  id: number;
  lessonId: number;
  title: string;
  description: string;
  testCases: string;
  difficulty: string;
}

const defaultCode = `# Code của bạn ở đây...
for i in range(10)
  print('Thieu dau hai cham roi')
`;

const Workspace = () => {
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(defaultCode);
  const [activeTab, setActiveTab] = useState<"output" | "ai">("output");
  const [showChat, setShowChat] = useState(true);
  
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // States cho việc chạy code
  const [output, setOutput] = useState(">>> Chờ chạy code...");
  const [isExecuting, setIsExecuting] = useState(false);

  // States cho tính năng AI
  const [aiFeedback, setAiFeedback] = useState("Nhấn 'Hỏi AI' để nhận phân tích chi tiết về code của bạn.");
  const [isAILoading, setIsAILoading] = useState(false);
  
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", content: "Xin chào! Mình là trợ giảng AI. Đọc kĩ đề bài và bắt đầu code nhé, nếu bí thì cứ hỏi mình!" },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    fetch("http://localhost:5043/api/Exercises/first")
      .then((res) => res.json())
      .then((data) => {
        if (!data.message) setExercise(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Lỗi:", error);
        setIsLoading(false);
      });
  }, []);

  // 1. Hàm Chạy Code
  const handleRunCode = async () => {
    setIsExecuting(true);
    setActiveTab("output");
    setOutput(">>> Đang đưa code vào Sandbox để chạy...");

    try {
      const response = await fetch("http://localhost:5043/api/CodeExecution/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: language, code: code, input: "" }),
      });
      const data = await response.json();
      setOutput(data.output || "Không có kết quả in ra màn hình.");
    } catch (error) {
      setOutput("Lỗi mất kết nối đến máy chủ Sandbox.");
    } finally {
      setIsExecuting(false);
    }
  };

  // 2. Hàm gọi AI Phân tích Code (Nút Hỏi AI)
  const handleAIFeedback = async () => {
    setActiveTab("ai");
    setIsAILoading(true);
    setAiFeedback("Thầy đang đọc code của em... Đợi một chút nhé ⏳");

    try {
      const response = await fetch("http://localhost:5043/api/AIAssistant/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code,
          language: language,
          errorOutput: output.includes("LỖI") ? output : "", // Gửi kèm lỗi màn hình đen nếu có
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

  // 3. Hàm Chat với AI
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await fetch("http://localhost:5043/api/AIAssistant/analyze", {
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
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-primary">
              <Code2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-editor-foreground">CodeAI</span>
          </Link>
          <span className="text-editor-foreground/30">|</span>
          <span className="text-sm text-editor-foreground/60">
            {exercise ? exercise.title : "Đang tải..."}
          </span>
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

          {/* Nút Hỏi AI */}
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
            disabled={isExecuting}
            size="sm" className="bg-success text-success-foreground hover:bg-success/90 h-8"
          >
            {isExecuting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}
            Chạy code
          </Button>
          <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 h-8">
            <Upload className="mr-1.5 h-4 w-4" /> Nộp bài
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* CỘT TRÁI: Đề bài & Chat */}
        <div className="w-[30%] min-w-[300px] border-r border-editor-line flex flex-col">
          <div className={`${showChat ? "flex-1" : "flex-[2]"} overflow-auto p-5 border-b border-editor-line`}>
            <div className="flex items-center gap-2 text-primary mb-4">
              <BookOpen className="h-5 w-5" />
              <h2 className="font-semibold text-editor-foreground">Nội dung thực hành</h2>
            </div>
            <div className="space-y-4 text-sm text-editor-foreground/80 leading-relaxed">
              {isLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-editor-line rounded w-3/4"></div>
                </div>
              ) : exercise ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-primary flex items-center gap-1.5">
                      <ChevronRight className="h-4 w-4" /> Đề bài
                    </h3>
                  </div>
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

        {/* CỘT GIỮA: Editor */}
        <div className="flex-1 flex flex-col">
          <Editor
            height="100%"
            language={language === "cpp" ? "cpp" : language}
            theme="vs-dark"
            value={code}
            onChange={(v) => setCode(v || "")}
            options={{ fontSize: 14, minimap: { enabled: false } }}
          />
        </div>

        {/* CỘT PHẢI: Output & AI Feedback */}
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
              onClick={() => setActiveTab("ai")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "ai" ? "text-primary border-b-2 border-primary" : "text-editor-foreground/40"
              }`}
            >
              <BrainCircuit className="h-4 w-4" /> AI Feedback
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {activeTab === "output" ? (
              <pre className="font-mono text-sm text-editor-foreground/80 whitespace-pre-wrap">{output}</pre>
            ) : (
              <div className="text-sm text-editor-foreground/80 prose prose-invert max-w-none">
                {/* Render Markdown cực đẹp ở đây */}
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