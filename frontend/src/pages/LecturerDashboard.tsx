import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GraduationCap, Star, Sparkles, AlertTriangle, Bot, MessageSquareText, ArrowLeft, Loader2, BookOpen, Code, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// 💡 Import bộ công cụ UI Markdown
import ReactMarkdown from "react-markdown"; 
import remarkGfm from "remark-gfm"; 
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Report {
  id: number;
  exerciseId: number;
  exerciseTitle: string; 
  exerciseDescription: string; 
  studentId: number;
  studentName: string;
  studentIssue: string;
  studentCode?: string;
  originalAIResponse: string;
  createdAt: string;
}

// 💡 ĐÃ KHÔI PHỤC BỘ MARKDOWN COMPONENT Y HỆT NHƯ WORKSPACE ĐỂ HIỆN MÀU XANH LÁ (PRIMARY)
const MarkdownComponents = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
      <div className="relative group my-4">
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          className="rounded-lg border border-[#333] !bg-[#1e1e1e] !p-4 !my-0 shadow-inner font-mono text-sm leading-relaxed"
          {...props}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    ) : (
      // Chữ code nội tuyến hiện màu Primary (Xanh lá)
      <code className="bg-primary/10 text-primary rounded px-1.5 py-0.5 font-mono text-sm" {...props}>
        {children}
      </code>
    );
  },
  p: ({children}: any) => <p className="mb-4 last:mb-0 leading-relaxed text-foreground/90">{children}</p>,
  h1: ({children}: any) => <h1 className="text-xl font-bold text-primary mb-4 mt-6">{children}</h1>,
  h2: ({children}: any) => <h2 className="text-lg font-bold text-primary mb-3 mt-5">{children}</h2>,
  h3: ({children}: any) => <h3 className="font-semibold text-foreground mb-2 mt-4">{children}</h3>,
  ul: ({children}: any) => <ul className="list-disc pl-6 mb-4 space-y-1 text-foreground/80">{children}</ul>,
  ol: ({children}: any) => <ol className="list-decimal pl-6 mb-4 space-y-1 text-foreground/80">{children}</ol>,
  li: ({children}: any) => <li className="leading-relaxed">{children}</li>,
  strong: ({children}: any) => <strong className="font-bold text-foreground">{children}</strong>,
  blockquote: ({children}: any) => <blockquote className="border-l-4 border-primary/50 pl-4 italic text-foreground/60 my-4 bg-primary/5 py-2 rounded-r">{children}</blockquote>,
};

