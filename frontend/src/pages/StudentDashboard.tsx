import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LayoutDashboard, MessageSquareWarning, Clock, CheckCircle2, Eye, X, 
  Sparkles, Bot, Code2, Terminal, BookOpen, Trophy, History, Layers, 
  FolderOpen, Wand2, Loader2, AlertCircle, BookHeart, Trash2, ChevronRight, Brain
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

// Import các UI Component
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// 🌟 THÊM IMPORT GÓC ÔN TẬP
import DailyReviewsTab from "@/components/dashboard/DailyReviewsTab";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Course { id: number; title: string; }
interface Lesson { id: number; courseId: number; title: string; orderNum: number; }
interface Exercise { id: number; lessonId: number; title: string; description: string; difficulty: string; }
interface Submission {
  id: number; exerciseId: number; language: string; code: string; 
  status: string; passedTests: number; totalTests: number; submittedAt: string;
}

// 💡 INTERFACE MỚI CHO LỊCH SỬ BÁO CÁO AI
interface ReportHistory {
  id: number;
  exerciseId: number;
  exerciseTitle: string;
  studentIssue: string;
  originalAIResponse: string;
  isResolved: boolean;
  lecturerHint?: string;
  lecturerName?: string;
  createdAt: string;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const { user, token } = useAuth();

  const [mainTab, setMainTab] = useState<"overview" | "reports">(tabParam === "reports" ? "reports" : "overview");

