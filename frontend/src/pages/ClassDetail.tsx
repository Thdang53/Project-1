import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge"; 
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BookOpen, ArrowLeft, Play, Loader2, Sparkles, Trash2, Code2, Plus, 
  Users, Bot, Activity, Send, Radar, Settings, MoreVertical, FileWarning, 
  CheckCircle2, UserCircle, ChevronRight,
  Maximize2, Minimize2, MessageSquarePlus, MessageSquare, User, X
} from "lucide-react"; 
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface TestCase { input: string; expectedOutput: string; }
interface ChatMessage { role: "user" | "ai"; content: string; }
interface ChatSession { id: number; title: string; createdAt: string; }

const ClassDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const userRole = (user as any)?.role;

  const [classInfo, setClassInfo] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newEx, setNewEx] = useState({ title: "", description: "", difficulty: "Cơ bản", starterCode: "# Viết code của bạn ở đây...\ndef solve():\n  pass" });
  const [testCases, setTestCases] = useState<TestCase[]>([{ input: "", expectedOutput: "" }]);

  // 🌟 STATES CHO AI COPILOT
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [isAiExpanded, setIsAiExpanded] = useState(false); 
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    if (token && id) {
      fetchClassDetail(); 
    }
  }, [token, id, userRole]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatMessages]);

  const fetchClassDetail = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/Class/${id}`, { headers: { "Authorization": `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) { setClassInfo(data.classInfo); setExercises(data.exercises); }
    } catch (e) { toast({ title: "Lỗi tải dữ liệu", variant: "destructive" }); } finally { setIsLoading(false); }
  };

  // 🌟 HÀM TẢI DANH SÁCH CUỘC TRÒ CHUYỆN (SESSIONS)
  const fetchChatSessions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/Advisor/sessions/${id}`, { headers: { "Authorization": `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setChatSessions(data.data);
        if (data.data.length > 0 && !currentSessionId) {
          loadChatHistory(data.data[0].id);
        } else if (data.data.length === 0) {
          handleNewChat(); 
        }
      }
    } catch (error) { console.error("Lỗi tải danh sách session"); }
  };

  // 🌟 HÀM TẢI NỘI DUNG CHAT THEO SESSION ID
  const loadChatHistory = async (sessionId: number) => {
    if (sessionId === 0) {
        handleNewChat();
        return;
    }
    setCurrentSessionId(sessionId);
    setIsChatting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Advisor/history/${sessionId}`, { headers: { "Authorization": `Bearer ${token}` } });
      const data = await res.json();
      if (data.success && data.data.length > 0) setChatMessages(data.data);
      else handleNewChat();
    } catch (error) { console.error("Lỗi tải lịch sử chat"); } finally { setIsChatting(false); }
  };

  // 💡 ĐÃ FIX: HÀM TẠO CUỘC TRÒ CHUYỆN MỚI (CHÈN NGAY 1 PHIÊN ẢO VÀO UI)
  const handleNewChat = () => {
    setCurrentSessionId(null);
    setChatMessages([{ role: "ai", content: `🔄 Đã làm mới đoạn chat. Chào Thầy/Cô, em có thể giúp gì tiếp theo ạ?` }]);
    
    // Chèn 1 dòng "phiên ảo" (id 0) vào danh sách để sinh viên nhìn thấy sự thay đổi ngay lập tức
    if (!chatSessions.find(s => s.id === 0)) {
        setChatSessions(prev => [{ id: 0, title: "Đoạn chat mới...", createdAt: new Date().toISOString() }, ...prev]);
    }
  };

  // 🌟 HÀM NHẮN TIN
  const handleSendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || chatInput;
    if (!messageToSend.trim() || isChatting) return;
    
    setChatMessages(prev => [...prev, { role: "user", content: messageToSend }]);
    setChatInput(""); 
    setIsChatting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/Advisor/chat`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ 
          ClassId: Number(id), 
          SessionId: currentSessionId, 
          Message: messageToSend 
        })
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages(prev => [...prev, { role: "ai", content: data.reply }]);
        
        // 💡 ĐÃ FIX: Nếu chat thành công, gọi lại danh sách từ DB để cập nhật chính thức
        if (!currentSessionId && data.sessionId) {
          setCurrentSessionId(data.sessionId);
          fetchChatSessions(); 
        }
      }
      else setChatMessages(prev => [...prev, { role: "ai", content: "❌ Lỗi: " + data.message }]);
    } catch (error) { setChatMessages(prev => [...prev, { role: "ai", content: "❌ Mất kết nối." }]); } finally { setIsChatting(false); }
  };

  const handleRadarScan = async () => {
    if (isChatting) return;
    setChatMessages(prev => [...prev, { role: "user", content: "📡 Hãy quét Radar và báo cáo tình hình sinh viên yếu kém hiện tại." }]);
    setIsChatting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Advisor/radar-scan`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ ClassId: Number(id), SessionId: currentSessionId })
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages(prev => [...prev, { role: "ai", content: data.reply }]);
        if (!currentSessionId && data.sessionId) {
          setCurrentSessionId(data.sessionId);
          fetchChatSessions();
        }
      }
      else setChatMessages(prev => [...prev, { role: "ai", content: "❌ Lỗi quét Radar: " + data.message }]);
    } catch (error) { setChatMessages(prev => [...prev, { role: "ai", content: "❌ Mất kết nối khi quét Radar." }]); } finally { setIsChatting(false); }
  };

  const handleAddTestCase = () => setTestCases([...testCases, { input: "", expectedOutput: "" }]);
  const handleRemoveTestCase = (index: number) => {
    if (testCases.length === 1) return toast({ title: "Phải có ít nhất 1 Test Case", variant: "destructive" });
    setTestCases(testCases.filter((_, i) => i !== index));
  };
  const handleTestCaseChange = (index: number, field: keyof TestCase, value: string) => {
    const newCases = [...testCases]; newCases[index][field] = value; setTestCases(newCases);
  };
  const handleCreateExercise = async () => {
    if (!newEx.title || !newEx.description) return toast({ title: "Vui lòng nhập đủ Tên và Mô tả", variant: "destructive" });
    if (testCases.find(tc => !tc.input.trim() || !tc.expectedOutput.trim())) return toast({ title: "Vui lòng điền đủ Input/Output", variant: "destructive" });
    setIsCreating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Class/${id}/exercises`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ Title: newEx.title, Description: newEx.description, Difficulty: newEx.difficulty, StarterCode: newEx.starterCode, TestCases: testCases.map(tc => ({ Input: tc.input, ExpectedOutput: tc.expectedOutput })) })
      });
      const data = await res.json();
      if (data.success) { toast({ title: "Đã giao bài tập cho lớp." }); setIsCreateModalOpen(false); fetchClassDetail(); }
    } catch (e) { toast({ title: "Lỗi kết nối", variant: "destructive" }); } finally { setIsCreating(false); }
  };

  const getDifficultyColor = (diff: string) => {
    const d = diff?.toLowerCase() || "";
    if (d === 'easy' || d === 'cơ bản') return 'bg-success/10 text-success border-success/20';
    if (d === 'medium' || d === 'trung bình') return 'bg-warning/10 text-warning border-warning/20';
    if (d === 'hard' || d === 'nâng cao') return 'bg-destructive/10 text-destructive border-destructive/20';
    return 'bg-muted text-muted-foreground border-border';
  };

  const displayDifficulty = (diff: string) => {
    const d = diff?.toLowerCase() || "";
    if (d === 'easy' || d === 'cơ bản') return 'CƠ BẢN';
    if (d === 'medium' || d === 'trung bình') return 'TRUNG BÌNH';
    if (d === 'hard' || d === 'nâng cao') return 'NÂNG CAO';
    return 'CƠ BẢN';
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-muted/10 flex flex-col font-sans">
      <Navbar />
      
      {/* HEADER */}
      <div className="bg-card border-b pt-24 pb-8">
        <div className="container mx-auto px-6 max-w-6xl">
          <Button variant="ghost" onClick={() => navigate("/classrooms")} className="mb-6 -ml-4 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" /> Trở về danh sách
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <BookOpen className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">{classInfo?.className}</h1>
                <div className="flex items-center gap-3 mt-2 text-muted-foreground font-medium">
                  <span>Giảng viên: <span className="text-foreground">{classInfo?.lecturerName}</span></span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/50"></span>
                  <span className="flex items-center gap-2">Mã Lớp: <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-md font-mono font-bold tracking-wider">{classInfo?.joinCode}</span></span>
                </div>
              </div>
            </div>
            
            {userRole !== "Student" && (
              <div className="flex gap-3">
                {/* 💡 SỰ KIỆN onOpenChange ĐỂ TẢI DANH SÁCH CHAT MỖI KHI MỞ BẢNG LÊN */}
                <Sheet onOpenChange={(open) => { if (open) fetchChatSessions(); }}>
                  <SheetTrigger asChild>
                    <Button id="ai-advisor-trigger" className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white h-10 rounded-xl shadow-sm">
                      <Sparkles className="h-4 w-4 mr-2" /> AI Cố vấn
                    </Button>
                  </SheetTrigger>
                  
                  <SheetContent className={`p-0 flex transition-all duration-300 ease-in-out border-l-blue-500/20 bg-background ${isAiExpanded ? 'w-screen sm:w-screen sm:max-w-[100vw]' : 'w-[850px] sm:w-[900px] sm:max-w-none'}`}>
                    
                    <SheetHeader className="sr-only">
                      <SheetTitle>AI Cố vấn</SheetTitle>
                      <SheetDescription>Trợ lý ảo phân tích lớp học</SheetDescription>
                    </SheetHeader>

                    <div className="flex h-full w-full overflow-hidden">
                      
                      {/* ======================================================== */}
                      {/* CỘT TRÁI (SIDEBAR): HIỂN THỊ DANH SÁCH SESSIONS */}
                      {/* ======================================================== */}
                      <div className="hidden sm:flex flex-col w-[260px] lg:w-[280px] border-r border-border/50 bg-muted/30 shrink-0">
                        
                        <div className="h-14 flex items-center px-5 border-b border-border/50 shrink-0 bg-background/50 backdrop-blur-sm">
                          <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400">
                             <Bot className="h-5 w-5" />
                             <span className="font-bold text-[15px] whitespace-nowrap">AI Cố vấn Học tập</span>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6 custom-scrollbar">
                          
                          {/* Nút Chat Mới */}
                          <Button onClick={handleNewChat} variant="outline" className="w-full justify-start gap-2 text-blue-600 border-blue-200 hover:border-blue-300 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-900/30 h-10 rounded-xl transition-all shadow-sm">
                            <Plus className="h-5 w-5" /> <span className="font-semibold">Đoạn chat mới</span>
                          </Button>
                          
                          {/* Nhóm Công cụ */}
                          <div>
                            <div className="text-xs font-bold text-muted-foreground mb-3 px-2 uppercase tracking-wider">Công cụ Cố vấn</div>
                            <div className="space-y-1">
                              <Button variant="ghost" onClick={handleRadarScan} disabled={isChatting} className="w-full justify-start font-medium text-sm h-10 rounded-lg hover:bg-muted text-foreground transition-all">
                                <Radar className="h-4 w-4 mr-3 text-red-500" /> Quét Radar Cảnh Báo
                              </Button>
                              <Button variant="ghost" onClick={() => handleSendMessage("Hãy phân tích xem lớp này đang hay nộp bài sai ở đâu nhất?")} disabled={isChatting} className="w-full justify-start font-medium text-sm h-10 rounded-lg hover:bg-muted text-foreground transition-all">
                                <FileWarning className="h-4 w-4 mr-3 text-orange-500" /> Bắt mạch lỗi sai
                              </Button>
                              <Button variant="ghost" onClick={() => handleSendMessage("Hãy tự động tạo 1 bài tập lập trình cơ bản để vá lỗi cho lớp này.")} disabled={isChatting} className="w-full justify-start font-medium text-sm h-10 rounded-lg hover:bg-muted text-foreground transition-all">
                                <Sparkles className="h-4 w-4 mr-3 text-blue-500" /> Giao bài vá lỗi
                              </Button>
                            </div>
                          </div>

                          {/* Lịch sử Chats */}
                          <div>
                            <div className="text-xs font-bold text-muted-foreground mb-3 px-2 uppercase tracking-wider">Lịch sử trò chuyện</div>
                            <div className="space-y-1">
                              {chatSessions.length === 0 ? (
                                <div className="text-center px-2 py-4 text-xs text-muted-foreground">Chưa có lịch sử</div>
                              ) : (
                                chatSessions.map(session => (
                                  <Button 
                                    key={session.id} 
                                    variant="ghost" 
                                    onClick={() => loadChatHistory(session.id)}
                                    // Highlight màu xanh nếu đang ở đúng Session đó
                                    className={`w-full justify-start font-medium text-sm h-10 rounded-lg px-3 transition-all ${
                                      currentSessionId === session.id 
                                        ? 'bg-blue-600/10 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 font-semibold' 
                                        : 'hover:bg-muted text-foreground'
                                    }`}
                                  >
                                    <MessageSquare className="h-4 w-4 mr-3 shrink-0" /> 
                                    <span className="truncate text-left w-full block">{session.title}</span>
                                  </Button>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ======================================================== */}
                      {/* CỘT PHẢI (MAIN CHAT AREA) */}
                      {/* ======================================================== */}
                      <div className="flex-1 flex flex-col h-full relative min-w-0 bg-background">
                        
                        <div className="h-14 border-b border-border/50 flex items-center justify-between px-4 bg-background/95 backdrop-blur-md shrink-0 z-10">
                          <div className="flex sm:hidden items-center gap-2 text-blue-600">
                             <Bot className="h-5 w-5" />
                             <span className="font-bold text-[15px]">AI Cố vấn Học tập</span>
                          </div>
                          
                          <div className="hidden sm:flex items-center">
                            <Badge variant="outline" className="text-muted-foreground font-normal border-border bg-muted/20 px-3 py-1">
                              Phân tích lớp: <strong className="ml-1 text-foreground">{classInfo?.className}</strong>
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-1 ml-auto mr-8 sm:mr-0">
                            <Button variant="ghost" size="icon" onClick={() => setIsAiExpanded(!isAiExpanded)} title={isAiExpanded ? "Thu nhỏ" : "Phóng to"} className="h-8 w-8 text-muted-foreground hover:text-foreground hidden sm:flex transition-all">
                              {isAiExpanded ? <Minimize2 className="h-4.5 w-4.5" /> : <Maximize2 className="h-4.5 w-4.5" />}
                            </Button>
                            <SheetClose asChild>
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all">
                                  <X className="h-4.5 w-4.5" />
                               </Button>
                            </SheetClose>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar" ref={scrollRef}>
                           <div className="mx-auto w-full max-w-4xl flex flex-col gap-6 px-4 py-6">
                              {chatMessages.map((msg, idx) => (
                                <div key={idx} className={`flex items-start gap-4 w-full ${msg.role === 'user' ? 'flex-row-reverse ml-auto' : ''}`}>
                                  <div className={`h-8 w-8 shrink-0 mt-1 rounded-full flex items-center justify-center border border-border/50 shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gradient-to-br from-blue-600 to-violet-600 text-white'}`}>
                                    {msg.role === 'user' ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                                  </div>
                                  
                                  <div className={`px-5 py-3.5 text-[15px] leading-relaxed overflow-hidden prose prose-sm shadow-sm ${msg.role === 'user' ? 'max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-sm bg-blue-600 text-white prose-invert' : 'w-full max-w-full rounded-2xl rounded-tl-sm border border-border/60 bg-muted/30 text-foreground dark:prose-invert'}`}>
                                     {msg.role === 'ai' ? (
                                       <ReactMarkdown>{msg.content}</ReactMarkdown>
                                     ) : (
                                       <p className="whitespace-pre-wrap">{msg.content}</p>
                                     )}
                                  </div>
                                </div>
                              ))}
                              
                              {isChatting && (
                                <div className="flex items-start gap-4 w-full">
                                  <div className="h-8 w-8 shrink-0 mt-1 rounded-full flex items-center justify-center border border-border/50 shadow-sm bg-gradient-to-br from-blue-600 to-violet-600 text-white">
                                    <Sparkles className="h-4 w-4" />
                                  </div>
                                  <div className="rounded-2xl rounded-tl-sm border border-border/60 bg-muted/30 px-5 py-4">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-muted-foreground font-medium">AI đang suy nghĩ</span>
                                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                    </div>
                                  </div>
                                </div>
                              )}
                           </div>
                        </div>

                        <div className="p-4 bg-background border-t border-border/50 shrink-0">
                           <div className="max-w-4xl mx-auto relative flex items-end gap-2 bg-card border shadow-sm rounded-2xl p-2 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                             <Textarea 
                                placeholder="Nhập yêu cầu để AI cố vấn phân tích..." 
                                className="min-h-[44px] max-h-[150px] resize-none border-0 bg-transparent focus-visible:ring-0 px-3 py-3 text-[15px] custom-scrollbar"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                disabled={isChatting}
                             />
                             <Button onClick={() => handleSendMessage()} disabled={!chatInput.trim() || isChatting} size="icon" className="h-10 w-10 shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm mb-1 mr-1 transition-transform active:scale-95">
                               <Send className="h-4.5 w-4.5" />
                             </Button>
                           </div>
                           <p className="text-center text-[11px] text-muted-foreground mt-3">Hệ thống AI Cố vấn có thể đưa ra kết luận chưa chính xác, hãy luôn kiểm chứng bằng dữ liệu.</p>
                        </div>

                      </div>
                    </div>
                  </SheetContent>
                </Sheet>

                {/* MODAL TẠO BÀI TẬP */}
                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                  <DialogTrigger asChild><Button className="bg-primary hover:bg-primary/90 h-10 rounded-xl shadow-sm"><Plus className="h-4 w-4 mr-2" /> Giao bài</Button></DialogTrigger>
                  <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <DialogHeader><DialogTitle className="flex items-center gap-2 text-xl"><Sparkles className="h-5 w-5 text-warning"/> Soạn Bài tập</DialogTitle></DialogHeader>
                    <div className="space-y-6 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-2"><label className="text-sm font-semibold">Tên bài tập</label><Input value={newEx.title} onChange={e => setNewEx({...newEx, title: e.target.value})} /></div>
                        <div className="space-y-2"><label className="text-sm font-semibold">Độ khó</label><select value={newEx.difficulty} onChange={e => setNewEx({...newEx, difficulty: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary"><option>Cơ bản</option><option>Trung bình</option><option>Nâng cao</option></select></div>
                      </div>
                      <div className="space-y-2"><label className="text-sm font-semibold">Mô tả (Markdown)</label><Textarea value={newEx.description} onChange={e => setNewEx({...newEx, description: e.target.value})} className="min-h-[120px] custom-scrollbar"/></div>
                      <div className="space-y-2"><label className="text-sm font-semibold">Code Mẫu</label><Textarea value={newEx.starterCode} onChange={e => setNewEx({...newEx, starterCode: e.target.value})} className="min-h-[100px] font-mono text-sm bg-muted/30 custom-scrollbar"/></div>
                      <div className="pt-4 border-t space-y-4">
                        <div className="flex justify-between items-center"><label className="text-sm font-semibold text-primary">Test Cases</label><Button variant="outline" size="sm" onClick={handleAddTestCase}><Plus className="h-4 w-4 mr-1"/> Thêm Test</Button></div>
                        <div className="space-y-3">{testCases.map((tc, index) => (<div key={index} className="flex gap-3 items-start"><Input placeholder="Input" value={tc.input} onChange={e => handleTestCaseChange(index, "input", e.target.value)} className="font-mono text-sm"/><Input placeholder="Expected" value={tc.expectedOutput} onChange={e => handleTestCaseChange(index, "expectedOutput", e.target.value)} className="font-mono text-sm"/><Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemoveTestCase(index)}><Trash2 className="h-4 w-4" /></Button></div>))}</div>
                      </div>
                      <div className="flex justify-end gap-3 pt-4"><Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Hủy</Button><Button onClick={handleCreateExercise} disabled={isCreating} className="bg-primary w-32">{isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Phát hành"}</Button></div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-6xl flex-1">
        <Tabs defaultValue="exercises" className="w-full">
          <TabsList className="mb-8 grid w-full md:w-[300px] grid-cols-2 h-12 bg-muted/40 p-1 rounded-xl">
            <TabsTrigger value="exercises" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><Code2 className="h-4 w-4 md:mr-2"/><span className="hidden md:inline">Bài tập</span></TabsTrigger>
            <TabsTrigger value="students" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><Users className="h-4 w-4 md:mr-2"/><span className="hidden md:inline">Thành viên</span></TabsTrigger>
          </TabsList>

          {/* TAB 1: BÀI TẬP */}
          <TabsContent value="exercises" className="focus-visible:outline-none">
            {exercises.length === 0 ? (
              <div className="text-center py-24 text-muted-foreground border border-dashed rounded-2xl bg-card">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20"/> 
                <p className="text-lg font-medium text-foreground">Chưa có bài tập nào</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {exercises.map((ex, index) => {
                  const isCompleted = ex.isCompleted;

                  return (
                    <div key={ex.id} className={`group p-5 rounded-2xl border transition-all flex flex-col h-full ${isCompleted ? 'bg-success/5 border-success/20' : 'bg-card hover:-translate-y-1'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getDifficultyColor(ex.difficulty)}`}>
                          {displayDifficulty(ex.difficulty)}
                        </div>
                        {isCompleted ? (
                           <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                           userRole !== "Student" && <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="h-4 w-4" /></Button>
                        )}
                      </div>
                      
                      <h3 className={`text-lg font-bold mb-2 line-clamp-2 ${isCompleted ? 'text-success' : 'group-hover:text-primary'}`}>
                         <span className="text-muted-foreground mr-2 font-mono text-sm">Bài {index + 1}</span> 
                         {ex.title}
                      </h3>
                      
                      <p className="text-sm mb-6 flex-1 line-clamp-2 text-muted-foreground">
                         {ex.description}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-auto">
                        <button 
                          onClick={() => navigate(`/ai-lesson/${ex.id}`)} 
                          className="flex-1 flex items-center justify-center font-bold rounded-xl h-10 text-sm bg-accent/10 text-accent hover:bg-accent hover:text-white border border-accent/20"
                        >
                          <Sparkles className="h-4 w-4 mr-1.5" /> Gợi ý
                        </button>
                        
                        <button 
                          onClick={() => navigate(`/workspace?id=${ex.id}`)} 
                          className={`flex-[2] flex items-center justify-center font-bold rounded-xl h-10 text-sm ${isCompleted ? 'bg-success/10 text-success' : 'bg-muted hover:bg-primary hover:text-primary-foreground'}`}
                        >
                          {isCompleted ? "Xem lại" : "Giải ngay"} <ChevronRight className="ml-1 h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: THÀNH VIÊN */}
          <TabsContent value="students" className="focus-visible:outline-none">
            <Card className="p-6 bg-card border shadow-sm rounded-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Danh sách Sinh viên ({classInfo?.students?.length || 0})
                </h3>
                {userRole !== "Student" && (
                  <Button variant="outline" size="sm" className="hidden md:flex">
                    <Plus className="h-4 w-4 mr-2"/> Mời thêm sinh viên
                  </Button>
                )}
              </div>
              
              {classInfo?.students && classInfo.students.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border custom-scrollbar">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Họ và tên</th>
                        <th className="px-4 py-3 font-semibold">Email</th>
                        <th className="px-4 py-3 font-semibold">Ngày tham gia</th>
                        {userRole !== "Student" && <th className="px-4 py-3 text-right font-semibold">Thao tác</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {classInfo.students.map((st: any, idx: number) => (
                        <tr key={idx} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground flex items-center gap-3">
                            <UserCircle className="h-8 w-8 text-muted-foreground/50" />
                            {st.fullName || "Học viên ẩn danh"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{st.email}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {st.joinedAt ? new Date(st.joinedAt).toLocaleDateString("vi-VN") : "---"}
                          </td>
                          {userRole !== "Student" && (
                            <td className="px-4 py-3 text-right">
                              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 h-8">
                                Xóa
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/10">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Lớp học này hiện chưa có sinh viên nào tham gia.</p>
                  <p className="text-sm text-muted-foreground mt-1">Hãy chia sẻ Mã lớp: <strong>{classInfo?.joinCode}</strong> cho sinh viên nhé.</p>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClassDetail;