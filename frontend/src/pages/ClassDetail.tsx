import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BookOpen, ArrowLeft, Play, Loader2, Sparkles, Trash2, Code2, Plus, 
  Users, Bot, Activity, Send, Radar, Settings, MoreVertical, FileWarning, CheckCircle2 
} from "lucide-react"; // 🌟 Đã thêm CheckCircle2
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface TestCase { input: string; expectedOutput: string; }
interface ChatMessage { role: "user" | "ai"; content: string; }

const ClassDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const userRole = (user as any)?.role;

  const [classInfo, setClassInfo] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // States Modal Tạo bài tập
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newEx, setNewEx] = useState({ title: "", description: "", difficulty: "Cơ bản", starterCode: "# Viết code của bạn ở đây...\ndef solve():\n  pass" });
  const [testCases, setTestCases] = useState<TestCase[]>([{ input: "", expectedOutput: "" }]);

  // STATES CHO AI COPILOT
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    if (token && id) {
      fetchClassDetail(); 
      if (userRole !== "Student") fetchChatHistory(); 
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

  const fetchChatHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/Advisor/history/${id}`, { headers: { "Authorization": `Bearer ${token}` } });
      const data = await res.json();
      if (data.success && data.data.length > 0) setChatMessages(data.data);
      else setChatMessages([{ role: "ai", content: `Chào Thầy/Cô. Em là trợ lý của lớp. Thầy/Cô cần em phân tích gì ạ?` }]);
    } catch (error) { console.error("Lỗi tải lịch sử chat"); }
  };

  const handleSendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || chatInput;
    if (!messageToSend.trim() || isChatting) return;
    setChatMessages(prev => [...prev, { role: "user", content: messageToSend }]);
    setChatInput(""); setIsChatting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/Advisor/chat`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ ClassId: Number(id), Message: messageToSend })
      });
      const data = await res.json();
      if (data.success) setChatMessages(prev => [...prev, { role: "ai", content: data.reply }]);
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
        body: JSON.stringify({ ClassId: Number(id) })
      });
      const data = await res.json();
      if (data.success) setChatMessages(prev => [...prev, { role: "ai", content: data.reply }]);
      else setChatMessages(prev => [...prev, { role: "ai", content: "❌ Lỗi quét Radar: " + data.message }]);
    } catch (error) { setChatMessages(prev => [...prev, { role: "ai", content: "❌ Mất kết nối khi quét Radar." }]); } finally { setIsChatting(false); }
  };

  // Logic quản lý Test Case và Tạo Bài Tập
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
                
                {/* AI COPILOT SHEET */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white h-10 rounded-xl shadow-sm shadow-orange-500/20">
                      <Bot className="h-4 w-4 mr-2" /> AI Cố vấn
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-[400px] sm:w-[540px] sm:max-w-none flex flex-col p-0 border-l-orange-500/20">
                    <SheetHeader className="p-5 border-b bg-orange-500/5 text-left shrink-0">
                      <SheetTitle className="flex items-center gap-2 text-orange-500"><Bot className="h-5 w-5"/> AI Cố vấn Học thuật</SheetTitle>
                      <SheetDescription>Phân tích dữ liệu nội bộ lớp {classInfo?.className}</SheetDescription>
                    </SheetHeader>
                    
                    {/* KHU VỰC HIỂN THỊ CHAT */}
                    <div className="flex-1 overflow-y-auto p-5 bg-muted/10 space-y-5" ref={scrollRef}>
                      {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-orange-500 text-white rounded-tr-sm' : 'bg-card border shadow-sm rounded-tl-sm'}`}>
                            {msg.role === 'ai' ? (
                              <div className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {isChatting && (
                        <div className="flex justify-start">
                          <div className="bg-card border shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-orange-500" /><span className="text-xs text-muted-foreground">Đang xử lý...</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* NÚT LỆNH NHANH */}
                    <div className="px-5 py-3 border-t bg-card flex gap-2 overflow-x-auto scrollbar-hide shrink-0">
                      <Button variant="outline" size="sm" className="shrink-0 rounded-full text-xs hover:text-orange-500" onClick={handleRadarScan} disabled={isChatting}>
                        <Radar className="h-3 w-3 mr-1.5 text-red-500" /> Quét Radar Cảnh Báo
                      </Button>
                      <Button variant="outline" size="sm" className="shrink-0 rounded-full text-xs hover:text-orange-500" onClick={() => handleSendMessage("Hãy phân tích xem lớp này đang hay nộp bài sai ở đâu nhất?")} disabled={isChatting}>
                        <FileWarning className="h-3 w-3 mr-1.5" /> Bắt mạch lỗi sai
                      </Button>
                      <Button variant="outline" size="sm" className="shrink-0 rounded-full text-xs hover:text-orange-500" onClick={() => handleSendMessage("Hãy tự động tạo 1 bài tập lập trình cơ bản để vá lỗi cho lớp này.")} disabled={isChatting}>
                        <Sparkles className="h-3 w-3 mr-1.5" /> Giao bài vá lỗi
                      </Button>
                    </div>

                    {/* KHUNG NHẬP CHAT */}
                    <div className="p-4 bg-card border-t shrink-0">
                      <div className="relative flex items-end gap-2">
                        <Textarea 
                          placeholder="Ra lệnh cho AI..." 
                          className="min-h-[52px] max-h-[120px] resize-none bg-muted/50 border-muted focus-visible:ring-orange-500/50 rounded-xl"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                          disabled={isChatting}
                        />
                        <Button onClick={() => handleSendMessage()} disabled={!chatInput.trim() || isChatting} size="icon" className="h-[52px] w-[52px] shrink-0 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-sm">
                          <Send className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>

                {/* DIALOG GIAO BÀI TẬP */}
                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                  <DialogTrigger asChild><Button className="bg-primary hover:bg-primary/90 h-10 rounded-xl shadow-sm"><Plus className="h-4 w-4 mr-2" /> Giao bài</Button></DialogTrigger>
                  <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="flex items-center gap-2 text-xl"><Sparkles className="h-5 w-5 text-warning"/> Soạn Bài tập</DialogTitle></DialogHeader>
                    <div className="space-y-6 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-2"><label className="text-sm font-semibold">Tên bài tập</label><Input value={newEx.title} onChange={e => setNewEx({...newEx, title: e.target.value})} /></div>
                        <div className="space-y-2"><label className="text-sm font-semibold">Độ khó</label><select value={newEx.difficulty} onChange={e => setNewEx({...newEx, difficulty: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary"><option>Cơ bản</option><option>Trung bình</option><option>Nâng cao</option></select></div>
                      </div>
                      <div className="space-y-2"><label className="text-sm font-semibold">Mô tả (Markdown)</label><Textarea value={newEx.description} onChange={e => setNewEx({...newEx, description: e.target.value})} className="min-h-[120px]"/></div>
                      <div className="space-y-2"><label className="text-sm font-semibold">Code Mẫu</label><Textarea value={newEx.starterCode} onChange={e => setNewEx({...newEx, starterCode: e.target.value})} className="min-h-[100px] font-mono text-sm bg-muted/30"/></div>
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

      {/* TABS HỌC THUẬT */}
      <div className="container mx-auto px-6 py-8 max-w-6xl flex-1">
        <Tabs defaultValue="exercises" className="w-full">
          <TabsList className="mb-8 grid w-full md:w-[400px] grid-cols-3 h-12 bg-muted/40 p-1 rounded-xl">
            <TabsTrigger value="exercises" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><Code2 className="h-4 w-4 md:mr-2"/><span className="hidden md:inline">Bài tập</span></TabsTrigger>
            <TabsTrigger value="students" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><Users className="h-4 w-4 md:mr-2"/><span className="hidden md:inline">Thành viên</span></TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><Activity className="h-4 w-4 md:mr-2"/><span className="hidden md:inline">Báo cáo</span></TabsTrigger>
          </TabsList>

          <TabsContent value="exercises" className="focus-visible:outline-none">
            {exercises.length === 0 ? (
              <div className="text-center py-24 text-muted-foreground border border-dashed rounded-2xl bg-card">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20"/> 
                <p className="text-lg font-medium text-foreground">Chưa có bài tập nào</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exercises.map(ex => {
                  // 🌟 KIỂM TRA TRẠNG THÁI HOÀN THÀNH
                  const isDone = ex.isCompleted;

                  return (
                    <Card key={ex.id} className={`p-5 flex flex-col justify-between transition-colors group ${isDone ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10' : 'hover:border-primary/50 bg-card'}`}>
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          
                          {/* HIỂN THỊ BADGE ĐÃ HOÀN THÀNH HOẶC ĐỘ KHÓ */}
                          {isDone ? (
                            <span className="flex items-center text-[10px] uppercase font-bold text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30 px-2.5 py-1 rounded-md border border-green-500/30">
                              <CheckCircle2 className="h-3 w-3 mr-1"/> Đã hoàn thành
                            </span>
                          ) : (
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${ex.difficulty === 'Cơ bản' ? 'bg-success/10 text-success' : ex.difficulty === 'Trung bình' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>
                              {ex.difficulty}
                            </span>
                          )}

                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="h-4 w-4" /></Button>
                        </div>
                        
                        <h3 className={`font-bold text-lg leading-tight mb-2 ${isDone ? 'text-green-700 dark:text-green-400' : 'text-foreground'}`}>
                          {ex.title}
                        </h3>
                        
                        <div className="text-sm text-muted-foreground line-clamp-2 mb-6"><ReactMarkdown>{ex.description}</ReactMarkdown></div>
                      </div>
                      
                      <Button 
                        onClick={() => navigate(`/workspace?id=${ex.id}`)} 
                        variant={isDone ? "outline" : "default"}
                        className={`w-full transition-all ${isDone ? 'border-green-500 text-green-600 hover:bg-green-50' : 'bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground'}`}
                      >
                        <Play className="h-4 w-4 mr-2" /> {isDone ? "Làm lại" : "Vào thực hành"}
                      </Button>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="students" className="focus-visible:outline-none"><Card className="p-16 text-center border-dashed bg-card rounded-2xl"><Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" /><h3 className="text-lg font-bold text-foreground">Danh sách Sinh viên</h3></Card></TabsContent>
          <TabsContent value="analytics" className="focus-visible:outline-none"><Card className="p-16 text-center border-dashed bg-card rounded-2xl"><Activity className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" /><h3 className="text-lg font-bold text-foreground">Báo cáo Phân tích</h3></Card></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClassDetail;