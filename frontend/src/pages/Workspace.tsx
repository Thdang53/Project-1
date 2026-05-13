import { useState, useEffect, Fragment } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; 
import { 
  Code2, Play, Upload, BrainCircuit, 
  Loader2, Heart, Flag
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { useAuth } from "../hooks/useAuth";
import { toast } from "@/hooks/use-toast";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"; 

// IMPORT CÁC COMPONENT ĐÃ TÁCH
import LeftPanel from "@/components/workspace/LeftPanel";
import RightPanel from "@/components/workspace/RightPanel";

// IMPORT SHADCN UI CHO POPUP
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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
  
  const reviewId = searchParams.get("reviewId");
  const mode = searchParams.get("mode");

  const pastCode = location.state?.pastCode;
  const pastLanguage = location.state?.pastLanguage;
  
  const [isAIGenerated, setIsAIGenerated] = useState(location.state?.isAIGenerated || false);
  const aiExerciseData = location.state?.exerciseData;

  const draftKey = `draft_code_exercise_${exerciseId || reviewId}`;
  const savedDraft = (exerciseId || reviewId) ? localStorage.getItem(draftKey) : null;

  // 💡 ĐÃ FIX: Ưu tiên lấy ngôn ngữ từ AI truyền sang, nếu không có mới dùng pastLanguage hoặc mặc định là python
  const initialLang = aiExerciseData?.language?.toLowerCase() || pastLanguage || "python";
  const [language, setLanguage] = useState(initialLang);
  const [code, setCode] = useState(pastCode || savedDraft || defaultTemplates[initialLang]);
  
  const [activeTab, setActiveTab] = useState<"output" | "grading" | "ai">("output");
  const [showChat, setShowChat] = useState(true);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [output, setOutput] = useState(">>> Chờ chạy code...");
  const [isExecuting, setIsExecuting] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);

  const defaultAiFeedback = "Nhấn 'Hỏi AI' ở góc trên để nhận phân tích chi tiết về code của bạn nhé.";
  const [aiFeedback, setAiFeedback] = useState(defaultAiFeedback);
  const [isAILoading, setIsAILoading] = useState(false);
  
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", content: "Xin chào! Mình là trợ giảng AI. Bạn cần hỗ trợ gì về bài tập này?" },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [cooldown, setCooldown] = useState(0);

  const { user, token } = useAuth();
  const userEmail = user?.email || "";

  // --- 🌟 STATE CHO POPUP BÁO CÁO GOM CHUNG ---
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [reportedAIResponse, setReportedAIResponse] = useState("");

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    const isDefaultCode = Object.values(defaultTemplates).includes(code);
    if ((exerciseId || reviewId) && !isDefaultCode && code.trim() !== "") {
      localStorage.setItem(`draft_code_exercise_${exerciseId || reviewId}`, code);
    }
  }, [code, exerciseId, reviewId]);

  // 💡 ĐÃ FIX: ƯU TIÊN SỬ DỤNG DỮ LIỆU TỪ POPUP NẾU CÓ, NẾU KHÔNG MỚI GỌI API
  useEffect(() => {
    let isMounted = true;

    const loadExercise = async () => {
      setIsLoading(true);

      // --- TRƯỜNG HỢP 1: BÀI TẬP DO AI TẠO (TRUYỀN TỪ DASHBOARD/POPUP SANG) ---
      if (isAIGenerated && aiExerciseData) {
        
        // 💡 ĐÃ FIX: Đồng bộ lại State Language một lần nữa cho chắc chắn
        const targetLang = aiExerciseData.language?.toLowerCase() || pastLanguage || "python";
        setLanguage(targetLang);

        setExercise({
          id: Number(exerciseId) || aiExerciseData.id || Number(reviewId) || 0,
          lessonId: aiExerciseData.lessonId || 0,
          title: aiExerciseData.title || aiExerciseData.Title || "Bài tập AI",
          description: aiExerciseData.description || aiExerciseData.Description,
          difficulty: aiExerciseData.difficulty || "Cơ bản",
          testCases: typeof aiExerciseData.testCases === 'string' ? aiExerciseData.testCases : JSON.stringify(aiExerciseData.testCases),
          starterCode: aiExerciseData.starterCode || aiExerciseData.StarterCode || ""
        });
        
        if (!savedDraft && !pastCode) {
          // 💡 ĐÃ FIX: Nạp đúng template mặc định của ngôn ngữ đó nếu không có code nháp
          setCode(aiExerciseData.starterCode || aiExerciseData.StarterCode || defaultTemplates[targetLang]);
        }
        if (isMounted) setIsLoading(false);
        return; 
      }

      try {
        // --- TRƯỜNG HỢP 2: ÔN TẬP THÍCH ỨNG DỰ PHÒNG (Ví dụ: Bấm F5 hoặc Share Link) ---
        if (mode === "adaptive-review" && reviewId) {
          const originalRes = await fetch(`${API_BASE_URL}/api/Exercises/${reviewId}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const originalEx = await originalRes.json();
          
          const response = await fetch(`${API_BASE_URL}/api/AIAssistant/generate-exercise`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json", 
              "Authorization": `Bearer ${token}` 
            },
            body: JSON.stringify({
              Language: language,
              Topic: `Ôn tập lại bài toán: ${originalEx.title || "Bài tập cũ"}. Yêu cầu: Hãy giữ nguyên thuật toán cốt lõi và các test cases, nhưng viết lại một cốt truyện hoàn toàn mới lạ.`,
              Difficulty: originalEx.difficulty || "Trung bình",
              StudentEmail: userEmail 
            })
          });

          const data = await response.json();
          if (data.success && isMounted) {
            setIsAIGenerated(true);
            setExercise({
              id: Number(reviewId), 
              lessonId: originalEx.lessonId || 0,
              title: `[ÔN TẬP] ${data.data.Title}`,
              description: data.data.Description,
              difficulty: originalEx.difficulty || "Cơ bản",
              testCases: originalEx.testCases, 
              starterCode: data.data.StarterCode || originalEx.starterCode
            });
            
            if (!savedDraft && !pastCode) {
              setCode(data.data.StarterCode || originalEx.starterCode || defaultTemplates[language]);
            }
          } else if (isMounted) {
             setExercise(originalEx);
          }
          return; 
        }

        // --- TRƯỜNG HỢP 3: LÀM BÀI TẬP THÔNG THƯỜNG ---
        const isInvalidId = !exerciseId || exerciseId === "workspace";
        const fetchUrl = isInvalidId 
          ? `${API_BASE_URL}/api/Exercises/first`
          : `${API_BASE_URL}/api/Exercises/${exerciseId}`;

        const exRes = await fetch(fetchUrl, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const exData = await exRes.json();
        
        if (isMounted && !exData.message) {
          setExercise(exData);
        }
      } catch (error) {
        console.error("Lỗi tải bài tập:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadExercise();

    return () => { isMounted = false; };
  }, [exerciseId, reviewId, mode, token, isAIGenerated, aiExerciseData, savedDraft, pastCode, userEmail, language, pastLanguage]);

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
        const testCases = typeof exercise.testCases === 'string' ? JSON.parse(exercise.testCases || "[]") : exercise.testCases;
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

        const finalStatus = passedCount === testCases.length ? "Accepted" : "Wrong Answer";

        setSubmitResult({
          status: finalStatus,
          totalTests: testCases.length,
          passedTests: passedCount,
          results: results
        });

        if (finalStatus === "Accepted" && mode === "adaptive-review" && reviewId) {
           fetch(`${API_BASE_URL}/api/CodeExecution/submit`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
              body: JSON.stringify({ language, code, exerciseId: Number(reviewId), userEmail })
           });
        }

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
          exerciseId: exercise?.id || 0, 
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
          exerciseId: exercise?.id || 0,
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

  // ====================================================================
  // 🚀 HÀM NÀY MỞ POPUP (THAY THẾ HOÀN TOÀN CHO WINDOW.PROMPT)
  // ====================================================================
  const handleReportAI = (originalAIResponse: string) => {
    if (!user?.email) {
      toast({ title: "Lỗi", description: "Bạn cần đăng nhập để báo cáo.", variant: "destructive" });
      return;
    }
    // Gắn dữ liệu và mở Popup
    setReportedAIResponse(originalAIResponse);
    setReportMessage("");
    setIsReportDialogOpen(true);
  };

  // 🚀 HÀM NÀY GỌI API KHI NGƯỜI DÙNG BẤM "GỬI" TRONG POPUP
  const submitReport = async () => {
    if (!reportMessage.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập nội dung cần hỗ trợ!", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/AIAssistant/report-flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          exerciseId: exercise?.id || 1, 
          studentEmail: user?.email,
          studentIssue: reportMessage,
          originalAIResponse: reportedAIResponse,
          studentCode: code
        })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Đã gửi báo cáo!", description: data.message });
        setIsReportDialogOpen(false); // Tắt popup
      } else {
        toast({ title: "Lỗi", description: data.message, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Lỗi kết nối", description: "Không thể gửi báo cáo", variant: "destructive" });
    }
  };

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
          testCases: typeof exercise.testCases === 'string' ? exercise.testCases : JSON.stringify(exercise.testCases),
          contentType: "Exercise"
        })
      });

      if (response.ok) {
        setIsSaved(true);
        toast({ title: "Thành công", description: "Đã lưu vào Thư viện AI cá nhân!" });
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
        
        {/* LEFT PANEL */}
        <LeftPanel 
          isChatExpanded={isChatExpanded}
          setIsChatExpanded={setIsChatExpanded}
          showChat={showChat}
          setShowChat={setShowChat}
          isLoading={isLoading}
          exercise={exercise}
          MarkdownComponents={MarkdownComponents}
          chatMessages={chatMessages}
          isChatLoading={isChatLoading}
          chatInput={chatInput}
          setChatInput={setChatInput}
          cooldown={cooldown}
          handleSendMessage={handleSendMessage}
          handleReportAI={handleReportAI} // Truyền cái hàm mở Popup xuống đây
        />

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

        {/* RIGHT PANEL */}
        <RightPanel 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          output={output}
          customInput={customInput}
          setCustomInput={setCustomInput}
          isSubmitting={isSubmitting}
          submitResult={submitResult}
          aiFeedback={aiFeedback}
          isAILoading={isAILoading}
          defaultAiFeedback={defaultAiFeedback}
          MarkdownComponents={MarkdownComponents}
          handleReportAI={handleReportAI} // Cũng truyền hàm mở Popup sang đây
          exerciseId={Number(exerciseId) || 0}
          userEmail={userEmail}   
          token={token}
        />
      </div>

      {/* COMPONENT POPUP GIAO DIỆN SHADCN UI GOM CHUNG CHO TOÀN BỘ WORKSPACE */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="sm:max-w-[500px] border-editor-line bg-[#1E1E1E] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-400">
              <Flag className="w-5 h-5" /> 
              Gửi yêu cầu hỗ trợ
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Hãy mô tả chi tiết vấn đề bạn đang gặp phải để giảng viên có thể giúp bạn nhanh nhất.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea 
              placeholder="Ví dụ: Code của em chạy báo lỗi đỏ ở dòng 15 mà em không hiểu tại sao..." 
              value={reportMessage}
              onChange={(e) => setReportMessage(e.target.value)}
              className="min-h-[150px] resize-none bg-[#2D2D2D] border-[#3D3D3D] text-white focus-visible:ring-orange-400/50"
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsReportDialogOpen(false)} 
              className="border-[#3D3D3D] text-gray-300 hover:bg-[#3D3D3D] hover:text-white"
            >
              Hủy
            </Button>
            <Button 
              onClick={submitReport} 
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              Gửi yêu cầu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Workspace;