const LecturerDashboard = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth(); 

  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hint, setHint] = useState("");
  
  const [points, setPoints] = useState((user as any)?.rewardPoints || 0);

  // 💡 GỌI API LẤY ĐIỂM CHÍNH XÁC TỪ DATABASE MỖI KHI VÀO TRANG
  useEffect(() => {
    const fetchBalance = async () => {
      if (!user?.email) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/Lecturer/my-points?email=${user.email}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data && data.success) {
          setPoints(data.points);
        }
      } catch (error) {
        console.error("Lỗi lấy điểm:", error);
      }
    };

    fetchBalance();
    fetchPendingFlags();
  }, [user, token]);

  const fetchPendingFlags = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/Lecturer/pending-flags`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setReports(data);
      } else if (data.success && Array.isArray(data.data)) {
        setReports(data.data);
      }
    } catch (error) {
      toast({ title: "Lỗi tải dữ liệu", description: "Không thể kết nối", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedReport = reports.find((r) => r.id === selectedId);

  const handleSubmit = async () => {
    if (!hint.trim()) {
      toast({ title: "Vui lòng nhập bí kíp", variant: "destructive" });
      return;
    }
    if (!user?.email) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/api/Lecturer/resolve-flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ correctionId: selectedId, lecturerEmail: user.email, lecturerHint: hint })
      });
      const data = await response.json();

      if (data.success) {
        setPoints(data.newRewardPoints);
        toast({ title: "Tuyệt vời!", description: "+10 điểm cống hiến 🎉" });
        setReports((prev) => prev.filter((r) => r.id !== selectedId));
        setHint("");
        setSelectedId(null);
      } else {
        toast({ title: "Lỗi", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Lỗi kết nối", description: "Thử lại sau nhé", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex-1 container mx-auto px-6 pt-24 pb-8 flex flex-col gap-6">
        
        {/* 💡 HEADER ĐÃ ĐƯỢC CẬP NHẬT THÊM NÚT ĐỔI QUÀ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Workspace Giảng viên</h1>
              <p className="text-sm text-muted-foreground">Phân tích code & Dạy AI</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge className="gap-1.5 px-4 py-2.5 text-sm bg-warning/10 text-warning border-warning/20 font-bold">
              <Star className="h-4 w-4 fill-current" /> Điểm cống hiến: {points}
            </Badge>
            <Button 
              onClick={() => navigate('/rewards')}
              className="bg-gradient-to-r from-orange-400 to-rose-400 hover:from-orange-500 hover:to-rose-500 text-white shadow-glow border-0 rounded-xl px-5 h-10 font-bold"
            >
              <Gift className="h-4 w-4 mr-2" />
              Đổi Quà
            </Button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 min-h-0">
          {/* CỘT TRÁI - DANH SÁCH BÁO CÁO */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h2 className="text-sm font-semibold">Cần bạn hỗ trợ</h2>
              <Badge variant="secondary" className="ml-auto text-xs">{reports.length}</Badge>
            </div>

            <ScrollArea className="flex-1 -mx-1 px-1">
              <div className="space-y-2 pb-2">
                {isLoading ? (
                  <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground border border-dashed rounded-xl">Không có lỗi AI nào!</div>
                ) : (
                  reports.map((report) => (
                    <motion.div key={report.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      <Card
                        className={`cursor-pointer transition-all border ${selectedId === report.id ? "border-primary bg-primary/5 shadow-md" : "hover:border-primary/30"}`}
                        onClick={() => { setSelectedId(report.id); setHint(""); }}
                      >
                        <CardContent className="p-4 space-y-2">
                          <p className="text-sm font-semibold line-clamp-1"><BookOpen className="inline-block w-3.5 h-3.5 mr-1.5 text-primary" />{report.exerciseTitle}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{report.studentIssue}</p>
                          <div className="flex justify-between mt-3 pt-2 border-t text-[10px] text-muted-foreground">
                            <span className="font-medium">{report.studentName}</span>
                            <span>{formatTime(report.createdAt)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* CỘT PHẢI - CHI TIẾT BÁO CÁO */}
          <AnimatePresence mode="wait">
            {!selectedReport ? (
              <motion.div key="empty" className="flex items-center justify-center rounded-2xl border border-dashed bg-muted/30">
                <div className="text-center text-muted-foreground"><MessageSquareText className="h-8 w-8 mx-auto mb-3 opacity-50" /> Chọn 1 báo cáo bên trái để xem code</div>
              </motion.div>
            ) : (
              <motion.div key={selectedReport.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="h-full">
                <Card className="border-border shadow-sm rounded-2xl h-full flex flex-col overflow-hidden">
                  <ScrollArea className="flex-1 bg-muted/10">
                    <CardContent className="p-6 space-y-6">
                      
                      {/* Tiêu đề & Đề bài */}
                      <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-3">
                          {selectedReport.exerciseTitle}
                        </h2>
                        <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
                          <div className="flex items-center gap-2 mb-2"><BookOpen className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold text-primary">Nội dung đề bài</h3></div>
                          <div className="text-sm opacity-80 max-h-24 overflow-y-auto custom-scrollbar">
                             <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedReport.exerciseDescription}</ReactMarkdown>
                          </div>
                        </div>
                      </div>

                      {/* CODE CỦA SINH VIÊN (DARK THEME) */}
                      {selectedReport.studentCode && (
                        <div className="rounded-xl border border-[#333] overflow-hidden bg-[#1e1e1e]">
                          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#333] bg-[#252526]">
                            <Code className="h-4 w-4 text-emerald-400" />
                            <h3 className="text-sm font-semibold text-gray-200">Code sinh viên đã viết</h3>
                          </div>
                          <div className="max-h-64 overflow-y-auto custom-scrollbar">
                            <SyntaxHighlighter
                              style={vscDarkPlus}
                              language="python"
                              PreTag="div"
                              className="!bg-transparent !p-4 !m-0 text-[13px] font-mono"
                            >
                              {selectedReport.studentCode}
                            </SyntaxHighlighter>
                          </div>
                        </div>
                      )}

                      {/* LỜI THAN PHIỀN CỦA SINH VIÊN */}
                      <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <h3 className="text-sm font-bold text-destructive">Sinh viên báo cáo:</h3>
                        </div>
                        <p className="text-sm text-foreground/90 font-medium whitespace-pre-wrap">{selectedReport.studentIssue}</p>
                      </div>

                      {/* CÂU TRẢ LỜI CỦA AI ĐÃ ĐƯỢC CHỈNH MÀU NỀN ĐỂ CHỮ XANH LÁ HIỆN ĐẸP NHẤT */}
                      <div className="rounded-xl bg-background border border-border p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/50">
                          <Bot className="h-5 w-5 text-primary" />
                          <h3 className="text-sm font-bold text-foreground">AI đã phân tích như sau:</h3>
                        </div>
                        <div className="text-[13px] text-foreground/90 leading-relaxed max-h-64 overflow-y-auto custom-scrollbar prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                              {selectedReport.originalAIResponse}
                          </ReactMarkdown>
                        </div>
                      </div>

                      {/* KHUNG SOẠN BÍ KÍP */}
                      <div className="space-y-3 pt-4 border-t border-border">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-warning fill-warning/20" />
                          <h3 className="text-base font-bold">Nhập Bí kíp để huấn luyện AI</h3>
                        </div>
                        <Textarea
                          value={hint}
                          onChange={(e) => setHint(e.target.value)}
                          placeholder="👉 Ví dụ: Em sinh viên đang dùng sai vòng lặp while, hãy nhắc em ấy kiểm tra lại biến đếm i..."
                          className="min-h-[120px] rounded-xl border-primary/20 focus:border-primary text-sm shadow-sm"
                        />
                        <div className="flex justify-end pt-2">
                          <Button size="lg" onClick={handleSubmit} disabled={isSubmitting} className="bg-gradient-primary rounded-xl shadow-glow">
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                            Cập nhật não AI (+10 điểm)
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </ScrollArea>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default LecturerDashboard;