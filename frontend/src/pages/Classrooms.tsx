import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
// 🌟 ĐÃ THÊM ICON RADAR VÀO ĐÂY
import { Users, PlusCircle, BrainCircuit, Send, Loader2, AlertTriangle, FileWarning, Sparkles, UserCheck, MessageSquare, LogIn, ArrowRight, GraduationCap, BookOpen, Radar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ClassInfo { id: number; className: string; joinCode: string; studentCount: number; createdAt: string; lecturerName?: string; joinedAt?: string; }
interface ChatMessage { role: "user" | "ai"; content: string; }

const Classrooms = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const userRole = (user as any)?.role;

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // States cho Giảng viên
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // States cho Sinh viên
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (token) fetchClasses();
  }, [token, userRole]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatMessages]);

  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Class/my-classes`, { headers: { "Authorization": `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setClasses(data.data);
        if (userRole === "Lecturer" || userRole === "Admin") {
          if (data.data.length > 0) {
            setSelectedClass(data.data[0]);
            fetchChatHistory(data.data[0].id, data.data[0].className); // Lấy lịch sử lớp đầu tiên
          }
        }
      }
    } catch (error) { toast({ title: "Lỗi tải lớp học", variant: "destructive" }); } finally { setIsLoading(false); }
  };

  // 🌟 HÀM MỚI: TẢI LỊCH SỬ CHAT TỪ DATABASE
  const fetchChatHistory = async (classId: number, className: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/Advisor/history/${classId}`, { headers: { "Authorization": `Bearer ${token}` } });
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setChatMessages(data.data); // Hiện lịch sử cũ
      } else {
        // Nếu lớp mới chưa có lịch sử, gửi câu chào mặc định
        setChatMessages([{ role: "ai", content: `Chào Thầy/Cô. Em đã kết nối với dữ liệu lớp **${className}**. Thầy/Cô cần em phân tích gì ạ?` }]);
      }
    } catch (error) { 
      console.error("Lỗi tải lịch sử chat"); 
    }
  };

  // ============ CHỨC NĂNG GIẢNG VIÊN ============
  const handleCreateClass = async () => {
    const className = window.prompt("Nhập tên Lớp học mới (VD: C++ Cơ bản Sáng T2):");
    if (!className || className.trim() === "") return;
    setIsCreatingClass(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Class/create`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ ClassName: className })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Thành công", description: `Đã tạo lớp. Mã: ${data.data.joinCode}` });
        fetchClasses();
      } else toast({ title: "Lỗi", description: data.message, variant: "destructive" });
    } catch (error) { toast({ title: "Lỗi hệ thống", variant: "destructive" }); } finally { setIsCreatingClass(false); }
  };

  const handleSendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || chatInput;
    if (!messageToSend.trim() || !selectedClass || isChatting) return;

    setChatMessages(prev => [...prev, { role: "user", content: messageToSend }]);
    setChatInput(""); setIsChatting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/Advisor/chat`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ ClassId: selectedClass.id, Message: messageToSend })
      });
      const data = await res.json();
      if (data.success) setChatMessages(prev => [...prev, { role: "ai", content: data.reply }]);
      else setChatMessages(prev => [...prev, { role: "ai", content: "❌ Lỗi: " + data.message }]);
    } catch (error) { setChatMessages(prev => [...prev, { role: "ai", content: "❌ Mất kết nối." }]); } finally { setIsChatting(false); }
  };

  // ==========================================
  // 🌟 HÀM KÍCH HOẠT RADAR (KỸ NĂNG 3)
  // ==========================================
  const handleRadarScan = async () => {
    if (!selectedClass || isChatting) return;

    // Gửi lệnh ảo lên màn hình chat để báo hiệu đang quét
    const promptMessage = "📡 Hãy quét Radar và báo cáo tình hình sinh viên yếu kém hiện tại.";
    setChatMessages(prev => [...prev, { role: "user", content: promptMessage }]);
    setIsChatting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/Advisor/radar-scan`, {
        method: "POST", 
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ ClassId: selectedClass.id })
      });
      const data = await res.json();
      
      if (data.success) {
         setChatMessages(prev => [...prev, { role: "ai", content: data.reply }]);
      } else {
         setChatMessages(prev => [...prev, { role: "ai", content: "❌ Lỗi quét Radar: " + data.message }]);
      }
    } catch (error) { 
      setChatMessages(prev => [...prev, { role: "ai", content: "❌ Mất kết nối khi quét Radar." }]); 
    } finally { 
      setIsChatting(false); 
    }
  };

  // ============ CHỨC NĂNG SINH VIÊN ============
  const handleJoinClass = async () => {
    if (!joinCode.trim()) return toast({ title: "Vui lòng nhập mã lớp", variant: "destructive" });
    setIsJoining(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Class/join`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ JoinCode: joinCode.toUpperCase() })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Thành công", description: data.message });
        setJoinCode(""); fetchClasses();
      } else toast({ title: "Lỗi", description: data.message, variant: "destructive" });
    } catch (error) { toast({ title: "Lỗi hệ thống", variant: "destructive" }); } finally { setIsJoining(false); }
  };

  // ============ RENDER UI ============
  return (
    <div className="h-screen bg-background flex flex-col font-sans overflow-hidden">
      <Navbar />
      <div className="flex-1 container mx-auto px-6 pt-20 pb-6 flex flex-col h-full min-h-0">
        
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h1 className="text-2xl font-bold">Lớp học ({userRole === "Student" ? "Sinh viên" : "Giảng viên"})</h1>
            <p className="text-sm text-muted-foreground">{userRole === "Student" ? "Tham gia lớp học của giảng viên" : "Quản lý lớp & Phân tích bằng AI"}</p>
          </div>
          
          {/* Nút hành động trên góc phải tùy theo Role */}
          {userRole === "Student" ? (
            <div className="flex items-center gap-2">
              <Input placeholder="Nhập mã lớp (VD: INNOX1)" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} className="w-48 bg-card" />
              <Button onClick={handleJoinClass} disabled={isJoining} className="bg-primary">{isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />} Vào Lớp</Button>
            </div>
          ) : (
            <Button onClick={handleCreateClass} disabled={isCreatingClass} className="bg-primary">{isCreatingClass ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4 mr-2" />} Tạo Lớp Mới</Button>
          )}
        </div>

        {/* NỘI DUNG CHÍNH */}
        <div className={`flex-1 min-h-0 ${userRole === "Student" ? "flex flex-col" : "grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6"}`}>
          
          {/* CỘT TRÁI (Hoặc Toàn màn hình nếu là SV) - DANH SÁCH LỚP */}
          <div className="flex flex-col h-full overflow-hidden">
            <Card className="flex-1 border-border shadow-sm flex flex-col overflow-hidden bg-card">
              <ScrollArea className="flex-1 p-4">
                {isLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : classes.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-4 opacity-20" /> Bạn chưa tham gia/tạo lớp học nào.</div>
                ) : (
                  <div className={userRole === "Student" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                    {classes.map((cls) => (
                      <div 
                        key={cls.id} 
                        onClick={() => { 
                          if (userRole !== "Student") { 
                            setSelectedClass(cls); 
                            fetchChatHistory(cls.id, cls.className); // 🌟 GỌI HÀM LẤY LỊCH SỬ KHI BẤM CHỌN LỚP
                          } 
                        }}
                        className={`p-5 rounded-xl border transition-all ${userRole !== "Student" ? "cursor-pointer" : ""} ${selectedClass?.id === cls.id ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary/20' : 'border-border bg-background hover:border-primary/50'}`}
                      >
                        <h3 className="font-bold text-lg text-foreground mb-1">{cls.className}</h3>
                        
                        {/* 🌟 ĐÃ CẬP NHẬT GIAO DIỆN NÚT VÀO HỌC / QUẢN LÝ BÀI TẬP */}
                        {userRole === "Student" ? (
                          <>
                            <p className="text-sm text-muted-foreground mb-4 flex items-center"><GraduationCap className="h-4 w-4 mr-1.5"/> GV: {cls.lecturerName}</p>
                            <Button variant="outline" className="w-full justify-between" onClick={() => navigate(`/classrooms/${cls.id}`)}>
                              Vào Lớp Học <ArrowRight className="h-4 w-4"/>
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between items-center mt-4">
                              <Badge variant="secondary" className="font-mono px-2 py-1">Mã: <span className="text-primary ml-1">{cls.joinCode}</span></Badge>
                              <span className="text-sm font-semibold text-muted-foreground flex items-center"><UserCheck className="h-4 w-4 mr-1.5" /> {cls.studentCount} SV</span>
                            </div>
                            <Button variant="secondary" className="w-full mt-3 bg-primary/10 text-primary hover:bg-primary/20" onClick={(e) => { e.stopPropagation(); navigate(`/classrooms/${cls.id}`); }}>
                              <BookOpen className="h-4 w-4 mr-2"/> Quản lý bài tập
                            </Button>
                          </>
                        )}

                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </Card>
          </div>

          {/* CỘT PHẢI - AI ACADEMIC ADVISOR (CHỈ HIỆN VỚI GIẢNG VIÊN) */}
          {userRole !== "Student" && (
            <div className="flex flex-col h-full overflow-hidden">
              <Card className="flex-1 flex flex-col border-primary/20 shadow-md overflow-hidden bg-card">
                <CardHeader className="border-b bg-gradient-to-r from-primary/10 to-transparent py-3 px-6 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-md"><BrainCircuit className="h-5 w-5 text-white" /></div>
                    <div><CardTitle className="text-lg">AI Cố vấn Học thuật</CardTitle><CardDescription className="text-xs">{selectedClass ? `Phân tích: ${selectedClass.className}` : 'Chọn lớp...'}</CardDescription></div>
                  </div>
                </CardHeader>
                <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
                  {!selectedClass ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50"><MessageSquare className="h-12 w-12 mb-3" /><p>Chọn lớp để trò chuyện.</p></div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted/50 border border-border text-foreground rounded-tl-sm shadow-sm'}`}>
                          {msg.role === 'ai' ? <div className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed"><ReactMarkdown>{msg.content}</ReactMarkdown></div> : <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                        </div>
                      </div>
                    ))
                  )}
                  {isChatting && <div className="flex justify-start"><div className="bg-muted/50 border border-border rounded-2xl rounded-tl-sm px-5 py-3 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-primary" /><span className="text-xs text-muted-foreground">Đang phân tích Database...</span></div></div>}
                </div>
                {selectedClass && (
                  <div className="px-6 py-2 border-t bg-muted/20 flex gap-2 overflow-x-auto scrollbar-hide shrink-0">
                    <Button variant="outline" size="sm" className="shrink-0 rounded-full text-xs hover:bg-primary/10" onClick={() => handleSendMessage("Hãy phân tích xem lớp này đang hay nộp bài sai ở đâu nhất?")}><FileWarning className="h-3 w-3 mr-1.5 text-orange-500" /> Bắt mạch lỗi sai</Button>
                    
                    {/* 🌟 ĐÃ THAY THẾ NÚT "TÌM SV CÁ BIỆT" BẰNG NÚT RADAR CẢNH BÁO */}
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="shrink-0 rounded-full text-xs shadow-md shadow-red-500/20" 
                      onClick={handleRadarScan}
                    >
                      <Radar className="h-3 w-3 mr-1.5 animate-pulse" /> 
                      Quét Radar Cảnh Báo
                    </Button>

                    <Button variant="outline" size="sm" className="shrink-0 rounded-full text-xs hover:bg-primary/10" onClick={() => handleSendMessage("Hãy tự động tạo 1 bài tập lập trình cơ bản để vá lỗi cho lớp này.")}><Sparkles className="h-3 w-3 mr-1.5 text-purple-500" /> Giao bài vá lỗi</Button>
                  </div>
                )}
                <div className="p-3 border-t bg-card shrink-0">
                  <div className="relative flex items-center">
                    <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder="Ra lệnh cho AI..." disabled={!selectedClass || isChatting} className="w-full resize-none rounded-xl border border-input bg-background pl-4 pr-12 py-2.5 text-sm outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50" rows={1} />
                    <Button onClick={() => handleSendMessage()} disabled={!chatInput.trim() || !selectedClass || isChatting} size="icon" className="absolute right-2 h-7 w-7 rounded-lg bg-primary hover:bg-primary/90"><Send className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Classrooms;