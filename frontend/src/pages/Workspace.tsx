import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Code2, Send, Play, Upload, BrainCircuit, ChevronRight, MessageSquare, Terminal as TerminalIcon, BookOpen, X } from "lucide-react";
import Editor from "@monaco-editor/react";

const defaultCode = `# Bài tập: Tính tổng các số chẵn
# Viết hàm tính tổng các số chẵn từ 1 đến n

def sum_even(n):
    total = 0
    for i in range(1, n + 1):
        if i % 2 == 0:
            total += i
    return total

# Test
print(sum_even(10))  # Kết quả: 30
print(sum_even(20))  # Kết quả: 110
`;

const sampleOutput = `>>> python main.py
30
110
✓ Chương trình chạy thành công!`;

const sampleAIFeedback = {
  syntax: [],
  logic: ["Hàm hoạt động đúng! Tuy nhiên, bạn có thể tối ưu bằng công thức toán học."],
  suggestions: [
    "Thử dùng list comprehension: sum(i for i in range(2, n+1, 2))",
    "Hoặc công thức: n//2 * (n//2 + 1) để đạt O(1)"
  ]
};

const chatMessages = [
  { role: "assistant", content: "Xin chào! Mình là trợ giảng AI. Bạn cần hỗ trợ gì về bài tập?" },
  { role: "user", content: "Tại sao em dùng range(1, n+1) mà không phải range(n)?" },
  { role: "assistant", content: "Câu hỏi hay! `range(1, n+1)` bắt đầu từ 1 đến n, còn `range(n)` bắt đầu từ 0 đến n-1. Vì đề bài yêu cầu 'từ 1 đến n' nên range(1, n+1) là chính xác." },
];

const Workspace = () => {
  const [code, setCode] = useState(defaultCode);
  const [chatInput, setChatInput] = useState("");
  const [activeTab, setActiveTab] = useState<"output" | "ai">("output");
  const [showChat, setShowChat] = useState(true);

  return (
    <div className="h-screen flex flex-col bg-editor">
      {/* Top bar */}
      <div className="flex h-12 items-center justify-between border-b border-editor-line px-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-primary">
              <Code2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-editor-foreground">CodeAI</span>
          </Link>
          <span className="text-editor-foreground/30">|</span>
          <span className="text-sm text-editor-foreground/60">Python — Bài tập: Tổng số chẵn</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="text-editor-foreground/60 hover:text-editor-foreground hover:bg-editor-line h-8">
            <BrainCircuit className="mr-1.5 h-4 w-4 text-primary" /> Hỏi AI
          </Button>
          <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90 h-8">
            <Play className="mr-1.5 h-4 w-4" /> Chạy code
          </Button>
          <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 h-8">
            <Upload className="mr-1.5 h-4 w-4" /> Nộp bài
          </Button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Lesson + Chat */}
        <div className="w-[30%] min-w-[300px] border-r border-editor-line flex flex-col">
          {/* Lesson content */}
          <div className={`${showChat ? "flex-1" : "flex-[2]"} overflow-auto p-5 border-b border-editor-line`}>
            <div className="flex items-center gap-2 text-primary mb-4">
              <BookOpen className="h-5 w-5" />
              <h2 className="font-semibold text-editor-foreground">Bài 3: Vòng lặp for</h2>
            </div>
            <div className="space-y-4 text-sm text-editor-foreground/80 leading-relaxed">
              <p>Vòng lặp <code className="font-mono bg-editor-line px-1.5 py-0.5 rounded text-primary">for</code> cho phép bạn lặp qua một dãy số hoặc danh sách.</p>
              <div className="rounded-lg bg-editor-line p-4 font-mono text-xs">
                <span className="text-accent">for</span> i <span className="text-accent">in</span> <span className="text-primary">range</span>(10):<br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-primary">print</span>(i)
              </div>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <h3 className="font-semibold text-primary mb-2 flex items-center gap-1.5">
                  <ChevronRight className="h-4 w-4" /> Bài tập
                </h3>
                <p>Viết hàm <code className="font-mono bg-editor-line px-1.5 py-0.5 rounded text-primary">sum_even(n)</code> trả về tổng các số chẵn từ 1 đến n.</p>
                <p className="mt-2 text-editor-foreground/50">VD: sum_even(10) → 30</p>
              </div>
            </div>
          </div>

          {/* Chat */}
          {showChat && (
            <div className="flex-1 flex flex-col min-h-[250px]">
              <div className="flex items-center justify-between px-4 py-2 border-b border-editor-line">
                <div className="flex items-center gap-2 text-sm font-medium text-editor-foreground">
                  <MessageSquare className="h-4 w-4 text-primary" /> Chat với AI
                </div>
                <button onClick={() => setShowChat(false)} className="text-editor-foreground/40 hover:text-editor-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-3">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-editor-line text-editor-foreground"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-editor-line">
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Hỏi AI về bài tập..."
                    className="flex-1 rounded-lg bg-editor-line px-3 py-2 text-sm text-editor-foreground placeholder:text-editor-foreground/30 outline-none focus:ring-1 focus:ring-primary"
                  />
                  <Button size="sm" className="bg-gradient-primary text-primary-foreground h-9 w-9 p-0">
                    <Send className="h-4 w-4" />
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
            defaultLanguage="python"
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

        {/* Right: Output + AI Feedback */}
        <div className="w-[30%] min-w-[300px] border-l border-editor-line flex flex-col">
          <div className="flex border-b border-editor-line">
            <button
              onClick={() => setActiveTab("output")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "output"
                  ? "text-primary border-b-2 border-primary"
                  : "text-editor-foreground/40 hover:text-editor-foreground/60"
              }`}
            >
              <TerminalIcon className="h-4 w-4" /> Output
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "ai"
                  ? "text-primary border-b-2 border-primary"
                  : "text-editor-foreground/40 hover:text-editor-foreground/60"
              }`}
            >
              <BrainCircuit className="h-4 w-4" /> AI Feedback
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {activeTab === "output" ? (
              <pre className="font-mono text-sm text-editor-foreground/80 whitespace-pre-wrap">{sampleOutput}</pre>
            ) : (
              <div className="space-y-4 text-sm">
                {sampleAIFeedback.logic.length > 0 && (
                  <div>
                    <h4 className="font-medium text-primary mb-2">💡 Phân tích logic</h4>
                    {sampleAIFeedback.logic.map((l, i) => (
                      <p key={i} className="text-editor-foreground/70 bg-primary/5 border border-primary/20 rounded-lg p-3">{l}</p>
                    ))}
                  </div>
                )}
                <div>
                  <h4 className="font-medium text-success mb-2">✨ Gợi ý cải thiện</h4>
                  <div className="space-y-2">
                    {sampleAIFeedback.suggestions.map((s, i) => (
                      <div key={i} className="bg-success/5 border border-success/20 rounded-lg p-3 text-editor-foreground/70">
                        <code className="font-mono text-xs">{s}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workspace;
