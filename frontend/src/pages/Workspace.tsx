import { useState, useEffect, Fragment } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; 
import { 
  Code2, Send, Play, Upload, BrainCircuit, 
  MessageSquare, Terminal as TerminalIcon, 
  BookOpen, Loader2, CheckCircle2, XCircle, ListChecks, Code, X,
  Maximize2, Minimize2, Heart // 💡 Import thêm icon Heart
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { useAuth } from "../hooks/useAuth";

import ReactMarkdown from "react-markdown"; 
import remarkGfm from "remark-gfm"; 
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"; 

interface Exercise {
  id: number;
  lessonId: number;
  title: string;
  description: string;
  testCases: string;
  difficulty: string;
  starterCode?: string; 
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

const defaultTemplates: Record<string, string> = {
  python: `# Code Python của bạn ở đây...\ndef solve():\n  # Viết logic của bạn\n  pass\n`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n  // Code C++ của bạn ở đây...\n  \n  return 0;\n}\n`,
  java: `import java.util.Scanner;\n\npublic class Main {\n  public static void main(String[] args) {\n    // Code Java của bạn ở đây...\n    \n  }\n}\n`,
  javascript: `// Code JavaScript của bạn ở đây...\nfunction solve() {\n  // Viết logic của bạn\n  \n}\n`
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// =================================================================
// 💡 CẤU HÌNH VẼ MARKDOWN & TÔ MÀU CODE
// =================================================================
const MarkdownComponents = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
      <div className="relative group my-4">
        <div className="absolute right-2 top-2 text-xs font-mono text-editor-foreground/40 bg-editor-line px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity uppercase z-10">
          {match[1]}
        </div>
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          className="rounded-lg border border-editor-line !bg-[#1e1e1e] !p-4 !my-0 shadow-inner font-mono text-sm leading-relaxed"
          {...props}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code className="bg-editor-line text-primary rounded px-1.5 py-0.5 font-mono text-sm" {...props}>
        {children}
      </code>
    );
  },
  p: ({children}: any) => <p className="mb-4 last:mb-0 leading-relaxed text-editor-foreground/90">{children}</p>,
  h1: ({children}: any) => <h1 className="text-xl font-bold text-primary mb-4 mt-6">{children}</h1>,
  h2: ({children}: any) => <h2 className="text-lg font-bold text-primary mb-3 mt-5">{children}</h2>,
  h3: ({children}: any) => <h3 className="font-semibold text-editor-foreground mb-2 mt-4">{children}</h3>,
  ul: ({children}: any) => <ul className="list-disc pl-6 mb-4 space-y-1 text-editor-foreground/80">{children}</ul>,
  ol: ({children}: any) => <ol className="list-decimal pl-6 mb-4 space-y-1 text-editor-foreground/80">{children}</ol>,
  li: ({children}: any) => <li className="leading-relaxed">{children}</li>,
  strong: ({children}: any) => <strong className="font-bold text-editor-foreground">{children}</strong>,
  blockquote: ({children}: any) => <blockquote className="border-l-4 border-primary/50 pl-4 italic text-editor-foreground/60 my-4 bg-editor-line/30 py-2 rounded-r">{children}</blockquote>,
};

