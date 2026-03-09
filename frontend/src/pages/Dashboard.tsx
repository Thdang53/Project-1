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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { useToast } from "../hooks/use-toast";
import { Users, BookOpen, TrendingUp, Plus, BarChart3, GraduationCap, Trophy, Trash2, Code2, Loader2, Edit } from "lucide-react";
import { motion } from "framer-motion";

const API_BASE_URL = "http://localhost:5043";

interface Exercise {
  id: number;
  title: string;
  difficulty: string;
  description: string;
  testCases: string;
}

interface TestCase {
  input: string;
  expectedOutput: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(true); // Tạm thời set true cho Admin
  const [loading, setLoading] = useState(true);
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [studentStats, setStudentStats] = useState<any[]>([]); // Lưu dữ liệu sinh viên

  // Form Thêm/Sửa bài tập
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [newExercise, setNewExercise] = useState({ title: "", description: "", difficulty: "Easy" });
  
  // Danh sách Test Case động
  const [testCases, setTestCases] = useState<TestCase[]>([
    { input: "", expectedOutput: "" }
  ]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchExercises();
    fetchStudentStats(); // Gọi API lấy thông tin sinh viên ngay khi tải trang
  }, [user]);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/Exercises`);
      if (response.ok) {
        const data = await response.json();
        setExercises(data);
      }
    } catch (error) {
      toast({ title: "Lỗi kết nối", description: "Không thể lấy danh sách bài tập từ C#.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/UserProfile/stats`);
      if (response.ok) {
        const data = await response.json();
        setStudentStats(data);
      }
    } catch (error) {
      console.error("Lỗi lấy thống kê sinh viên:", error);
    }
  };

  // QUẢN LÝ TEST CASES
  const addTestCase = () => setTestCases([...testCases, { input: "", expectedOutput: "" }]);
  const removeTestCase = (index: number) => {
    if (testCases.length > 1) setTestCases(testCases.filter((_, i) => i !== index));
  };
  const updateTestCase = (index: number, field: keyof TestCase, value: string) => {
    const newTestCases = [...testCases];
    newTestCases[index][field] = value;
    setTestCases(newTestCases);
  };

  // MỞ MODAL THÊM MỚI
  const handleOpenAdd = () => {
    setIsEditMode(false);
    setEditingId(null);
    setNewExercise({ title: "", description: "", difficulty: "Easy" });
    setTestCases([{ input: "", expectedOutput: "" }]);
    setShowAddCourse(true);
  };

  // MỞ MODAL SỬA
  const handleOpenEdit = (exercise: Exercise) => {
    setIsEditMode(true);
    setEditingId(exercise.id);
    setNewExercise({
      title: exercise.title,
      description: exercise.description,
      difficulty: exercise.difficulty || "Easy"
    });
    
    try {
      if (exercise.testCases) {
        const parsedTCs = JSON.parse(exercise.testCases);
        if (parsedTCs && parsedTCs.length > 0) {
          setTestCases(parsedTCs);
        } else {
          setTestCases([{ input: "", expectedOutput: "" }]);
        }
      }
    } catch (e) {
      setTestCases([{ input: "", expectedOutput: "" }]);
    }
    
    setShowAddCourse(true);
  };

  // LƯU BÀI TẬP VÀO CSDL (XỬ LÝ CẢ THÊM VÀ SỬA)
  const handleSaveExercise = async () => {
    if (!newExercise.title.trim() || !newExercise.description.trim()) {
      toast({ title: "Thiếu thông tin", description: "Vui lòng nhập đủ Tiêu đề và Mô tả", variant: "destructive" });
      return;
    }

    const validTestCases = testCases.filter(tc => tc.expectedOutput.trim() !== "");
    if (validTestCases.length === 0) {
      toast({ title: "Thiếu Test Case", description: "Phải có ít nhất 1 Test Case hợp lệ.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const payload = {
      id: isEditMode ? editingId : 0,
      title: newExercise.title,
      description: newExercise.description,
      difficulty: newExercise.difficulty,
      testCases: JSON.stringify(validTestCases),
      lessonId: 1
    };

    try {
      const url = isEditMode 
        ? `${API_BASE_URL}/api/Exercises/${editingId}`
        : `${API_BASE_URL}/api/Exercises`;
      
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({ title: "Thành công!", description: isEditMode ? "Đã cập nhật bài tập." : "Đã thêm bài tập mới vào hệ thống." });
        setShowAddCourse(false);
        fetchExercises();
      } else {
        throw new Error("Lỗi máy chủ C#");
      }
    } catch (error: any) {
      toast({ title: "Lỗi lưu bài tập", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // XÓA BÀI TẬP
  const handleDeleteExercise = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài tập này?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/Exercises/${id}`, { method: 'DELETE' });
      if (response.ok) {
        toast({ title: "Đã xóa bài tập" });
        fetchExercises();
      } else {
        toast({ title: "Lỗi xóa", description: "Không thể xóa (có thể đã có SV nộp bài).", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Lỗi kết nối", description: "Lỗi server C#.", variant: "destructive" });
    }
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff?.toLowerCase()) {
      case 'easy': return <Badge className="bg-success hover:bg-success">Dễ</Badge>;
      case 'medium': return <Badge className="bg-warning hover:bg-warning">Trung bình</Badge>;
      case 'hard': return <Badge variant="destructive">Khó</Badge>;
      default: return <Badge variant="outline">{diff}</Badge>;
    }
  };

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
            <p className="mt-1 text-muted-foreground">Quản lý bài tập lập trình và theo dõi hệ thống</p>
          </div>
        </div>

        {/* CÁC THẺ THỐNG KÊ (ĐÃ CẬP NHẬT DỮ LIỆU THẬT) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Tổng số bài tập", value: exercises.length, icon: BookOpen, color: "text-primary" },
            { label: "Tổng sinh viên", value: studentStats.length, icon: Users, color: "text-accent" },
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
          <TabsList>
            <TabsTrigger value="exercises" className="gap-1.5"><BookOpen className="h-4 w-4" /> Quản lý Bài tập</TabsTrigger>
            <TabsTrigger value="students" className="gap-1.5"><GraduationCap className="h-4 w-4" /> Sinh viên</TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Thống kê</TabsTrigger>
          </TabsList>

          {/* TAB BÀI TẬP */}
          <TabsContent value="exercises">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Danh sách bài tập lập trình</CardTitle>
                  <CardDescription>Các bài tập hiện có trong CSDL SQL Server</CardDescription>
                </div>
                <Dialog open={showAddCourse} onOpenChange={setShowAddCourse}>
                  <Button size="sm" onClick={handleOpenAdd} className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                    <Plus className="mr-1.5 h-4 w-4" /> Thêm bài tập
                  </Button>
                  
                  {/* POPUP THÊM/SỬA BÀI TẬP */}
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{isEditMode ? "Sửa bài tập" : "Tạo bài tập mới"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
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

                      {/* Quản lý Test Cases */}
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
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditMode ? "Cập nhật bài tập" : "Lưu vào hệ thống")}
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
                      <TableHead>Tên bài tập</TableHead>
                      <TableHead>Độ khó</TableHead>
                      <TableHead>Test Cases</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exercises.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Chưa có bài tập nào. Hãy thêm mới!</TableCell>
                      </TableRow>
                    ) : exercises.map(ex => {
                      let tcCount = 0;
                      try { if (ex.testCases) tcCount = JSON.parse(ex.testCases).length; } catch(e){}

                      return (
                        <TableRow key={ex.id}>
                          <TableCell className="font-medium text-muted-foreground">#{ex.id}</TableCell>
                          <TableCell>
                            <p className="font-semibold text-foreground line-clamp-1">{ex.title}</p>
                          </TableCell>
                          <TableCell>{getDifficultyBadge(ex.difficulty)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono bg-muted"><Code2 className="h-3 w-3 mr-1" /> {tcCount}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" onClick={() => handleOpenEdit(ex)}>
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

          {/* TAB SINH VIÊN (BẢNG THỐNG KÊ ĐÃ HOÀN THIỆN) */}
          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>Tiến độ sinh viên</CardTitle>
                <CardDescription>Theo dõi chi tiết số lượng bài tập hoàn thành và hoạt động nộp code</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Họ và Tên</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-center">Số lượt nộp bài</TableHead>
                      <TableHead className="text-center">Bài tập hoàn thành</TableHead>
                      <TableHead className="text-right">Hoạt động gần nhất</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                          <GraduationCap className="h-8 w-8 mx-auto mb-3 opacity-20" />
                          Chưa có sinh viên nào đăng ký hoặc nộp bài trong hệ thống.
                        </TableCell>
                      </TableRow>
                    ) : studentStats.map((student, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-bold text-foreground">{student.fullName}</TableCell>
                        <TableCell className="text-muted-foreground">{student.email}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="font-mono">{student.totalSubmissions}</Badge>
                        </TableCell>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB THỐNG KÊ (BIỂU ĐỒ) */}
          <TabsContent value="stats">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Phân bố bài tập theo độ khó</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {["Easy", "Medium", "Hard"].map(level => {
                      const count = exercises.filter(c => c.difficulty?.toLowerCase() === level.toLowerCase()).length;
                      const pct = exercises.length > 0 ? (count / exercises.length) * 100 : 0;
                      const labels: Record<string, string> = { Easy: "Dễ", Medium: "Trung bình", Hard: "Khó" };
                      const colors: Record<string, string> = { Easy: "bg-success", Medium: "bg-warning", Hard: "bg-destructive" };
                      
                      return (
                        <div key={level}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-foreground font-medium">{labels[level]}</span>
                            <span className="text-muted-foreground">{count} bài</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
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