  // 💡 LẮNG NGHE URL ĐỂ TỰ ĐỘNG CHUYỂN TAB KHI BẤM VÀO CHUÔNG
  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (currentTab === "reports") {
      setMainTab("reports");
    } else {
      setMainTab("overview");
    }
  }, [searchParams]);
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [reports, setReports] = useState<ReportHistory[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isReportsLoading, setIsReportsLoading] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<number[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportHistory | null>(null);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [genLanguage, setGenLanguage] = useState("Python");
  const [genDifficulty, setGenDifficulty] = useState("Cơ bản");
  const [genTopic, setGenTopic] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const fetchPromises = [
          fetch(`${API_BASE_URL}/api/Courses`).then(res => res.json()),
          fetch(`${API_BASE_URL}/api/Lessons`).then(res => res.json()),
          fetch(`${API_BASE_URL}/api/Exercises`).then(res => res.json())
        ];

        if (user?.email) {
          fetchPromises.push(fetch(`${API_BASE_URL}/api/CodeExecution/submissions/${user.email}`).then(res => res.json()));
          fetchPromises.push(fetch(`${API_BASE_URL}/api/SavedAI/user/${user.email}`).then(res => res.json()));
        }

        const results = await Promise.all(fetchPromises);
        
        setCourses(results[0]);
        setLessons(results[1]);
        setExercises(results[2]);

        if (user?.email) {
          if (Array.isArray(results[3])) {
            setSubmissions(results[3]);
            const completedIds = results[3].filter((sub: any) => sub.status === "Accepted").map((sub: any) => sub.exerciseId);
            setCompletedExercises([...new Set(completedIds)]);
          }
          if (Array.isArray(results[4])) setSavedItems(results[4]);
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.email]);

  // 💡 FETCH REPORTS KHI CHUYỂN SANG TAB "GÓC THẮC MẮC" HOẶC KHI CÓ PARAM URL MỚI
  useEffect(() => {
    if (mainTab === "reports" && user?.email && token) {
      const fetchMyReports = async () => {
        setIsReportsLoading(true);
        try {
          const res = await fetch(`${API_BASE_URL}/api/AIAssistant/my-reports?email=${user.email}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) {
            setReports(data.data);
            
            // Nếu có reportId trên URL, tự động mở popup
            const reportIdUrl = searchParams.get("reportId");
            if (reportIdUrl) {
              const found = data.data.find((r: ReportHistory) => r.id === Number(reportIdUrl));
              if (found) setSelectedReport(found);
            }
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsReportsLoading(false);
        }
      };
      fetchMyReports();
    }
  }, [mainTab, user, token, searchParams]);

  const handleGenerateAIExercise = async () => {
    if (!genTopic.trim()) return setGenError("Vui lòng nhập chủ đề!");
    setGenError(""); setIsGenerating(true);
    try {
      // 🌟 KÍCH HOẠT ADAPTIVE ENGINE BẰNG CÁCH TRUYỀN THÊM StudentEmail
      const response = await fetch(`${API_BASE_URL}/api/AIAssistant/generate-exercise`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ 
          Language: genLanguage, 
          Topic: genTopic, 
          Difficulty: genDifficulty,
          StudentEmail: user?.email // Thêm trường này để AI tự quét Hồ sơ năng lực
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setIsAiModalOpen(false);
        const langMap: Record<string, string> = { "C++": "cpp", "Python": "python", "Java": "java", "JavaScript": "javascript" };
        navigate(`/ai-lesson/${data.exerciseId}`, { 
          state: { 
            exercise: {
              id: data.exerciseId, title: data.data.Title || data.data.title, description: data.data.Description || data.data.description,
              difficulty: data.data.Difficulty || data.data.difficulty, testCases: JSON.stringify(data.data.TestCases || data.data.testCases || []),
              starterCode: data.data.StarterCode || data.data.starterCode || ""
            }, 
            isAIGenerated: true, exerciseData: data.data, pastLanguage: langMap[genLanguage] || "python", popupLanguage: genLanguage 
          } 
        });
      } else setGenError(data.message || "Lỗi tạo bài tập");
    } catch (error) { setGenError("Lỗi kết nối máy chủ"); } finally { setIsGenerating(false); }
  };

  const handleDeleteSavedItem = async (id: number) => {
    if (!window.confirm("Xóa bài này khỏi thư viện?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/SavedAI/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } });
      if (response.ok) setSavedItems(prev => prev.filter(item => item.id !== id));
    } catch (error) { console.error(error); }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff?.toLowerCase()) {
      case 'easy': return 'bg-success/10 text-success border-success/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'hard': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Accepted') return <Badge className="bg-success hover:bg-success">Thành công</Badge>;
    if (status === 'Wrong Answer') return <Badge variant="destructive">Sai kết quả</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const getExerciseTitle = (id: number) => exercises.find(e => e.id === id)?.title || `Bài tập #${id}`;
  const getLanguageInfo = (courseTitle: string) => {
    const t = courseTitle.toLowerCase();
    if (t.includes("c++") || t.includes("cpp")) return { wsLang: "cpp", dispLang: "C++" };
    if (t.includes("javascript") || t.includes("js")) return { wsLang: "javascript", dispLang: "JavaScript" };
    if (t.includes("java")) return { wsLang: "java", dispLang: "Java" };
    return { wsLang: "python", dispLang: "Python" };
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Navbar variant="default" />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 mt-2">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Chào mừng trở lại! 👋</h1>
              <p className="text-muted-foreground text-lg">Bạn đã hoàn thành <span className="font-bold text-primary">{completedExercises.length}/{exercises.length}</span> bài tập.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-accent/10 text-accent rounded-full border border-accent/20 font-bold text-sm uppercase tracking-wider">
                  <Trophy className="h-4 w-4" /> {(user as any)?.rewardPoints || completedExercises.length * 10} Điểm kinh nghiệm
              </div>
              <Button onClick={() => setIsAiModalOpen(true)} className="rounded-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-glow px-5 py-2.5 font-bold">
                <Wand2 className="h-4 w-4 mr-2" /> AI tạo bài tập
              </Button>
            </div>
        </div>

        {/* 💡 2 TABS CHÍNH: TỔNG QUAN & GÓC THẮC MẮC */}
        <div className="flex gap-6 mb-6 border-b border-border">
          <button
            onClick={() => { setMainTab("overview"); navigate("/student-dashboard"); }}
            className={`pb-3 px-2 text-sm font-semibold transition-colors relative ${mainTab === "overview" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <span className="flex items-center gap-2"><LayoutDashboard className="h-4 w-4"/> Tổng quan Học tập</span>
            {mainTab === "overview" && <motion.div layoutId="mainTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
          <button
            onClick={() => { setMainTab("reports"); navigate("/student-dashboard?tab=reports"); }}
            className={`pb-3 px-2 text-sm font-semibold transition-colors relative ${mainTab === "reports" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <span className="flex items-center gap-2"><MessageSquareWarning className="h-4 w-4"/> Góc thắc mắc (Báo cáo AI)</span>
            {mainTab === "reports" && <motion.div layoutId="mainTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {mainTab === "overview" ? (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Tabs defaultValue="exercises" className="space-y-8">
                <TabsList className="bg-card border border-border">
                  <TabsTrigger value="exercises" className="gap-2"><BookOpen className="h-4 w-4" /> Lộ trình học</TabsTrigger>
                  {/* 🌟 TAB MỚI: GÓC ÔN TẬP */}
                  <TabsTrigger value="daily-reviews" className="gap-2 text-purple-600 data-[state=active]:text-purple-700 data-[state=active]:bg-purple-100/50">
                    <Brain className="h-4 w-4" /> Góc Ôn Tập
                  </TabsTrigger>
                  <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> Lịch sử nộp</TabsTrigger>
                  <TabsTrigger value="library" className="gap-2"><BookHeart className="h-4 w-4" /> Thư viện AI</TabsTrigger>
                </TabsList>

                {/* TAB LỘ TRÌNH */}
                <TabsContent value="exercises" className="focus:outline-none">
                  {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{Array(3).fill(0).map((_, i) => <div key={i} className="h-64 bg-card rounded-3xl border border-border animate-pulse shadow-card" />)}</div>
                  ) : courses.length > 0 ? (
                    <Tabs defaultValue={courses[0].id.toString()} className="w-full">
                      <div className="overflow-x-auto pb-2 mb-6 scrollbar-hide">
                        <TabsList className="flex w-max h-auto gap-2 bg-transparent p-0">
                          {courses.map(course => (
                            <TabsTrigger key={course.id} value={course.id.toString()} className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow rounded-full px-6 py-2.5 font-semibold transition-all border border-border data-[state=active]:border-transparent bg-card hover:bg-muted">
                              <Layers className="h-4 w-4 mr-2" /> {course.title}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </div>
                      {courses.map(course => {
                        const courseLessons = lessons.filter(l => l.courseId === course.id).sort((a, b) => a.orderNum - b.orderNum);
                        const langInfo = getLanguageInfo(course.title);
                        return (
                          <TabsContent key={course.id} value={course.id.toString()} className="space-y-10">
                            {courseLessons.length === 0 ? (
                              <div className="bg-card rounded-3xl border-2 border-dashed py-16 text-center shadow-sm"><FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-50" /><p>Khóa học này chưa có bài học nào.</p></div>
                            ) : (
                              courseLessons.map(lesson => {
                                const lessonExercises = exercises.filter(e => e.lessonId === lesson.id);
                                if (lessonExercises.length === 0) return null;
                                return (
                                  <div key={lesson.id} className="space-y-4">
                                    <div className="flex items-center gap-2 border-b pb-2">
                                      <h2 className="text-xl font-bold flex items-center"><span className="text-primary mr-2">Bài {lesson.orderNum}:</span> {lesson.title}</h2>
                                      <Badge variant="secondary" className="ml-2 font-mono">{lessonExercises.length} bài</Badge>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                      {lessonExercises.map((ex, index) => {
                                        const isCompleted = completedExercises.includes(ex.id);
                                        return (
                                          <div key={ex.id} className={`group p-5 rounded-2xl border transition-all flex flex-col h-full ${isCompleted ? 'bg-success/5 border-success/20' : 'bg-card hover:-translate-y-1'}`}>
                                            <div className="flex justify-between items-start mb-3">
                                              <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getDifficultyColor(ex.difficulty)}`}>{ex.difficulty || 'CƠ BẢN'}</div>
                                              {isCompleted && <CheckCircle2 className="h-4 w-4 text-success" />}
                                            </div>
                                            <h3 className={`text-lg font-bold mb-2 line-clamp-2 ${isCompleted ? 'text-success' : 'group-hover:text-primary'}`}><span className="text-muted-foreground mr-2 font-mono text-sm">Bài {index + 1}</span> {ex.title}</h3>
                                            <p className="text-sm mb-6 flex-1 line-clamp-2 text-muted-foreground">{ex.description}</p>
                                            <div className="flex items-center gap-2 mt-auto">
                                              <button onClick={() => navigate(`/ai-lesson/${ex.id}`, { state: { exercise: ex, popupLanguage: langInfo.dispLang } })} className="flex-1 flex items-center justify-center font-bold rounded-xl h-10 text-sm bg-accent/10 text-accent hover:bg-accent hover:text-white border border-accent/20"><Sparkles className="h-4 w-4 mr-1.5" /> Gợi ý</button>
                                              <button onClick={() => navigate(`/workspace/${ex.id}`, { state: { pastLanguage: langInfo.wsLang } })} className={`flex-[2] flex items-center justify-center font-bold rounded-xl h-10 text-sm ${isCompleted ? 'bg-success/10 text-success' : 'bg-muted hover:bg-primary hover:text-primary-foreground'}`}>{isCompleted ? "Xem lại" : "Giải ngay"} <ChevronRight className="ml-1 h-4 w-4" /></button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </TabsContent>
                        );
                      })}
                    </Tabs>
                  ) : (<div className="bg-card rounded-3xl border-2 border-dashed py-20 text-center"><p>Hệ thống chưa có dữ liệu...</p></div>)}
                </TabsContent>

                {/* 🌟 TAB GÓC ÔN TẬP */}
                <TabsContent value="daily-reviews" className="focus:outline-none mt-6">
                  <DailyReviewsTab />
                </TabsContent>

                {/* TAB LỊCH SỬ NỘP */}
                <TabsContent value="history"><Card><CardContent className="p-0 overflow-x-auto"><Table>
                  <TableHeader><TableRow><TableHead>Mã số</TableHead><TableHead>Tên bài tập</TableHead><TableHead>Thời gian nộp</TableHead><TableHead>Ngôn ngữ</TableHead><TableHead className="text-center">Số Test Cases</TableHead><TableHead className="text-right">Trạng thái</TableHead></TableRow></TableHeader>
                  <TableBody>{submissions.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-12">Chưa có lịch sử nộp bài.</TableCell></TableRow> : submissions.map(sub => <TableRow key={sub.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/workspace/${sub.exerciseId}`, { state: { pastCode: sub.code, pastLanguage: sub.language } })}><TableCell>#{sub.id}</TableCell><TableCell className="font-bold">{getExerciseTitle(sub.exerciseId)}</TableCell><TableCell>{new Date(sub.submittedAt).toLocaleString('vi-VN')}</TableCell><TableCell><Badge variant="outline"><Terminal className="h-3 w-3 mr-1" /> {sub.language}</Badge></TableCell><TableCell className="text-center"><span className="font-bold">{sub.passedTests}</span> / {sub.totalTests}</TableCell><TableCell className="text-right">{getStatusBadge(sub.status)}</TableCell></TableRow>)}</TableBody>
                </Table></CardContent></Card></TabsContent>

                {/* TAB THƯ VIỆN AI */}
                <TabsContent value="library">
                  {savedItems.length === 0 ? <div className="bg-card rounded-3xl border-2 border-dashed py-20 text-center"><BookHeart className="h-12 w-12 mx-auto mb-4 opacity-30" /><h3 className="font-bold mb-2">Thư viện trống!</h3><Button onClick={() => setIsAiModalOpen(true)} variant="outline"><Wand2 className="mr-2 h-4 w-4"/> Bắt đầu tạo bài</Button></div> : 
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">{savedItems.map((item, i) => <div key={i} className="group p-5 rounded-2xl bg-card border shadow-card flex flex-col h-full"><div className="flex justify-between mb-3"><Badge variant="outline" className="text-[10px] text-pink-500 border-pink-500/30 bg-pink-500/10">{item.contentType === "Lesson" ? "Bài giảng AI" : "Bài tập AI"}</Badge><div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{new Date(item.savedAt).toLocaleDateString('vi-VN')}</span><button onClick={() => handleDeleteSavedItem(item.id)} className="hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div></div><h3 className="text-lg font-bold mb-2 line-clamp-2">{item.title}</h3><div className="flex gap-2 mb-4 text-xs font-mono text-muted-foreground"><Terminal className="h-3.5 w-3.5" /> {item.language || "N/A"} <span className="bg-muted px-1.5 rounded">Độ khó: {item.difficulty}</span></div><div className="mt-auto">{item.contentType === "Lesson" ? <Button onClick={() => navigate(`/ai-lesson/saved-${item.id}`, { state: { exercise: item, popupLanguage: item.language, savedLessonContent: item.starterCode } })} className="w-full bg-accent/10 text-accent hover:bg-accent border-accent/20"><BookOpen className="mr-2 h-4 w-4" /> Ôn tập lại</Button> : <Button onClick={() => navigate(`/workspace/saved-${item.id}`, { state: { isAIGenerated: true, pastLanguage: item.language, exerciseData: { ...item, testCases: JSON.parse(item.testCases || "[]") } } })} className="w-full"><Code2 className="mr-2 h-4 w-4" /> Giải bài này</Button>}</div></div>)}</div>}
                </TabsContent>
              </Tabs>
            </motion.div>
          ) : (
            
            /* TAB: GÓC THẮC MẮC (LỊCH SỬ BÁO CÁO) */
            <motion.div key="reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border flex items-center justify-between">
                  <h2 className="font-bold text-lg text-foreground">Lịch sử nhờ Giảng viên hỗ trợ</h2>
                  <Badge variant="secondary">{reports.length} báo cáo</Badge>
                </div>
                <ScrollArea className="h-[500px]">
                  {isReportsLoading ? (
                    <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : reports.length === 0 ? (
                    <div className="text-center p-12 text-muted-foreground flex flex-col items-center">
                      <MessageSquareWarning className="h-10 w-10 mb-3 opacity-20" />
                      Bạn chưa có báo cáo thắc mắc nào.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {reports.map((report) => (
                        <div key={report.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-bold text-foreground line-clamp-1">{report.exerciseTitle}</h3>
                              {report.isResolved ? (
                                <Badge className="bg-success/10 text-success hover:bg-success/20 border-success/20 gap-1.5 shadow-none">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Đã giải đáp
                                </Badge>
                              ) : (
                                <Badge className="bg-warning/10 text-warning hover:bg-warning/20 border-warning/20 gap-1.5 shadow-none">
                                  <Clock className="h-3.5 w-3.5" /> Đang chờ thầy cô
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1 italic">Bạn hỏi: "{report.studentIssue}"</p>
                            <p className="text-xs text-muted-foreground/60">{formatTime(report.createdAt)}</p>
                          </div>
                          
                          {report.isResolved && (
                            <Button variant="outline" onClick={() => setSelectedReport(report)} className="shrink-0 border-primary text-primary hover:bg-primary/5 hover:text-primary">
                              <Eye className="h-4 w-4 mr-2" /> Xem giải đáp
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* MODAL TẠO BÀI TẬP AI */}
      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="sm:max-w-[500px]"><DialogHeader><DialogTitle className="flex gap-2"><Sparkles className="h-6 w-6 text-primary" /> AI Tạo Bài Tập</DialogTitle><DialogDescription>Chọn các thông số dưới đây, AI sẽ tạo ra một bài tập hoàn toàn mới.</DialogDescription></DialogHeader><div className="space-y-6 py-4">{genError && <div className="p-3 bg-destructive/10 text-destructive text-sm flex gap-2 border"><AlertCircle className="h-4 w-4" />{genError}</div>}<div className="space-y-3"><label className="text-sm font-bold">Ngôn ngữ lập trình</label><div className="flex flex-wrap gap-2">{["C++", "Python", "Java", "JavaScript"].map(lang => <button key={lang} disabled={isGenerating} onClick={() => setGenLanguage(lang)} className={`px-4 py-2 rounded-lg text-sm font-bold border ${genLanguage === lang ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{lang}</button>)}</div></div><div className="space-y-3"><label className="text-sm font-bold">Độ khó</label><div className="flex flex-wrap gap-2">{["Cơ bản", "Trung bình", "Nâng cao"].map(diff => <button key={diff} disabled={isGenerating} onClick={() => setGenDifficulty(diff)} className={`px-4 py-2 rounded-lg text-sm font-bold border ${genDifficulty === diff ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{diff}</button>)}</div></div><div className="space-y-3"><label className="text-sm font-bold">Chủ đề bài tập</label><input type="text" value={genTopic} onChange={e => setGenTopic(e.target.value)} disabled={isGenerating} placeholder="VD: Vòng lặp for..." className="w-full bg-background border px-4 py-3 text-sm rounded-xl outline-none" /></div></div><DialogFooter className="gap-2"><Button variant="outline" onClick={() => setIsAiModalOpen(false)} disabled={isGenerating}>Hủy</Button><Button onClick={handleGenerateAIExercise} disabled={isGenerating} className="bg-primary min-w-[140px]">{isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Đang tạo...</> : <><Wand2 className="mr-2 h-4 w-4"/> Tạo Bài Tập</>}</Button></DialogFooter></DialogContent>
      </Dialog>

      {/* 💡 GIAO DIỆN MỚI: SIDE PANEL (NGĂN KÉO TRƯỢT TỪ PHẢI) ĐỂ ĐỌC BÍ KÍP */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
            {/* Lớp mờ (Overlay) bấm vào để đóng */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedReport(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
            />

            {/* Khung nội dung chính trượt ra */}
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative z-10 w-full max-w-md h-full bg-background shadow-[auto_0_40px_rgba(0,0,0,0.15)] border-l border-border flex flex-col"
            >
              {/* Header của Side Panel */}
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 relative shrink-0 border-b border-border">
                <button onClick={() => setSelectedReport(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 text-muted-foreground transition-colors">
                  <X className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/30 text-white shrink-0">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <div className="pr-6">
                    <h2 className="text-xl font-bold text-foreground">Giải đáp từ Giảng viên</h2>
                    <p className="text-sm text-muted-foreground mt-1">Giảng viên: <span className="font-semibold text-primary">{selectedReport.lecturerName}</span></p>
                  </div>
                </div>
              </div>

              {/* Phần nội dung cuộn */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                
                {/* Lỗi của sinh viên */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-muted-foreground rounded-full"></div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Lỗi bạn gặp phải</h3>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4 text-sm text-foreground/80 italic border border-border shadow-inner">
                    "{selectedReport.studentIssue}"
                  </div>
                </div>

                {/* Bí kíp của giảng viên */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-primary rounded-full"></div>
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Bí kíp / Lời dặn dò</h3>
                  </div>
                  <div className="bg-primary/5 rounded-2xl p-5 text-sm text-foreground border border-primary/20 leading-relaxed font-medium whitespace-pre-wrap shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-primary opacity-20"></div>
                    {selectedReport.lecturerHint}
                  </div>
                </div>
                
                {/* Lời nhắn động viên */}
                <div className="bg-accent/5 border border-accent/10 rounded-xl p-4 mt-6 flex gap-3 items-start">
                  <Bot className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Não của AI đã được cập nhật đoạn "bí kíp" này. Bạn hãy quay lại thực hành và hỏi lại AI để xem sự kỳ diệu nhé!
                  </p>
                </div>
              </div>

              {/* Footer Button */}
              <div className="p-5 bg-muted/20 border-t border-border flex justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setSelectedReport(null)} className="rounded-xl px-4">Đóng lại</Button>
                <Button onClick={() => navigate(`/workspace?id=${selectedReport.exerciseId}`)} className="bg-gradient-primary shadow-glow rounded-xl px-6">
                  <Code2 className="w-4 h-4 mr-2" /> Thực hành ngay
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="py-8 px-6 text-center border-t border-border bg-card/50 mt-auto">
        <p className="text-xs text-muted-foreground">Học tập hiệu quả hơn cùng AI Learning Hub &copy; 2026</p>
      </footer>
    </div>
  );
};

export default StudentDashboard;