const Workspace = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const exerciseId = searchParams.get("id") || location.pathname.split('/').pop();

  const pastCode = location.state?.pastCode;
  const pastLanguage = location.state?.pastLanguage;
  
  const isAIGenerated = location.state?.isAIGenerated;
  const aiExerciseData = location.state?.exerciseData;

  const draftKey = `draft_code_exercise_${exerciseId}`;
  const savedDraft = exerciseId ? localStorage.getItem(draftKey) : null;

  const [language, setLanguage] = useState(pastLanguage || "python");
  const [code, setCode] = useState(pastCode || savedDraft || defaultTemplates[pastLanguage || "python"]);
  
  const [activeTab, setActiveTab] = useState<"output" | "grading" | "ai">("output");
  const [showChat, setShowChat] = useState(true);
  
  // 💡 STATE ĐỂ QUẢN LÝ VIỆC PHÓNG TO CHAT
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  
  // 💡 STATE QUẢN LÝ VIỆC LƯU BÀI
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [output, setOutput] = useState(">>> Chờ chạy code...");
  const [isExecuting, setIsExecuting] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);

  const [aiFeedback, setAiFeedback] = useState("Nhấn 'Hỏi AI' ở góc trên để nhận phân tích chi tiết về code của bạn nhé.");
  const [isAILoading, setIsAILoading] = useState(false);
  
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", content: "Xin chào! Mình là trợ giảng AI. Bạn cần hỗ trợ gì về bài tập này?" },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [cooldown, setCooldown] = useState(0);

  const { user, token } = useAuth();
  const userEmail = user?.email || "";

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    const isDefaultCode = Object.values(defaultTemplates).includes(code);
    if (exerciseId && !isDefaultCode && code.trim() !== "") {
      localStorage.setItem(`draft_code_exercise_${exerciseId}`, code);
    }
  }, [code, exerciseId]);

  useEffect(() => {
    if (isAIGenerated && aiExerciseData) {
      const exTitle = aiExerciseData.title || aiExerciseData.Title || "Bài tập AI";
      const exDesc = aiExerciseData.description || aiExerciseData.Description || "Không có mô tả";
      const exDiff = aiExerciseData.difficulty || aiExerciseData.Difficulty || "Cơ bản";
      const exTests = aiExerciseData.testCases || aiExerciseData.TestCases || [];
      const exStarterCode = aiExerciseData.starterCode || aiExerciseData.StarterCode || "";

      setExercise({
        id: Number(exerciseId),
        lessonId: 0,
        title: exTitle,
        description: exDesc,
        difficulty: exDiff,
        testCases: JSON.stringify(exTests),
        starterCode: exStarterCode
      });
      
      if (!savedDraft && !pastCode && exStarterCode) {
        setCode(exStarterCode);
      }
      setIsLoading(false);
    } else {
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
    }
  }, [exerciseId, isAIGenerated, aiExerciseData, savedDraft, pastCode]);

  const handleLanguageChange = (newLang: string) => {
    const isDefaultCode = Object.values(defaultTemplates).includes(code);
    const isStarterCode = exercise?.starterCode === code;
    
    setLanguage(newLang);
    
    if (isDefaultCode || isStarterCode || code.trim() === "") {
      setCode(defaultTemplates[newLang]);
    }
  };

  const handleRunCode = async () => {
    setIsExecuting(true);
    setActiveTab("output");
    setOutput(">>> Đang đưa code vào Sandbox để chạy...\n");

    try {
      const response = await fetch(`${API_BASE_URL}/api/CodeExecution/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ language: language, code: code, input: customInput }),
      });
      const data = await response.json();
      setOutput(data.output || "Chương trình chạy thành công nhưng không có kết quả in ra màn hình.");
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

    if (isAIGenerated) {
      try {
        const testCases = JSON.parse(exercise.testCases || "[]");
        let passedCount = 0;
        const results = [];

        for (let i = 0; i < testCases.length; i++) {
          const tc = testCases[i];
          const runRes = await fetch(`${API_BASE_URL}/api/CodeExecution/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ language, code, input: tc.Input || tc.input || "" })
          });
          const runData = await runRes.json();
          const actualOutput = (runData.output || "").trim();
          const expectedOutput = (tc.ExpectedOutput || tc.expectedOutput || "").trim();
          
          const isPassed = actualOutput === expectedOutput;
          if (isPassed) passedCount++;

          results.push({
            id: i + 1,
            passed: isPassed,
            input: tc.Input || tc.input || "",
            expectedOutput: expectedOutput,
            actualOutput: actualOutput
          });
        }

        setSubmitResult({
          status: passedCount === testCases.length ? "Accepted" : "Wrong Answer",
          totalTests: testCases.length,
          passedTests: passedCount,
          results: results
        });
      } catch (e) {
        setSubmitResult({ status: "Error", totalTests: 0, passedTests: 0, results: [], message: "Lỗi chạy Test Case" });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/CodeExecution/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ language: language, code: code, exerciseId: exercise.id, userEmail: userEmail }),
      });
      const data = await response.json();
      setSubmitResult(data);

      if (data.status === 'Accepted' && exerciseId) {
        localStorage.removeItem(`draft_code_exercise_${exerciseId}`);
      }
    } catch (error) {
      setSubmitResult({ status: "Error", totalTests: 0, passedTests: 0, results: [], message: "Lỗi chấm điểm." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAIFeedback = async () => {
    if (cooldown > 0) return; 
    
    setActiveTab("ai");
    setIsAILoading(true);
    setAiFeedback("Đang đọc code của bạn... Đợi AI một chút nhé ⏳");

    let fullText = ""; 
    let displayedText = ""; 
    let isStreamActive = true; 

    const typeInterval = setInterval(() => {
      if (displayedText.length < fullText.length) {
        displayedText += fullText.slice(displayedText.length, displayedText.length + 2);
        setAiFeedback(displayedText);
      } else if (!isStreamActive) {
        clearInterval(typeInterval);
      }
    }, 15);

    try {
      const response = await fetch(`${API_BASE_URL}/api/AIAssistant/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          code: code,
          language: language,
          errorOutput: output.includes("LỖI") ? output : "", 
          userQuestion: "",
          exerciseTitle: exercise?.title || "",
          exerciseDescription: exercise?.description || ""
        }),
      });

      if (!response.ok) throw new Error("Lỗi API");
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim() === "") continue;
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                fullText += data.text;
              } catch (e) { }
            }
          }
        }
      }
    } catch (error) {
      fullText = "Lỗi mất kết nối đến Trợ giảng AI.";
    } finally {
      setIsAILoading(false);
      isStreamActive = false; 
      setCooldown(10); 
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || cooldown > 0) return; 
    
    const userMsg = chatInput;
    const currentHistory = [...chatMessages];

    setChatMessages(prev => [...prev, { role: "user", content: userMsg }, { role: "assistant", content: "" }]);
    setChatInput("");
    setIsChatLoading(true);

    let fullText = ""; 
    let displayedText = ""; 
    let isStreamActive = true;

    const typeInterval = setInterval(() => {
      if (displayedText.length < fullText.length) {
        displayedText += fullText.slice(displayedText.length, displayedText.length + 2);
        setChatMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = displayedText;
          return newMsgs;
        });
      } else if (!isStreamActive) {
        clearInterval(typeInterval);
      }
    }, 15);

    try {
      const response = await fetch(`${API_BASE_URL}/api/AIAssistant/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          code: code,
          language: language,
          errorOutput: output.includes("LỖI") ? output : "",
          userQuestion: userMsg,
          exerciseTitle: exercise?.title || "",
          exerciseDescription: exercise?.description || "",
          chatHistory: currentHistory
        }),
      });

      if (!response.ok) throw new Error("Lỗi API");
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      if (reader) {
        setIsChatLoading(false); 
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim() === "") continue;
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                fullText += data.text; 
              } catch (e) {}
            }
          }
        }
      }
    } catch (error) {
      fullText = "Lỗi kết nối AI.";
    } finally {
      setIsChatLoading(false);
      isStreamActive = false; 
      setCooldown(10);
    }
  };

  // 💡 HÀM GỌI API LƯU BÀI TẬP VÀO DATABASE
  const handleSaveExercise = async () => {
    if (!userEmail || !exercise) return;
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/SavedAI/save`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({
          userEmail: userEmail,
          title: exercise.title,
          description: exercise.description,
          difficulty: exercise.difficulty || "Cơ bản",
          language: language,
          starterCode: exercise.starterCode || "",
          testCases: exercise.testCases,
          contentType: "Exercise"
        })
      });

      if (response.ok) {
        setIsSaved(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-editor">
      {/* Top bar */}
      <div className="flex h-12 items-center justify-between border-b border-editor-line px-4">
        <div className="flex items-center gap-3">
          <Link to="/student-dashboard" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-primary">
              <Code2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-editor-foreground">AI Learning Hub</span>
          </Link>
          <span className="text-editor-foreground/30">|</span>
          <span className="text-sm text-editor-foreground/60 flex items-center gap-1.5">
            <span className="uppercase text-primary font-mono text-xs">{language}</span> 
            — Bài tập: {exercise ? exercise.title : "Đang tải..."}
          </span>
          {isAIGenerated && (
             <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5 px-1.5 py-0 rounded ml-2">AI GENERATED</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          
          {/* 💡 NÚT LƯU BÀI TẬP (Chỉ hiện khi là bài AI sinh ra) */}
          {isAIGenerated && userEmail && (
            <Button 
              onClick={handleSaveExercise} 
              disabled={isSaving || isSaved}
              size="sm" 
              variant="ghost" 
              className={`text-editor-foreground/60 hover:text-primary transition-all ${
                isSaved ? 'text-primary bg-primary/10 opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isSaving ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Heart className={`mr-1.5 h-4 w-4 ${isSaved ? 'fill-primary' : ''}`} />
              )}
              {isSaved ? "Đã lưu" : "Lưu bài tập"}
            </Button>
          )}

          <select 
            value={language} 
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="h-8 bg-editor-line border-none text-sm text-editor-foreground rounded px-2 outline-none cursor-pointer"
          >
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="javascript">JavaScript</option>
          </select>

          <Button onClick={handleAIFeedback} disabled={isAILoading || cooldown > 0} size="sm" variant="ghost" className="text-editor-foreground/60 hover:text-editor-foreground hover:bg-editor-line h-8">
            {isAILoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-1.5 h-4 w-4 text-primary" />} 
            {cooldown > 0 ? `Chờ ${cooldown}s` : "Hỏi AI"}
          </Button>
          <Button onClick={handleRunCode} disabled={isExecuting || isSubmitting} size="sm" className="bg-success text-success-foreground hover:bg-success/90 h-8">
            {isExecuting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />} 
            Chạy code
          </Button>
          <Button onClick={handleSubmitCode} disabled={isExecuting || isSubmitting || !userEmail} size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 h-8">
            {isSubmitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />} 
            Nộp bài
          </Button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Lesson + Chat */}
        <div className={`${isChatExpanded ? "w-[45%]" : "w-[30%]"} min-w-[300px] border-r border-editor-line flex flex-col transition-all duration-300 ease-in-out`}>
          
          {/* Lesson content */}
          {!isChatExpanded && (
            <div className={`${showChat ? "flex-1" : "flex-[2]"} overflow-auto p-5 border-b border-editor-line`}>
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-primary">
                    <BookOpen className="h-5 w-5" />
                    <h2 className="font-semibold text-editor-foreground">Yêu cầu đề bài</h2>
                  </div>
                  {!showChat && (
                      <button onClick={() => setShowChat(true)} className="text-xs flex items-center gap-1 text-primary hover:underline">
                          <MessageSquare className="h-3.5 w-3.5" /> Mở Chat
                      </button>
                  )}
              </div>
              
              <div className="space-y-4 text-sm text-editor-foreground/80 leading-relaxed">
                {isLoading ? (
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-editor-line rounded w-3/4"></div>
                      <div className="h-4 bg-editor-line rounded w-full"></div>
                    </div>
                ) : exercise ? (
                    <div className="prose prose-sm prose-invert max-w-none text-editor-foreground/80 font-sans">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                            {exercise.description}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <p className="text-destructive">Lỗi: Không tải được đề bài.</p>
                )}
              </div>
            </div>
          )}

          {/* Chat Area */}
          {showChat && (
            <div className="flex-1 flex flex-col min-h-[250px]">
              <div className="flex items-center justify-between px-4 py-2 border-b border-editor-line bg-editor-line/10">
                <div className="flex items-center gap-2 text-sm font-medium text-editor-foreground">
                  <MessageSquare className="h-4 w-4 text-primary" /> Chat với AI
                </div>
                
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setIsChatExpanded(!isChatExpanded)}
                    className="p-1.5 rounded hover:bg-editor-line text-editor-foreground/50 hover:text-primary transition-colors"
                    title={isChatExpanded ? "Thu nhỏ về bình thường" : "Phóng to cửa sổ Chat"}
                  >
                    {isChatExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                  <button 
                    onClick={() => { setShowChat(false); setIsChatExpanded(false); }} 
                    className="p-1.5 rounded hover:bg-editor-line text-editor-foreground/50 hover:text-destructive transition-colors"
                    title="Đóng Chat"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto p-4 space-y-3">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-editor-line text-editor-foreground"
                    }`}>
                      {msg.role === "assistant" ? (
                          <div className="prose prose-sm prose-invert max-w-none">
                             <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                                 {msg.content || "..."}
                             </ReactMarkdown>
                          </div>
                      ) : (
                          msg.content
                      )}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                   <div className="flex justify-start">
                     <div className="bg-editor-line text-editor-foreground rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                       <Loader2 className="h-4 w-4 animate-spin text-primary" /> Đang soạn câu trả lời...
                     </div>
                   </div>
                )}
              </div>
              <div className="p-3 border-t border-editor-line">
                <div className="flex gap-2 relative">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={cooldown > 0 ? `Đợi ${cooldown}s...` : "Hỏi AI về bài tập..."}
                    disabled={cooldown > 0}
                    className="flex-1 rounded-lg bg-editor-line px-3 py-2.5 text-sm text-editor-foreground placeholder:text-editor-foreground/30 outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                  <Button onClick={handleSendMessage} disabled={isChatLoading || cooldown > 0} size="sm" className="bg-gradient-primary text-primary-foreground h-10 w-10 p-0 disabled:opacity-50">
                     {cooldown > 0 ? <span className="text-xs font-bold">{cooldown}s</span> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Center: Code Editor */}
        <div className="flex-1 flex flex-col">
          <Editor
            height="100%"
            language={language === "cpp" ? "cpp" : language}
            theme="vs-dark"
            value={code}
            onChange={(v) => setCode(v || "")}
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', monospace",
              minimap: { enabled: false },
              padding: { top: 16 },
              lineHeight: 24,
              renderLineHighlight: "gutter",
              scrollBeyondLastLine: false,
              smoothScrolling: true,
            }}
          />
        </div>

        {/* Right: Output, Grading + AI Feedback */}
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
              <div className="space-y-4 text-sm prose prose-sm prose-invert max-w-none text-editor-foreground/80">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                    {aiFeedback}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workspace;