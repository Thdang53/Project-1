import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Users, BookOpen, TrendingUp, Plus, BarChart3, GraduationCap, Trophy, Edit, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import type { Tables } from "@/integrations/supabase/types";

type Course = Tables<"courses">;

interface StudentProgress {
  user_id: string;
  display_name: string | null;
  course_title: string;
  status: string;
  score: number | null;
  completed_at: string | null;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [studentStats, setStudentStats] = useState<StudentProgress[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  // New course form
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: "", description: "", language: "python", level: "basic", total_lessons: 0 });

  useEffect(() => {
    if (!user) return;
    checkRole();
  }, [user]);

  const checkRole = async () => {
    if (!user) return;
    const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" as const });
    const { data: teacherData } = await supabase.rpc("has_role", { _user_id: user.id, _role: "teacher" as const });
    
    if (!data && !teacherData) {
      toast({ title: "Không có quyền truy cập", description: "Bạn cần quyền giáo viên hoặc admin.", variant: "destructive" });
      navigate("/");
      return;
    }
    setIsAdmin(!!data);
    await Promise.all([fetchCourses(), fetchStudentStats()]);
    setLoading(false);
  };

  const fetchCourses = async () => {
    const { data } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
    if (data) setCourses(data);
  };

  const fetchStudentStats = async () => {
    const { data: progress } = await supabase
      .from("learning_progress")
      .select("user_id, course_id, status, score, completed_at");

    if (!progress) return;

    const userIds = [...new Set(progress.map(p => p.user_id))];
    setTotalStudents(userIds.length);
    setCompletedCount(progress.filter(p => p.status === "completed").length);

    // Get profiles and courses for display
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name");
    const { data: coursesData } = await supabase.from("courses").select("id, title");

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) ?? []);
    const courseMap = new Map(coursesData?.map(c => [c.id, c.title]) ?? []);

    const stats: StudentProgress[] = progress.map(p => ({
      user_id: p.user_id,
      display_name: profileMap.get(p.user_id) ?? "Unknown",
      course_title: courseMap.get(p.course_id) ?? "Unknown",
      status: p.status,
      score: p.score,
      completed_at: p.completed_at,
    }));
    setStudentStats(stats);
  };

  const handleAddCourse = async () => {
    if (!newCourse.title.trim()) {
      toast({ title: "Vui lòng nhập tên khóa học", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("courses").insert({
      title: newCourse.title,
      description: newCourse.description || null,
      language: newCourse.language,
      level: newCourse.level,
      total_lessons: newCourse.total_lessons,
    });
    if (error) {
      toast({ title: "Lỗi tạo khóa học", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tạo khóa học thành công!" });
      setShowAddCourse(false);
      setNewCourse({ title: "", description: "", language: "python", level: "basic", total_lessons: 0 });
      fetchCourses();
    }
  };

  const handleDeleteCourse = async (id: string) => {
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) {
      toast({ title: "Lỗi xóa khóa học", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Đã xóa khóa học" });
      fetchCourses();
    }
  };

  const statusLabel: Record<string, string> = {
    in_progress: "Đang học",
    completed: "Hoàn thành",
  };

  const statusVariant = (s: string) => s === "completed" ? "default" : "secondary";

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
              Dashboard <span className="text-gradient-primary">{isAdmin ? "Admin" : "Giáo viên"}</span>
            </h1>
            <p className="mt-1 text-muted-foreground">Quản lý khóa học và theo dõi tiến độ sinh viên</p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Khóa học", value: courses.length, icon: BookOpen, color: "text-primary" },
            { label: "Sinh viên", value: totalStudents, icon: Users, color: "text-accent" },
            { label: "Hoàn thành", value: completedCount, icon: Trophy, color: "text-success" },
            { label: "Tỷ lệ", value: studentStats.length > 0 ? Math.round((completedCount / studentStats.length) * 100) + "%" : "0%", icon: TrendingUp, color: "text-warning" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="border-border shadow-card">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-muted ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList>
            <TabsTrigger value="courses" className="gap-1.5"><BookOpen className="h-4 w-4" /> Khóa học</TabsTrigger>
            <TabsTrigger value="students" className="gap-1.5"><GraduationCap className="h-4 w-4" /> Sinh viên</TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Thống kê</TabsTrigger>
          </TabsList>

          {/* Courses Tab */}
          <TabsContent value="courses">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Danh sách khóa học</CardTitle>
                  <CardDescription>Quản lý tất cả khóa học trên hệ thống</CardDescription>
                </div>
                <Dialog open={showAddCourse} onOpenChange={setShowAddCourse}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                      <Plus className="mr-1.5 h-4 w-4" /> Thêm khóa học
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tạo khóa học mới</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <Input placeholder="Tên khóa học" value={newCourse.title} onChange={e => setNewCourse(p => ({ ...p, title: e.target.value }))} />
                      <Textarea placeholder="Mô tả" value={newCourse.description} onChange={e => setNewCourse(p => ({ ...p, description: e.target.value }))} />
                      <div className="grid grid-cols-2 gap-3">
                        <Select value={newCourse.language} onValueChange={v => setNewCourse(p => ({ ...p, language: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="python">Python</SelectItem>
                            <SelectItem value="javascript">JavaScript</SelectItem>
                            <SelectItem value="java">Java</SelectItem>
                            <SelectItem value="cpp">C++</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={newCourse.level} onValueChange={v => setNewCourse(p => ({ ...p, level: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basic">Cơ bản</SelectItem>
                            <SelectItem value="intermediate">Trung bình</SelectItem>
                            <SelectItem value="advanced">Nâng cao</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Input type="number" placeholder="Số bài học" value={newCourse.total_lessons || ""} onChange={e => setNewCourse(p => ({ ...p, total_lessons: parseInt(e.target.value) || 0 }))} />
                      <Button onClick={handleAddCourse} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">Tạo khóa học</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên khóa học</TableHead>
                      <TableHead>Ngôn ngữ</TableHead>
                      <TableHead>Cấp độ</TableHead>
                      <TableHead>Số bài</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Chưa có khóa học nào</TableCell>
                      </TableRow>
                    ) : courses.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.title}</TableCell>
                        <TableCell><Badge variant="secondary">{c.language}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{c.level}</Badge></TableCell>
                        <TableCell>{c.total_lessons}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteCourse(c.id)}>
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

          {/* Students Tab */}
          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>Tiến độ sinh viên</CardTitle>
                <CardDescription>Theo dõi quá trình học tập của từng sinh viên</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sinh viên</TableHead>
                      <TableHead>Khóa học</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Điểm</TableHead>
                      <TableHead>Hoàn thành</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Chưa có dữ liệu</TableCell>
                      </TableRow>
                    ) : studentStats.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{s.display_name}</TableCell>
                        <TableCell>{s.course_title}</TableCell>
                        <TableCell><Badge variant={statusVariant(s.status)}>{statusLabel[s.status] ?? s.status}</Badge></TableCell>
                        <TableCell>{s.score !== null ? s.score : "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {s.completed_at ? new Date(s.completed_at).toLocaleDateString("vi-VN") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Phân bố khóa học theo cấp độ</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {["basic", "intermediate", "advanced"].map(level => {
                      const count = courses.filter(c => c.level === level).length;
                      const pct = courses.length > 0 ? (count / courses.length) * 100 : 0;
                      const labels: Record<string, string> = { basic: "Cơ bản", intermediate: "Trung bình", advanced: "Nâng cao" };
                      return (
                        <div key={level}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-foreground font-medium">{labels[level]}</span>
                            <span className="text-muted-foreground">{count} khóa</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Tổng quan tiến độ</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: "Đang học", count: studentStats.filter(s => s.status === "in_progress").length, color: "bg-accent" },
                      { label: "Hoàn thành", count: completedCount, color: "bg-primary" },
                    ].map(item => {
                      const pct = studentStats.length > 0 ? (item.count / studentStats.length) * 100 : 0;
                      return (
                        <div key={item.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-foreground font-medium">{item.label}</span>
                            <span className="text-muted-foreground">{item.count} lượt</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${pct}%` }} />
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
