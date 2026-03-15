import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useToast } from "../hooks/use-toast";
// 💡 ĐÃ BỔ SUNG THÊM ICON: CheckCircle2, Terminal
import { Users, BookOpen, TrendingUp, Plus, BarChart3, GraduationCap, Trophy, Trash2, Code2, Loader2, Edit, Search, Layers, FileText, CheckCircle2, Terminal } from "lucide-react";
import { motion } from "framer-motion";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Course {
  id: number;
  title: string;
}

interface Lesson {
  id: number;
  courseId: number;
  title: string;
  orderNum: number;
  content: string;
}

interface Exercise {
  id: number;
  title: string;
  difficulty: string;
  description: string;
  testCases: string;
  lessonId: number;
}

interface TestCase {
  input: string;
  expectedOutput: string;
}

const Dashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [studentStats, setStudentStats] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States cho Form Bài tập
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [isEditModeEx, setIsEditModeEx] = useState(false);
  const [newExercise, setNewExercise] = useState({ id: 0, title: "", description: "", difficulty: "Easy", lessonId: "" });
  const [testCases, setTestCases] = useState<TestCase[]>([{ input: "", expectedOutput: "" }]);
  const [selectedCourseIdEx, setSelectedCourseIdEx] = useState("");

  // States cho Form Khóa học
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [isEditModeCourse, setIsEditModeCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({ id: 0, title: "" });

  // States cho Form Bài học
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [isEditModeLesson, setIsEditModeLesson] = useState(false);
  const [newLesson, setNewLesson] = useState({ id: 0, courseId: "", title: "", orderNum: 1, content: "Nội dung bài học..." });

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchAllData();
  }, [user]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [resCourses, resLessons, resExercises, resStats] = await Promise.all([
        fetch(`${API_BASE_URL}/api/Courses`),
        fetch(`${API_BASE_URL}/api/Lessons`),
        fetch(`${API_BASE_URL}/api/Exercises`),
        fetch(`${API_BASE_URL}/api/UserProfile/stats`)
      ]);
      if (resCourses.ok) setCourses(await resCourses.json());
      if (resLessons.ok) setLessons(await resLessons.json());
      if (resExercises.ok) setExercises(await resExercises.json());
      if (resStats.ok) setStudentStats(await resStats.json());
    } catch (error) {
      toast({ title: "Lỗi kết nối", description: "Không thể tải dữ liệu từ máy chủ.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = async (email: string, currentRole: string) => {
    if (user?.email === email) {
      toast({ title: "Lỗi", description: "Bạn không thể tự hạ quyền của chính mình!", variant: "destructive" });
      return;
    }

    const newRole = currentRole === "Admin" ? "Student" : "Admin";
    const confirmMsg = newRole === "Admin" 
      ? `Cấp quyền Quản trị viên (Admin) cho ${email}?` 
      : `Hạ cấp ${email} xuống thành Sinh viên?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/UserProfile/role`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ email, role: newRole }),
      });

      if (response.ok) {
        toast({ title: "Thành công!", description: `Đã thay đổi quyền tài khoản ${email}.` });
        fetchAllData(); // Refresh data
      } else {
        toast({ title: "Lỗi", description: "Không thể đổi quyền.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Lỗi kết nối", description: "Server C# đang gặp sự cố.", variant: "destructive" });
    }
  };

  // ============================== LOGIC KHÓA HỌC ==============================
  const handleOpenCourseDialog = (course?: Course) => {
    if (course) {
      setIsEditModeCourse(true);
      setNewCourse(course);
    } else {
      setIsEditModeCourse(false);
      setNewCourse({ id: 0, title: "" });
    }
    setShowAddCourse(true);
  };

  const handleSaveCourse = async () => {
    if (!newCourse.title.trim()) return toast({ title: "Lỗi", description: "Vui lòng nhập tên Khóa học", variant: "destructive" });
    setIsSubmitting(true);
    try {
      const url = isEditModeCourse ? `${API_BASE_URL}/api/Courses/${newCourse.id}` : `${API_BASE_URL}/api/Courses`;
      const method = isEditModeCourse ? "PUT" : "POST";
      const response = await fetch(url, {
        method, 
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, 
        body: JSON.stringify(newCourse),
      });
      if (response.ok) {
        toast({ title: "Thành công!", description: "Đã lưu Khóa học." });
        setShowAddCourse(false); 
        fetchAllData();
      } else throw new Error("Lỗi API");
    } catch (e) { 
      toast({ title: "Lỗi", description: "Không thể lưu", variant: "destructive" }); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleDeleteCourse = async (id: number) => {
    if (!window.confirm("Xóa khóa học này có thể làm lỗi các Bài học bên trong. Bạn chắc chắn chứ?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/Courses/${id}`, { 
        method: 'DELETE', 
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) { 
        toast({ title: "Đã xóa" }); 
        fetchAllData(); 
      } else {
        toast({ title: "Lỗi xóa", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Lỗi", variant: "destructive" });
    }
  };

  // ============================== LOGIC BÀI HỌC ==============================
  const handleOpenLessonDialog = (lesson?: Lesson) => {
    if (lesson) {
      setIsEditModeLesson(true);
      setNewLesson({ ...lesson, courseId: lesson.courseId.toString() });
    } else {
      setIsEditModeLesson(false);
      setNewLesson({ id: 0, courseId: "", title: "", orderNum: 1, content: "Nội dung bài học..." });
    }
    setShowAddLesson(true);
  };

  const handleSaveLesson = async () => {
    if (!newLesson.title.trim() || !newLesson.courseId) return toast({ title: "Lỗi", description: "Vui lòng nhập đủ thông tin", variant: "destructive" });
    setIsSubmitting(true);
    try {
      const payload = { ...newLesson, courseId: parseInt(newLesson.courseId) };
      const url = isEditModeLesson ? `${API_BASE_URL}/api/Lessons/${newLesson.id}` : `${API_BASE_URL}/api/Lessons`;
      const method = isEditModeLesson ? "PUT" : "POST";
      const response = await fetch(url, {
        method, 
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, 
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        toast({ title: "Thành công!", description: "Đã lưu Bài học." });
        setShowAddLesson(false); 
        fetchAllData();
      } else throw new Error("Lỗi API");
    } catch (e) { 
      toast({ title: "Lỗi", description: "Không thể lưu", variant: "destructive" }); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleDeleteLesson = async (id: number) => {
    if (!window.confirm("Xóa Bài học này có thể làm lỗi các Bài tập bên trong. Chắc chắn xóa?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/Lessons/${id}`, { 
        method: 'DELETE', 
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) { 
        toast({ title: "Đã xóa" }); 
        fetchAllData(); 
      } else {
        toast({ title: "Lỗi xóa", variant: "destructive" });
      }
    } catch(e) {
      toast({ title: "Lỗi", variant: "destructive" });
    }
  };

  // ============================== LOGIC BÀI TẬP ==============================
  const handleOpenExerciseDialog = (exercise?: Exercise) => {
    if (exercise) {
      setIsEditModeEx(true);
      setNewExercise({ ...exercise, lessonId: exercise.lessonId.toString() });
      
      const targetLesson = lessons.find(l => l.id === exercise.lessonId);
      if (targetLesson) {
        setSelectedCourseIdEx(targetLesson.courseId.toString());
      }
      
      try { 
        const parsedTCs = JSON.parse(exercise.testCases);
        if (parsedTCs && parsedTCs.length > 0) {
          setTestCases(parsedTCs);
        } else {
          setTestCases([{ input: "", expectedOutput: "" }]);
        }
      } catch { 
        setTestCases([{ input: "", expectedOutput: "" }]); 
      }
    } else {
      setIsEditModeEx(false);
      setNewExercise({ id: 0, title: "", description: "", difficulty: "Easy", lessonId: "" });
      setSelectedCourseIdEx("");
      setTestCases([{ input: "", expectedOutput: "" }]);
    }
    setShowAddExercise(true);
  };

  const handleSaveExercise = async () => {
    if (!newExercise.title.trim() || !newExercise.lessonId) return toast({ title: "Lỗi", description: "Vui lòng chọn Bài học và nhập Tên bài tập", variant: "destructive" });
    
    const validTestCases = testCases.filter(tc => tc.expectedOutput.trim() !== "");
    if (validTestCases.length === 0) return toast({ title: "Lỗi", description: "Phải có ít nhất 1 Test Case hợp lệ.", variant: "destructive" });

    setIsSubmitting(true);
    try {
      const payload = { 
        ...newExercise, 
        lessonId: parseInt(newExercise.lessonId), 
        testCases: JSON.stringify(validTestCases) 
      };
      
      const url = isEditModeEx ? `${API_BASE_URL}/api/Exercises/${newExercise.id}` : `${API_BASE_URL}/api/Exercises`;
      const method = isEditModeEx ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method, 
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, 
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        toast({ title: "Thành công!", description: "Đã lưu Bài tập." });
        setShowAddExercise(false); 
        fetchAllData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Lỗi máy chủ C#");
      }
    } catch (error: any) { 
      toast({ title: "Lỗi", description: error.message, variant: "destructive" }); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleDeleteExercise = async (id: number) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa bài tập này?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/Exercises/${id}`, { 
        method: 'DELETE', 
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) { 
        toast({ title: "Đã xóa" }); 
        fetchAllData(); 
      } else {
        toast({ title: "Lỗi xóa", description: "Không thể xóa (có thể đã có SV nộp bài).", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Lỗi kết nối", description: "Lỗi server C#.", variant: "destructive" });
    }
  };

  const addTestCase = () => setTestCases([...testCases, { input: "", expectedOutput: "" }]);
  const removeTestCase = (i: number) => { if (testCases.length > 1) setTestCases(testCases.filter((_, idx) => idx !== i)); };
  const updateTestCase = (i: number, f: keyof TestCase, v: string) => { const n = [...testCases]; n[i][f] = v; setTestCases(n); };

  const getDifficultyBadge = (diff: string) => {
    switch (diff?.toLowerCase()) {
      case 'easy': return <Badge className="bg-success hover:bg-success">Dễ</Badge>;
      case 'medium': return <Badge className="bg-warning hover:bg-warning">Trung bình</Badge>;
      case 'hard': return <Badge variant="destructive">Khó</Badge>;
      default: return <Badge variant="outline">{diff}</Badge>;
    }
  };

  const filteredStudents = studentStats.filter((student) => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = student.fullName?.toLowerCase().includes(searchLower);
    const emailMatch = student.email?.toLowerCase().includes(searchLower);
    return nameMatch || emailMatch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-6 pt-24 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Dashboard <span className="text-gradient-primary">Giảng viên</span>
            </h1>
            <p className="mt-1 text-muted-foreground">Quản lý toàn diện hệ thống học tập</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Tổng số bài tập", value: exercises.length, icon: BookOpen, color: "text-primary" },
            { label: "Tổng người dùng", value: studentStats.length, icon: Users, color: "text-accent" },
            { label: "Tổng bài nộp đúng", value: studentStats.reduce((sum, s) => sum + s.completedExercises, 0), icon: Trophy, color: "text-success" },
            { label: "Trạng thái Server", value: "Online", icon: TrendingUp, color: "text-warning" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="border-border shadow-card h-full">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-muted ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="exercises" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2 justify-start">
            <TabsTrigger value="courses" className="gap-1.5"><Layers className="h-4 w-4" /> Khóa học</TabsTrigger>
            <TabsTrigger value="lessons" className="gap-1.5"><FileText className="h-4 w-4" /> Bài học</TabsTrigger>
            <TabsTrigger value="exercises" className="gap-1.5"><Code2 className="h-4 w-4" /> Bài tập</TabsTrigger>
            <TabsTrigger value="students" className="gap-1.5"><Users className="h-4 w-4" /> Người dùng</TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Thống kê</TabsTrigger>
          </TabsList>

          {/* TAB 1: KHÓA HỌC */}
          <TabsContent value="courses">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Quản lý Khóa học</CardTitle>
                  <CardDescription>Danh mục các môn học lớn</CardDescription>
                </div>
                <Dialog open={showAddCourse} onOpenChange={setShowAddCourse}>
                  <Button size="sm" onClick={() => handleOpenCourseDialog()} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                    <Plus className="mr-1.5 h-4 w-4" /> Thêm khóa học
                  </Button>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{isEditModeCourse ? "Sửa khóa học" : "Tạo khóa học mới"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <Input 
                        placeholder="Tên khóa học (VD: Lập trình Python)" 
                        value={newCourse.title} 
                        onChange={e => setNewCourse({ ...newCourse, title: e.target.value })} 
                      />
                      <Button onClick={handleSaveCourse} disabled={isSubmitting} className="w-full bg-gradient-primary">
                        {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Lưu Khóa học"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">ID</TableHead>
                      <TableHead>Tên khóa học</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">Chưa có khóa học nào.</TableCell>
                      </TableRow>
                    ) : courses.map(c => (
                      <TableRow key={c.id}>
                        <TableCell>#{c.id}</TableCell>
                        <TableCell className="font-semibold text-foreground">{c.title}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => handleOpenCourseDialog(c)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteCourse(c.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: BÀI HỌC */}
          <TabsContent value="lessons">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Quản lý Bài học</CardTitle>
                  <CardDescription>Các chương/bài học bên trong Khóa học</CardDescription>
                </div>
                <Dialog open={showAddLesson} onOpenChange={setShowAddLesson}>
                  <Button size="sm" onClick={() => handleOpenLessonDialog()} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                    <Plus className="mr-1.5 h-4 w-4" /> Thêm bài học
                  </Button>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{isEditModeLesson ? "Sửa bài học" : "Tạo bài học mới"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="text-sm font-semibold mb-1 block">Thuộc Khóa học:</label>
                        <Select value={newLesson.courseId} onValueChange={v => setNewLesson({ ...newLesson, courseId: v })}>
                          <SelectTrigger><SelectValue placeholder="Chọn Khóa học" /></SelectTrigger>
                          <SelectContent>
                            {courses.map(c => (<SelectItem key={c.id} value={c.id.toString()}>{c.title}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-semibold mb-1 block">Tên bài học:</label>
                        <Input 
                          placeholder="Tên bài học (VD: Vòng lặp For)" 
                          value={newLesson.title} 
                          onChange={e => setNewLesson({ ...newLesson, title: e.target.value })} 
                        />
                      </div>

                      <div>
                        <label className="text-sm font-semibold mb-1 block">Thứ tự hiển thị:</label>
                        <Input 
                          type="number" 
                          placeholder="Số thứ tự (VD: 1)" 
                          value={newLesson.orderNum} 
                          onChange={e => setNewLesson({ ...newLesson, orderNum: parseInt(e.target.value) || 1 })} 
                        />
                      </div>

                      <Button onClick={handleSaveLesson} disabled={isSubmitting} className="w-full bg-gradient-primary">
                        {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Lưu Bài học"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">ID</TableHead>
                      <TableHead>Thuộc Khóa học</TableHead>
                      <TableHead>Tên bài học</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lessons.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Chưa có bài học nào.</TableCell>
                      </TableRow>
                    ) : lessons.map(l => (
                      <TableRow key={l.id}>
                        <TableCell>#{l.id}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-muted">
                            {courses.find(c => c.id === l.courseId)?.title || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">Bài {l.orderNum}: {l.title}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => handleOpenLessonDialog(l)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteLesson(l.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: BÀI TẬP */}
          <TabsContent value="exercises">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Danh sách bài tập lập trình</CardTitle>
                  <CardDescription>Các bài tập thực hành giao cho sinh viên</CardDescription>
                </div>
                <Dialog open={showAddExercise} onOpenChange={setShowAddExercise}>
                  <Button size="sm" onClick={() => handleOpenExerciseDialog()} className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                    <Plus className="mr-1.5 h-4 w-4" /> Thêm bài tập
                  </Button>
                  
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{isEditModeEx ? "Sửa bài tập" : "Tạo bài tập mới"}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4 mt-4">
                      {/* CHỌN KHÓA HỌC & BÀI HỌC */}
                      <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                        <div>
                          <label className="text-xs font-semibold mb-1 block">Thuộc Khóa học:</label>
                          <Select 
                            value={selectedCourseIdEx} 
                            onValueChange={(v) => { 
                              setSelectedCourseIdEx(v); 
                              setNewExercise({...newExercise, lessonId: ""}); // Đổi khóa học reset bài học
                            }}
                          >
                            <SelectTrigger><SelectValue placeholder="Chọn Khóa học..." /></SelectTrigger>
                            <SelectContent>
                              {courses.length === 0 && <SelectItem value="empty" disabled>Chưa có khóa học nào</SelectItem>}
                              {courses.map(c => (
                                <SelectItem key={c.id} value={c.id.toString()}>{c.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <label className="text-xs font-semibold mb-1 block">Thuộc Bài học (Lesson):</label>
                          <Select 
                            value={newExercise.lessonId} 
                            onValueChange={v => setNewExercise({ ...newExercise, lessonId: v })} 
                            disabled={!selectedCourseIdEx}
                          >
                            <SelectTrigger><SelectValue placeholder="Chọn Bài học..." /></SelectTrigger>
                            <SelectContent>
                              {lessons.filter(l => l.courseId.toString() === selectedCourseIdEx).length === 0 
                                ? <SelectItem value="empty" disabled>Khóa này chưa có bài học</SelectItem>
                                : lessons.filter(l => l.courseId.toString() === selectedCourseIdEx).map(l => (
                                    <SelectItem key={l.id} value={l.id.toString()}>Bài {l.orderNum}: {l.title}</SelectItem>
                                  ))
                              }
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Input 
                        placeholder="Tiêu đề bài tập (VD: Tính tổng 2 số)" 
                        value={newExercise.title} 
                        onChange={e => setNewExercise(p => ({ ...p, title: e.target.value }))} 
                      />
                      <Textarea 
                        placeholder="Mô tả chi tiết yêu cầu đề bài..." 
                        rows={4}
                        value={newExercise.description} 
                        onChange={e => setNewExercise(p => ({ ...p, description: e.target.value }))} 
                      />
                      
                      <div className="grid grid-cols-2 gap-3">
                        <Select value={newExercise.difficulty} onValueChange={v => setNewExercise(p => ({ ...p, difficulty: v }))}>
                          <SelectTrigger><SelectValue placeholder="Độ khó" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Easy">Dễ (Easy)</SelectItem>
                            <SelectItem value="Medium">Trung bình (Medium)</SelectItem>
                            <SelectItem value="Hard">Khó (Hard)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="pt-4 border-t border-border mt-4">
                        <div className="flex items-center justify-between mb-4">
                          <label className="text-sm font-semibold text-foreground">Dữ liệu chấm điểm (Test Cases)</label>
                          <Button type="button" variant="secondary" size="sm" onClick={addTestCase}>
                            <Plus className="h-3 w-3 mr-1" /> Thêm Test Case
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {testCases.map((tc, idx) => (
                            <div key={idx} className="flex gap-2 items-start bg-muted/30 p-2 rounded-lg border border-border">
                              <Input 
                                placeholder="Input (VD: 1 2)" 
                                value={tc.input} 
                                onChange={e => updateTestCase(idx, 'input', e.target.value)} 
                                className="font-mono text-sm" 
                              />
                              <Input 
                                placeholder="Expected Output (VD: 3)" 
                                value={tc.expectedOutput} 
                                onChange={e => updateTestCase(idx, 'expectedOutput', e.target.value)} 
                                className="font-mono text-sm border-success/50" 
                              />
                              {testCases.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeTestCase(idx)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button onClick={handleSaveExercise} disabled={isSubmitting} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditModeEx ? "Cập nhật bài tập" : "Lưu vào hệ thống")}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>

              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">ID</TableHead>
                      <TableHead>Thuộc Bài Học</TableHead>
                      <TableHead>Tên bài tập</TableHead>
                      <TableHead>Độ khó</TableHead>
                      <TableHead>Test Cases</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exercises.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Chưa có bài tập nào. Hãy thêm mới!</TableCell>
                      </TableRow>
                    ) : exercises.map(ex => {
                      let tcCount = 0;
                      try { if (ex.testCases) tcCount = JSON.parse(ex.testCases).length; } catch(e){}

                      return (
                        <TableRow key={ex.id}>
                          <TableCell className="font-medium text-muted-foreground">#{ex.id}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-muted">
                              {lessons.find(l => l.id === ex.lessonId)?.title || "Không xác định"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold text-foreground line-clamp-1">{ex.title}</p>
                          </TableCell>
                          <TableCell>{getDifficultyBadge(ex.difficulty)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono bg-background"><Code2 className="h-3 w-3 mr-1" /> {tcCount}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" onClick={() => handleOpenExerciseDialog(ex)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteExercise(ex.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: NGƯỜI DÙNG & ĐỔI QUYỀN */}
          <TabsContent value="students">
            <Card>
              <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Quản lý Người dùng & Tiến độ</CardTitle>
                  <CardDescription>Theo dõi bài tập và phân quyền Admin cho hệ thống</CardDescription>
                </div>
                
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Tìm theo tên hoặc email..."
                    className="pl-9 bg-muted/50 focus:bg-background transition-colors"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Họ và Tên</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-center">Số bài đúng</TableHead>
                      <TableHead className="text-right">Hoạt động gần nhất</TableHead>
                      <TableHead className="text-center">Quyền hạn</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                          <GraduationCap className="h-8 w-8 mx-auto mb-3 opacity-20" />
                          Chưa có người dùng nào đăng ký trong hệ thống.
                        </TableCell>
                      </TableRow>
                    ) : filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                          <Search className="h-8 w-8 mx-auto mb-3 opacity-20" />
                          Không tìm thấy người dùng nào phù hợp với "{searchTerm}"
                        </TableCell>
                      </TableRow>
                    ) : filteredStudents.map((student, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-bold text-foreground">{student.fullName}</TableCell>
                        <TableCell className="text-muted-foreground">{student.email}</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold ${student.completedExercises === exercises.length && exercises.length > 0 ? 'text-success' : 'text-primary'}`}>
                            {student.completedExercises}
                          </span>
                          <span className="text-muted-foreground text-sm"> / {exercises.length}</span>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {student.lastActive 
                            ? new Date(student.lastActive).toLocaleString('vi-VN') 
                            : 'Chưa có hoạt động'}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {student.role === "Admin" ? (
                               <Badge className="bg-destructive hover:bg-destructive cursor-help">Admin</Badge>
                            ) : (
                               <Badge variant="outline" className="cursor-help">Sinh viên</Badge>
                            )}
                            
                            {user?.email !== student.email && (
                              <Button 
                                onClick={() => handleToggleRole(student.email, student.role)}
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-xs border border-border"
                              >
                                Đổi quyền
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: THỐNG KÊ (ĐÃ ĐƯỢC NÂNG CẤP) */}
          <TabsContent value="stats" className="space-y-6 focus:outline-none">
            
            {/* 1. KHU VỰC THẺ TỔNG QUAN (OVERVIEW CARDS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-border shadow-sm">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-4 bg-primary/10 text-primary rounded-2xl">
                    <Users className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tổng Học Viên</p>
                    <h3 className="text-3xl font-bold text-foreground">
                      {studentStats.filter(s => s.role === 'Student').length}
                    </h3>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-4 bg-success/10 text-success rounded-2xl">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tổng Lượt Nộp Bài</p>
                    <h3 className="text-3xl font-bold text-foreground">
                      {studentStats.reduce((sum, s) => sum + (s.totalSubmissions || 0), 0)}
                    </h3>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-4 bg-warning/10 text-warning rounded-2xl">
                    <BookOpen className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tổng Khóa Học</p>
                    <h3 className="text-3xl font-bold text-foreground">{courses.length}</h3>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-4 bg-destructive/10 text-destructive rounded-2xl">
                    <Terminal className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tổng Bài Tập</p>
                    <h3 className="text-3xl font-bold text-foreground">{exercises.length}</h3>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* 2. BẢNG XẾP HẠNG & TIẾN ĐỘ HỌC VIÊN (Bên trái, chiếm 2 phần) */}
              <Card className="border-border shadow-card overflow-hidden lg:col-span-2">
                <div className="p-6 border-b border-border bg-card">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-warning" /> 
                    Bảng Xếp Hạng & Tiến Độ Học Viên
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Theo dõi số lượng bài tập đã giải quyết và tần suất hoạt động của từng tài khoản.
                  </p>
                </div>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-16 text-center py-4">Top</TableHead>
                        <TableHead>Học viên</TableHead>
                        <TableHead className="text-center">Tổng lượt nộp</TableHead>
                        <TableHead className="text-center">Bài đã giải (PASS)</TableHead>
                        <TableHead className="text-right pr-6">Hoạt động gần nhất</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentStats.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                            Chưa có dữ liệu thống kê.
                          </TableCell>
                        </TableRow>
                      ) : (
                        // Lọc những sinh viên có nộp bài hoặc là Student
                        studentStats.filter(s => s.role === 'Student' || s.totalSubmissions > 0).map((stat, index) => (
                          <TableRow key={stat.email} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-center font-bold">
                              {index === 0 ? <span className="text-warning text-lg">🥇 1</span> : 
                               index === 1 ? <span className="text-muted-foreground text-lg">🥈 2</span> : 
                               index === 2 ? <span className="text-orange-400 text-lg">🥉 3</span> : 
                               `#${index + 1}`}
                            </TableCell>
                            <TableCell>
                              <div className="font-bold text-foreground">{stat.fullName || "Chưa cập nhật tên"}</div>
                              <div className="text-sm text-muted-foreground">{stat.email}</div>
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              {stat.totalSubmissions || 0}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-bold text-success text-lg">{stat.completedExercises || 0}</span>
                              <span className="text-muted-foreground text-xs ml-1">bài</span>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground text-sm pr-6">
                              {stat.lastActive 
                                ? new Date(stat.lastActive).toLocaleString('vi-VN') 
                                : "Chưa từng nộp bài"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* 3. BIỂU ĐỒ PHÂN BỐ (Bên phải, chiếm 1 phần) */}
              <Card className="border-border shadow-card h-fit">
                <CardHeader>
                  <CardTitle className="text-lg">Phân bố bài tập</CardTitle>
                  <CardDescription>Theo dõi số lượng bài tập theo từng mức độ khó</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    {["Easy", "Medium", "Hard"].map(level => {
                      const count = exercises.filter(c => c.difficulty?.toLowerCase() === level.toLowerCase()).length;
                      const pct = exercises.length > 0 ? (count / exercises.length) * 100 : 0;
                      const labels: Record<string, string> = { Easy: "Dễ", Medium: "Trung bình", Hard: "Khó" };
                      const colors: Record<string, string> = { Easy: "bg-success", Medium: "bg-warning", Hard: "bg-destructive" };
                      
                      return (
                        <div key={level}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-foreground font-semibold">{labels[level]}</span>
                            <span className="text-muted-foreground font-mono">{count} bài</span>
                          </div>
                          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${colors[level]} transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;