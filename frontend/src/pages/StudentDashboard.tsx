import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  BookOpen, Clock, Trophy, 
  CheckCircle2, History, Terminal
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// 💡 CẬP NHẬT 1: Import Navbar
import Navbar from "@/components/Navbar";

// Import các UI Component
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// Mock dữ liệu biến môi trường cho Preview
const MOCK_API_URL = "http://localhost:5043";

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
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [completedExercises, setCompletedExercises] = useState<number[]>([]);
  
  const navigate = useNavigate();
  // Không cần signOut ở đây nữa vì Navbar đã lo việc đó
  const { user } = useAuth(); 
  
  // Xử lý biến môi trường an toàn hơn
  const getApiUrl = () => {
    try {
      // Trong môi trường Vite thực tế
      return import.meta.env.VITE_API_BASE_URL || MOCK_API_URL;
    } catch (e) {
      // Fallback cho môi trường xem trước (Preview)
      return MOCK_API_URL;
    }
  };
  
  const API_BASE_URL = getApiUrl();

  // Lấy danh sách bài tập
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/Exercises`)
      .then((res) => res.json())
      .then((data) => {
        setExercises(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Lỗi:", error);
        setIsLoading(false);
      });
  }, []);

  // Lấy lịch sử nộp bài
  useEffect(() => {
    if (user?.email) {
      fetch(`${API_BASE_URL}/api/CodeExecution/submissions/${user.email}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setSubmissions(data);
            
            const completedIds = data
              .filter((sub: any) => sub.status === "Accepted")
              .map((sub: any) => sub.exerciseId);
            setCompletedExercises([...new Set(completedIds)]);
          }
        })
        .catch((error) => {
          console.error("Lỗi tải lịch sử:", error);
        });
    }
  }, [user?.email]);

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
      {/* 💡 CẬP NHẬT 2: Sử dụng Navbar thay cho khối header cũ */}
      <Navbar variant="default" />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10">
        {/* 💡 CẬP NHẬT 3: Tái cấu trúc lại phần tiêu đề để chứa luôn Điểm XP */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 mt-2">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Chào mừng trở lại! 👋</h1>
              <p className="text-muted-foreground text-lg">
                Bạn đã hoàn thành <span className="font-bold text-primary">{completedExercises.length}/{exercises.length}</span> bài tập.
              </p>
            </div>
            
            <div className="flex items-center gap-1.5 px-4 py-2 bg-accent/10 text-accent rounded-full border border-accent/20 font-bold text-sm uppercase tracking-wider w-fit">
                <Trophy className="h-4 w-4" /> 
                {completedExercises.length * 10} Điểm kinh nghiệm
            </div>
        </div>

        <Tabs defaultValue="exercises" className="space-y-8">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="exercises" className="gap-2">
              <BookOpen className="h-4 w-4" /> Bài tập thực hành
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" /> Lịch sử nộp bài
            </TabsTrigger>
          </TabsList>

          <TabsContent value="exercises" className="focus:outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-64 bg-card rounded-3xl border border-border animate-pulse shadow-card" />
                ))
              ) : exercises.length > 0 ? (
                exercises.map((ex) => {
                  const isCompleted = completedExercises.includes(ex.id);

                  return (
                    <div key={ex.id} className={`group p-6 rounded-3xl border transition-all duration-300 flex flex-col h-full ${
                      isCompleted 
                        ? 'bg-success/5 border-success/20 shadow-sm' 
                        : 'bg-card border-border shadow-card hover:shadow-elevated hover:-translate-y-1'
                    }`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getDifficultyColor(ex.difficulty)}`}>
                          {ex.difficulty || 'CƠ BẢN'}
                        </div>
                        {isCompleted ? (
                          <div className="flex items-center gap-1 text-success text-xs font-bold">
                            <CheckCircle2 className="h-4 w-4" /> Hoàn thành
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
                            <Clock className="h-3.5 w-3.5" /> 15 phút
                          </div>
                        )}
                      </div>
                      
                      <h3 className={`text-xl font-bold mb-3 transition-colors line-clamp-1 ${
                        isCompleted ? 'text-success' : 'text-card-foreground group-hover:text-primary'
                      }`}>
                        {ex.title}
                      </h3>
                      
                      <p className={`text-sm mb-8 flex-1 line-clamp-3 leading-relaxed ${
                        isCompleted ? 'text-success/70' : 'text-muted-foreground'
                      }`}>
                        {ex.description}
                      </p>
                      
                      <button 
                        onClick={() => navigate(`/workspace?id=${ex.id}`)} 
                        className={`w-full flex items-center justify-center font-bold rounded-2xl h-12 transition-all ${
                          isCompleted 
                            ? 'bg-success/10 hover:bg-success/20 text-success shadow-none' 
                            : 'bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90'
                        }`}
                      >
                        {isCompleted ? (
                          <><CheckCircle2 className="mr-2 h-4 w-4" /> Xem lại bài</>
                        ) : (
                          <><BookOpen className="mr-2 h-4 w-4" /> Bắt đầu giải bài</>
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                 <div className="col-span-full bg-card rounded-3xl border-2 border-dashed border-border py-20 text-center shadow-sm">
                     <p className="text-muted-foreground font-medium italic">Dữ liệu bài tập đang được cập nhật...</p>
                 </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="focus:outline-none">
            <Card className="border-border shadow-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-16 py-4">Mã số</TableHead>
                      <TableHead>Tên bài tập</TableHead>
                      <TableHead>Thời gian nộp</TableHead>
                      <TableHead>Ngôn ngữ</TableHead>
                      <TableHead className="text-center">Số Test Cases</TableHead>
                      <TableHead className="text-right">Trạng thái</TableHead>
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
                        className="hover:bg-muted/30 cursor-pointer" 
                        onClick={() => navigate(`/workspace?id=${sub.exerciseId}`, {
                          state: { pastCode: sub.code, pastLanguage: sub.language }
                        })}
                      >
                        <TableCell className="font-mono text-muted-foreground">#{sub.id}</TableCell>
                        <TableCell className="font-bold text-foreground">
                          {getExerciseTitle(sub.exerciseId)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs font-mono bg-muted px-2 py-1 rounded w-fit">
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

      <footer className="py-8 px-6 text-center border-t border-border bg-card/50 mt-auto">
          <p className="text-xs text-muted-foreground">Học tập hiệu quả hơn cùng AI Learning Hub &copy; 2026</p>
      </footer>
    </div>
  );
};

export default StudentDashboard;