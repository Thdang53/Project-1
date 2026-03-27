import { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import {
  Sparkles, Bot, Send, User, X, PanelLeftClose, PanelLeftOpen,
  Plus, Trash2, MessageSquare, Code2,
} from "lucide-react";
import ArtifactPreview from "./ArtifactPreview"; 
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from "../../lib/utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* ------------------------------------------------------------------ */
/* Types                                                             */
/* ------------------------------------------------------------------ */
interface Message {
  id: number;
  role: "user" | "ai";
  text: string;
}

interface ChatSession {
  id: number;
  title: string;
  updatedAt: string;
}

export interface ArtifactData {
  type: string;
  content: string;
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                    */
/* ------------------------------------------------------------------ */
const TypingIndicator = () => (
  <div className="flex items-start gap-3 max-w-3xl">
    <Avatar className="h-8 w-8 shrink-0 border border-border">
      <AvatarFallback className="bg-primary/10 text-primary">
        <Bot className="h-4 w-4" />
      </AvatarFallback>
    </Avatar>
    <div className="rounded-2xl rounded-tl-sm border border-border/60 bg-muted/60 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Gemini đang suy nghĩ</span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-primary/70"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  </div>
);

// 🚀 ĐÃ DỜI CHAT BUBBLE RA NGOÀI ĐỂ TRỊ DỨT ĐIỂM CHỨNG GIẬT MÀN HÌNH
interface ChatBubbleProps {
  msg: Message;
  onOpenArtifact: (type: string, content: string) => void;
}

const ChatBubble = ({ msg, onOpenArtifact }: ChatBubbleProps) => {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("flex items-start gap-3 w-full", isUser && "ml-auto flex-row-reverse")}
    >
      <Avatar className="h-8 w-8 shrink-0 mt-1 border border-border/50">
        <AvatarFallback
          className={cn(
            isUser ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
          )}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      
      <div
        className={cn(
          "px-5 py-3.5 text-[15px] leading-relaxed overflow-hidden prose prose-sm shadow-sm",
          isUser
            ? "max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground prose-invert text-white"
            : "w-full max-w-full rounded-2xl rounded-tl-sm border border-border/60 bg-muted/60 text-foreground backdrop-blur-sm dark:prose-invert"
        )}
      >
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({node, ...props}) => <p className="mb-2.5 last:mb-0" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
            li: ({node, ...props}) => <li className="" {...props} />,
            strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
            
            code: ({node, inline, className, children, ...props}: any) => {
              const match = /language-(\w+)/.exec(className || '');
              const codeString = String(children).replace(/\n$/, '');
              
              if (!inline && match) {
                 const type = match[1];
                 return (
                   <div className="my-4 p-4 border border-slate-200 bg-white rounded-xl flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Code2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 m-0 leading-none">Mã nguồn / Dữ liệu</p>
                          <p className="text-xs text-slate-500 m-0 mt-1">Định dạng: {type.toUpperCase()}</p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => onOpenArtifact(type, codeString)}
                        className="bg-primary hover:bg-primary/90 text-white shadow-md transition-all duration-200"
                      >
                        Xem Báo Cáo
                      </Button>
                   </div>
                 );
              }

              return <code className="bg-slate-200/50 px-1.5 py-0.5 rounded text-[13px] font-mono text-slate-800" {...props}>{children}</code>;
            },
          }}
        >
          {msg.text}
        </ReactMarkdown>
      </div>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/* Main Component                                                    */
