import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  BookOpen, Clock, Trophy, 
  CheckCircle2, History, Terminal,
  Layers, ChevronRight, FolderOpen,
  Sparkles, Wand2, Loader2, AlertCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";

// Import các UI Component
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// 💡 IMPORT DIALOG CHO POPUP TẠO BÀI TẬP AI
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const MOCK_API_URL = "http://localhost:5043";

interface Course {
  id: number;
  title: string;
}

interface Lesson {
  id: number;
  courseId: number;
  title: string;
  orderNum: number;
}

interface Exercise {
  id: number;
  lessonId: number;
  title: string;
  description: string;
  difficulty: string;
}

interface Submission {
  id: number;
  exerciseId: number;
  language: string;
  code: string; 
  status: string;
  passedTests: number;
  totalTests: number;
  submittedAt: string;
}

const StudentDashboard = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [completedExercises, setCompletedExercises] = useState<number[]>([]);

  // ==========================================
  // 💡 CÁC STATE CHO POPUP TẠO BÀI TẬP AI
  // ==========================================
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  
  const [genLanguage, setGenLanguage] = useState("Python");
  const [genDifficulty, setGenDifficulty] = useState("Cơ bản");
  const [genTopic, setGenTopic] = useState("");

  const navigate = useNavigate();
  const { user, token } = useAuth(); 
  
  const getApiUrl = () => {
    try {
      return import.meta.env.VITE_API_BASE_URL || MOCK_API_URL;
    } catch (e) {
      return MOCK_API_URL;
    }
  };
  
  const API_BASE_URL = getApiUrl();

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
          fetchPromises.push(
            fetch(`${API_BASE_URL}/api/CodeExecution/submissions/${user.email}`).then(res => res.json())
          );
        }

        const results = await Promise.all(fetchPromises);
        
        setCourses(results[0]);
        setLessons(results[1]);
        setExercises(results[2]);

        if (user?.email && Array.isArray(results[3])) {
          setSubmissions(results[3]);
          const completedIds = results[3]
            .filter((sub: any) => sub.status === "Accepted")
            .map((sub: any) => sub.exerciseId);
          setCompletedExercises([...new Set(completedIds)]);
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.email]);

  // ==========================================
  // 💡 HÀM GỌI API ĐỂ AI TỰ TẠO BÀI TẬP MỚI
  // ==========================================
  const handleGenerateAIExercise = async () => {
    if (!genTopic.trim()) {
      setGenError("Vui lòng nhập chủ đề bài tập bạn muốn luyện tập!");
      return;
    }

    setGenError("");
    setIsGenerating(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/AIAssistant/generate-exercise`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          Language: genLanguage,
          Topic: genTopic,
          Difficulty: genDifficulty
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsAiModalOpen(false);

        // 💡 BẢN ĐỒ NGÔN NGỮ ĐỂ WORKSPACE HIỂU ĐƯỢC
        const langMap: Record<string, string> = {
          "C++": "cpp",
          "Python": "python",
          "Java": "java",
          "JavaScript": "javascript"
        };
        const targetLanguage = langMap[genLanguage] || "python";

        // 💡 TRUYỀN THÊM CẢ pastLanguage ĐỂ ĐỒNG BỘ Ô SELECT
        navigate(`/workspace/${data.exerciseId}`, { 
          state: { 
            isAIGenerated: true,
            exerciseData: data.data,
            pastLanguage: targetLanguage
          } 
        });
      } else {
        setGenError(data.message || "Có lỗi xảy ra khi tạo bài tập. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Lỗi:", error);
      setGenError("Lỗi kết nối đến máy chủ. Hãy chắc chắn Server Backend đang chạy.");
    } finally {
      setIsGenerating(false);
    }
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

  const getExerciseTitle = (id: number) => {
    const ex = exercises.find(e => e.id === id);
    return ex ? ex.title : `Bài tập #${id}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Navbar variant="default" />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 mt-2">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Chào mừng trở lại! 👋</h1>
              <p className="text-muted-foreground text-lg">
                Bạn đã hoàn thành <span className="font-bold text-primary">{completedExercises.length}/{exercises.length}</span> bài tập.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-accent/10 text-accent rounded-full border border-accent/20 font-bold text-sm uppercase tracking-wider">
                  <Trophy className="h-4 w-4" /> 
                  {completedExercises.length * 10} Điểm kinh nghiệm
              </div>

              {/* 💡 NÚT GỌI POPUP AI TẠI ĐÂY */}
              <Button 
                onClick={() => setIsAiModalOpen(true)}
                className="rounded-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-glow px-5 py-2.5 h-auto font-bold"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Nhờ AI Tạo Bài Tập
              </Button>
            </div>
        </div>

        <Tabs defaultValue="exercises" className="space-y-8">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="exercises" className="gap-2">
              <BookOpen className="h-4 w-4" /> Lộ trình học tập
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" /> Lịch sử nộp bài
            </TabsTrigger>
          </TabsList>

          {/* TAB BÀI TẬP */}
          <TabsContent value="exercises" className="focus:outline-none">
            {isLoading ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {Array(3).fill(0).map((_, i) => (
                   <div key={i} className="h-64 bg-card rounded-3xl border border-border animate-pulse shadow-card" />
                 ))}
               </div>
            ) : courses.length > 0 ? (
              <Tabs defaultValue={courses[0].id.toString()} className="w-full">
                
                {/* Thanh chọn Khóa học */}
                <div className="overflow-x-auto pb-2 mb-6 scrollbar-hide">
                  <TabsList className="flex w-max h-auto gap-2 bg-transparent p-0">
                    {courses.map(course => (
                      <TabsTrigger 
                        key={course.id} 
                        value={course.id.toString()}
                        className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow rounded-full px-6 py-2.5 font-semibold transition-all border border-border data-[state=active]:border-transparent bg-card hover:bg-muted"
                      >
                        <Layers className="h-4 w-4 mr-2" />
                        {course.title}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {/* Nội dung từng Khóa học */}
                {courses.map(course => {
                  const courseLessons = lessons
                    .filter(l => l.courseId === course.id)
                    .sort((a, b) => a.orderNum - b.orderNum);

                  return (
                    <TabsContent key={course.id} value={course.id.toString()} className="space-y-10 focus:outline-none animate-in fade-in-50 duration-500">
                      
                      {courseLessons.length === 0 ? (
                        <div className="bg-card rounded-3xl border-2 border-dashed border-border py-16 text-center shadow-sm">
                           <FolderOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                           <p className="text-muted-foreground font-medium">Khóa học này chưa có bài học nào.</p>
                        </div>
                      ) : (
                        courseLessons.map(lesson => {
                          const lessonExercises = exercises.filter(e => e.lessonId === lesson.id);

                          if (lessonExercises.length === 0) return null;

                          return (
                            <div key={lesson.id} className="space-y-4">
                              <div className="flex items-center gap-2 border-b border-border pb-2">
                                <h2 className="text-xl font-bold text-foreground flex items-center">
                                  <span className="text-primary mr-2">Bài {lesson.orderNum}:</span> 
                                  {lesson.title}
                                </h2>
                                <Badge variant="secondary" className="ml-2 font-mono">{lessonExercises.length} bài</Badge>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {lessonExercises.map((ex, index) => {
                                  const isCompleted = completedExercises.includes(ex.id);
                                  return (
                                    <div key={ex.id} className={`group p-5 rounded-2xl border transition-all duration-300 flex flex-col h-full ${
                                      isCompleted 
                                        ? 'bg-success/5 border-success/20 shadow-sm' 
                                        : 'bg-card border-border shadow-card hover:shadow-elevated hover:-translate-y-1'
                                    }`}>
                                      <div className="flex justify-between items-start mb-3">
                                        <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getDifficultyColor(ex.difficulty)}`}>
                                          {ex.difficulty || 'CƠ BẢN'}
                                        </div>
                                        {isCompleted && (
                                          <CheckCircle2 className="h-4 w-4 text-success" />
                                        )}
                                      </div>
                                      
                                      <h3 className={`text-lg font-bold mb-2 transition-colors line-clamp-2 ${
                                        isCompleted ? 'text-success' : 'text-card-foreground group-hover:text-primary'
                                      }`}>
                                        <span className="text-muted-foreground mr-2 font-mono text-sm">Bài {index + 1}</span> 
                                        {ex.title}
                                      </h3>
                                      
                                      <p className={`text-sm mb-6 flex-1 line-clamp-2 leading-relaxed ${
                                        isCompleted ? 'text-success/70' : 'text-muted-foreground'
                                      }`}>
                                        {ex.description}
                                      </p>
                                      
                                      <div className="flex items-center gap-2 mt-auto">
                                        <button 
                                          onClick={() => navigate(`/ai-lesson/${ex.id}`, { state: { exercise: ex } })}
                                          className="flex-1 flex items-center justify-center font-bold rounded-xl h-10 text-sm transition-all bg-accent/10 text-accent hover:bg-accent hover:text-white border border-accent/20"
                                          title="Chuẩn bị bài học với AI"
                                        >
                                          <Sparkles className="h-4 w-4 mr-1.5" /> Gợi ý
                                        </button>

                                        <button 
                                          onClick={() => navigate(`/workspace/${ex.id}`)} 
                                          className={`flex-[2] flex items-center justify-center font-bold rounded-xl h-10 text-sm transition-all ${
                                            isCompleted 
                                              ? 'bg-success/10 hover:bg-success/20 text-success shadow-none' 
                                              : 'bg-muted hover:bg-primary hover:text-primary-foreground text-foreground'
                                          }`}
                                        >
                                          {isCompleted ? "Xem lại" : "Giải ngay"} <ChevronRight className="ml-1 h-4 w-4" />
                                        </button>
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
            ) : (
               <div className="bg-card rounded-3xl border-2 border-dashed border-border py-20 text-center shadow-sm">
                   <p className="text-muted-foreground font-medium italic">Hệ thống chưa có dữ liệu khóa học...</p>
               </div>
            )}
          </TabsContent>

          {/* TAB LỊCH SỬ NỘP BÀI */}
          <TabsContent value="history" className="focus:outline-none">
            <Card className="border-border shadow-card overflow-hidden">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-16 py-4 whitespace-nowrap">Mã số</TableHead>
                      <TableHead className="min-w-[200px]">Tên bài tập</TableHead>
                      <TableHead className="whitespace-nowrap">Thời gian nộp</TableHead>
                      <TableHead>Ngôn ngữ</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Số Test Cases</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                          <History className="h-8 w-8 mx-auto mb-3 opacity-20" />
                          Chưa có lịch sử nộp bài nào. Hãy thử giải một bài tập nhé!
                        </TableCell>
                      </TableRow>
                    ) : submissions.map((sub) => (
                      <TableRow 
                        key={sub.id} 
                        className="hover:bg-muted/30 cursor-pointer transition-colors" 
                        onClick={() => navigate(`/workspace/${sub.exerciseId}`, {
                          state: { pastCode: sub.code, pastLanguage: sub.language }
                        })}
                      >
                        <TableCell className="font-mono text-muted-foreground">#{sub.id}</TableCell>
                        <TableCell className="font-bold text-foreground">
                          {getExerciseTitle(sub.exerciseId)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs font-mono bg-muted px-2 py-1 rounded w-fit border border-border">
                            <Terminal className="h-3 w-3" /> {sub.language}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold ${sub.passedTests === sub.totalTests ? 'text-success' : 'text-warning'}`}>
                            {sub.passedTests}
                          </span>
                          <span className="text-muted-foreground"> / {sub.totalTests}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          {getStatusBadge(sub.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* ========================================== */}
      {/* 💡 POPUP (DIALOG) CẤU HÌNH TẠO BÀI TẬP AI */}
      {/* ========================================== */}
      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border shadow-elevated">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
              <Sparkles className="h-6 w-6 text-primary" />
              AI Tạo Bài Tập
            </DialogTitle>
            <DialogDescription className="text-base">
              Chọn các thông số dưới đây, AI sẽ tạo ra một bài tập hoàn toàn mới theo đúng yêu cầu của bạn.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {genError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2 border border-destructive/20">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{genError}</span>
              </div>
            )}

            {/* Khối chọn Ngôn Ngữ */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-foreground">Ngôn ngữ lập trình</label>
              <div className="flex flex-wrap gap-2">
                {["C++", "Python", "Java", "JavaScript"].map((lang) => (
                  <button
                    key={lang}
                    disabled={isGenerating}
                    onClick={() => setGenLanguage(lang)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                      genLanguage === lang 
                        ? 'bg-primary text-primary-foreground border-primary shadow-glow-sm' 
                        : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Khối chọn Độ Khó */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-foreground">Độ khó mong muốn</label>
              <div className="flex flex-wrap gap-2">
                {["Cơ bản", "Trung bình", "Nâng cao"].map((diff) => (
                  <button
                    key={diff}
                    disabled={isGenerating}
                    onClick={() => setGenDifficulty(diff)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                      genDifficulty === diff 
                        ? 'bg-primary text-primary-foreground border-primary shadow-glow-sm' 
                        : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Khối nhập Chủ Đề */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-foreground">Chủ đề bài tập</label>
              <input 
                type="text" 
                value={genTopic}
                onChange={(e) => setGenTopic(e.target.value)}
                disabled={isGenerating}
                placeholder="VD: Vòng lặp for, Mảng 2 chiều, Thuật toán sắp xếp..."
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsAiModalOpen(false)}
              disabled={isGenerating}
            >
              Hủy
            </Button>
            <Button 
              onClick={handleGenerateAIExercise} 
              disabled={isGenerating}
              className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[140px] shadow-glow-sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang khởi tạo...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Tạo Bài Tập
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="py-8 px-6 text-center border-t border-border bg-card/50 mt-auto">
          <p className="text-xs text-muted-foreground">Học tập hiệu quả hơn cùng AI Learning Hub &copy; 2026</p>
      </footer>
    </div>
  );
};

export default StudentDashboard;