/* ------------------------------------------------------------------ */
const GeminiSidebar = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hoveredSession, setHoveredSession] = useState<number | null>(null);
  
  const [artifactOpen, setArtifactOpen] = useState(false);
  const [currentArtifact, setCurrentArtifact] = useState<ArtifactData | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/AIAssistant/gemini-sessions`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSessions(data.data);
      }
    } catch (error) {
      console.error("Lỗi tải danh sách chat:", error);
    }
  }, [token]);

  useEffect(() => {
    if (open && user) {
      loadSessions();
      if (!activeSessionId && messages.length === 0) {
        startNewChat();
      }
    }
  }, [open, user, loadSessions]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isTyping]);

  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  const startNewChat = useCallback(() => {
    setActiveSessionId(null);
    setArtifactOpen(false);
    setMessages([
      { 
        id: Date.now(), 
        role: "ai", 
        text: `Xin chào! Tôi là Trợ lý Gemini (${user?.role}).\nTôi có thể giúp bạn phân tích dữ liệu, tạo bài tập hoặc quản lý hệ thống. Bạn cần tôi làm gì hôm nay?` 
      }
    ]);
  }, [user]);

  const selectSession = async (id: number) => {
    setActiveSessionId(id);
    setArtifactOpen(false);
    setMessages([]); 
    try {
      const res = await fetch(`${API_BASE_URL}/api/AIAssistant/gemini-sessions/${id}/messages`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const loadedMessages = data.data.map((m: any) => ({
          id: m.id,
          role: m.role,
          text: m.text
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      toast({ title: "Lỗi", description: "Không tải được nội dung chat", variant: "destructive" });
    }
    if (window.innerWidth < 768) setSidebarOpen(false); 
  };

  const deleteSession = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE_URL}/api/AIAssistant/gemini-sessions/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        if (activeSessionId === id) startNewChat();
        toast({ title: "Đã xóa cuộc trò chuyện" });
      }
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể xóa", variant: "destructive" });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    const userMsgText = input.trim();
    const newMsg: Message = { id: Date.now(), role: "user", text: userMsgText };
    
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/AIAssistant/gemini-chat`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          SessionId: activeSessionId,
          Message: userMsgText 
        })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setMessages((prev) => [...prev, { id: Date.now() + 1, role: "ai", text: data.reply }]);
        
        if (!activeSessionId || data.sessionId !== activeSessionId) {
          setActiveSessionId(data.sessionId);
          loadSessions();
        }
      } else {
        toast({ title: "Lỗi Gemini", description: data.message || "Xử lý thất bại.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Mất kết nối", description: "Không thể gọi API đến máy chủ.", variant: "destructive" });
    } finally {
      setIsTyping(false);
    }
  };

  // Hàm xử lý mở Artifact truyền xuống ChatBubble
  const handleOpenArtifact = useCallback((type: string, content: string) => {
    setCurrentArtifact({ type, content });
    setArtifactOpen(true);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, []);

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Sparkles className="h-6 w-6" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex bg-background/95 backdrop-blur-xl"
          >
            <AnimatePresence initial={false}>
              {sidebarOpen && (
                <motion.aside
                  key="sidebar"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 280, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="hidden md:flex flex-col h-full border-r border-border/50 bg-muted/30 overflow-hidden"
                >
                  <div className="flex flex-col h-full w-[280px]">
                    <div className="p-3">
                      <Button
                        onClick={startNewChat}
                        className="w-full justify-start gap-2 rounded-xl border border-border/60 bg-background hover:bg-accent text-foreground shadow-sm"
                        variant="outline"
                      >
                        <Plus className="h-4 w-4" />
                        Cuộc trò chuyện mới
                      </Button>
                    </div>

                    <ScrollArea className="flex-1 px-2">
                      <div className="flex flex-col gap-0.5 pb-4">
                        {sessions.map((session) => (
                          <button
                            key={session.id}
                            onClick={() => selectSession(session.id)}
                            onMouseEnter={() => setHoveredSession(session.id)}
                            onMouseLeave={() => setHoveredSession(null)}
                            className={cn(
                              "group relative flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                              session.id === activeSessionId
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                            )}
                          >
                            <MessageSquare className="h-4 w-4 shrink-0" />
                            <span className="truncate flex-1">{session.title}</span>
                            <AnimatePresence>
                              {hoveredSession === session.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  transition={{ duration: 0.15 }}
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive z-10 relative"
                                    onClick={(e) => deleteSession(e, session.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>

            <div className="flex flex-1 flex-col min-w-0 transition-all duration-300">
              <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 px-4 backdrop-blur-sm bg-background/80">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden md:inline-flex h-9 w-9 rounded-lg"
                    onClick={() => setSidebarOpen((v) => !v)}
                  >
                    {sidebarOpen ? (
                      <PanelLeftClose className="h-4.5 w-4.5" />
                    ) : (
                      <PanelLeftOpen className="h-4.5 w-4.5" />
                    )}
                  </Button>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Bot className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <h1 className="text-base font-semibold tracking-tight">Gemini Command Center</h1>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                   {currentArtifact && !artifactOpen && (
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setArtifactOpen(true)}>
                        <Code2 className="h-4.5 w-4.5 text-primary" />
                      </Button>
                   )}
                   {!artifactOpen && (
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setOpen(false)}>
                        <X className="h-4.5 w-4.5" />
                      </Button>
                   )}
                </div>
              </header>

              <div ref={scrollRef} className="flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-4xl flex flex-col gap-5 px-4 py-6">
                  {messages.length === 0 && !isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center justify-center py-24 text-center"
                    >
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                        <Sparkles className="h-8 w-8 text-primary" />
                      </div>
                      <h2 className="text-xl font-semibold text-foreground">Xin chào! Tôi có thể giúp gì?</h2>
                      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                        Hãy hỏi bất cứ điều gì — từ soạn bài giảng, phân tích dữ liệu lớp học, đến gợi ý bài tập.
                      </p>
                    </motion.div>
                  )}
                  <AnimatePresence initial={false}>
                    {/* TRUYỀN HÀM XUỐNG CHAT BUBBLE Ở ĐÂY */}
                    {messages.map((msg) => (
                      <ChatBubble key={msg.id} msg={msg} onOpenArtifact={handleOpenArtifact} />
                    ))}
                  </AnimatePresence>
                  {isTyping && <TypingIndicator />}
                  <div className="h-4" />
                </div>
              </div>

              <div className="shrink-0 border-t border-border/30 bg-background/80 backdrop-blur-sm">
                <div className="mx-auto max-w-4xl px-4 py-3">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="relative flex items-end gap-2 rounded-2xl border border-border/60 bg-muted/40 px-4 py-2 shadow-sm focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-colors duration-200"
                  >
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Nhập lệnh cho Gemini (Shift + Enter để xuống dòng)..."
                      className="min-h-[40px] max-h-[160px] flex-1 resize-none border-0 bg-transparent p-1 pt-1.5 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60 focus:outline-none"
                      rows={1}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!input.trim() || isTyping}
                      className="h-9 w-9 shrink-0 rounded-xl bg-primary hover:bg-primary/90 text-white disabled:opacity-40"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground/60 font-medium">
                    Gemini có thể mắc lỗi. Vui lòng kiểm tra lại các thông tin quan trọng.
                  </p>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {artifactOpen && currentArtifact && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "45%", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "circOut" }}
                  className="h-full shrink-0 flex flex-col z-20 overflow-hidden"
                >
                    <ArtifactPreview 
                        open={artifactOpen} 
                        data={currentArtifact} 
                        onClose={() => setArtifactOpen(false)} 
                    />
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GeminiSidebar;