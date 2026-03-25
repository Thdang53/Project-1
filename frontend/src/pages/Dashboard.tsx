import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { useToast } from "../hooks/use-toast";
import { Users, BookOpen, TrendingUp, Trophy, Layers, FileText, Code2, BarChart3, AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

// 💡 IMPORT TẤT CẢ 5 TAB ĐÃ TÁCH
import StatsTab from "../components/dashboard/StatsTab";
import UsersTab from "../components/dashboard/UsersTab";
import CoursesTab from "../components/dashboard/CoursesTab";
import LessonsTab from "../components/dashboard/LessonsTab";
import ExercisesTab from "../components/dashboard/ExercisesTab";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Course { id: number; title: string; lecturerId?: number; }
interface Lesson { id: number; courseId: number; title: string; orderNum: number; content: string; }
interface Exercise { id: number; title: string; difficulty: string; description: string; testCases: string; lessonId: number; }
interface TestCase { input: string; expectedOutput: string; }

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

  let tokenUserId: number | null = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const idClaim = payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || payload.nameid || payload.sub || payload.id;
      if (idClaim) tokenUserId = parseInt(idClaim);
    } catch (e) {}
  }
  const effectiveUserId = tokenUserId || studentStats.find(s => s.email?.toLowerCase() === user?.email?.toLowerCase())?.id || (user as any)?.id;

  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [roleTargetUser, setRoleTargetUser] = useState<{email: string, currentRole: string, fullName: string} | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; type: "course" | "lesson" | "exercise" | null; id: number; title: string; }>({ isOpen: false, type: null, id: 0, title: "" });

  const [showAddExercise, setShowAddExercise] = useState(false);
  const [isEditModeEx, setIsEditModeEx] = useState(false);
  const [newExercise, setNewExercise] = useState({ id: 0, title: "", description: "", difficulty: "Easy", lessonId: "" });
  const [testCases, setTestCases] = useState<TestCase[]>([{ input: "", expectedOutput: "" }]);
  const [selectedCourseIdEx, setSelectedCourseIdEx] = useState("");

  const [showAddCourse, setShowAddCourse] = useState(false);
  const [isEditModeCourse, setIsEditModeCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({ id: 0, title: "" });

  const [showAddLesson, setShowAddLesson] = useState(false);
  const [isEditModeLesson, setIsEditModeLesson] = useState(false);
  const [newLesson, setNewLesson] = useState({ id: 0, courseId: "", title: "", orderNum: 1, content: "Nội dung bài học..." });

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetchAllData();
  }, [user]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [resCourses, resLessons, resExercises, resStats] = await Promise.all([
        fetch(`${API_BASE_URL}/api/Courses`), fetch(`${API_BASE_URL}/api/Lessons`),
        fetch(`${API_BASE_URL}/api/Exercises`), fetch(`${API_BASE_URL}/api/UserProfile/stats`)
      ]);
      if (resCourses.ok) setCourses(await resCourses.json());
      if (resLessons.ok) setLessons(await resLessons.json());
      if (resExercises.ok) setExercises(await resExercises.json());
      if (resStats.ok) setStudentStats(await resStats.json());
    } catch (error) { toast({ title: "Lỗi kết nối", variant: "destructive" }); } 
    finally { setLoading(false); }
  };

  const executeDelete = async () => {
    if (!deleteConfirm.type) return;
    setIsSubmitting(true);
    try {
      let endpoint = deleteConfirm.type === "course" ? "Courses" : deleteConfirm.type === "lesson" ? "Lessons" : "Exercises";
      const res = await fetch(`${API_BASE_URL}/api/${endpoint}/${deleteConfirm.id}`, { method: 'DELETE', headers: { "Authorization": `Bearer ${token}` } });
      if (res.ok) {
        toast({ title: "Thành công", description: "Đã xóa dữ liệu." });
        setDeleteConfirm({ ...deleteConfirm, isOpen: false });
        fetchAllData();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Lỗi xóa", description: data.message || "Lỗi", variant: "destructive" });
      }
    } catch (e) { toast({ title: "Lỗi hệ thống", variant: "destructive" }); } 
    finally { setIsSubmitting(false); }
  };

  const submitRoleChange = async () => {
    if (!roleTargetUser || roleTargetUser.currentRole === selectedNewRole) return setShowRoleDialog(false);
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/UserProfile/role`, {
        method: "PUT", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ email: roleTargetUser.email, role: selectedNewRole }),
      });
      if (response.ok) { toast({ title: "Thành công!" }); setShowRoleDialog(false); fetchAllData(); } 
      else toast({ title: "Lỗi đổi quyền", variant: "destructive" });
    } catch (error) { toast({ title: "Lỗi kết nối", variant: "destructive" }); } 
    finally { setIsSubmitting(false); }
  };

  const handleSaveCourse = async () => {
    if (!newCourse.title.trim()) return toast({ title: "Lỗi nhập", variant: "destructive" });
    setIsSubmitting(true);
    try {
      const url = isEditModeCourse ? `${API_BASE_URL}/api/Courses/${newCourse.id}` : `${API_BASE_URL}/api/Courses`;
      const res = await fetch(url, { method: isEditModeCourse ? "PUT" : "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify(newCourse) });
      if (res.ok) { toast({ title: "Thành công!" }); setShowAddCourse(false); fetchAllData(); } 
      else throw new Error();
    } catch (e) { toast({ title: "Lỗi lưu", variant: "destructive" }); } finally { setIsSubmitting(false); }
  };

  const handleSaveLesson = async () => {
    if (!newLesson.title.trim() || !newLesson.courseId) return toast({ title: "Lỗi nhập", variant: "destructive" });
    setIsSubmitting(true);
    try {
      const url = isEditModeLesson ? `${API_BASE_URL}/api/Lessons/${newLesson.id}` : `${API_BASE_URL}/api/Lessons`;
      const res = await fetch(url, { method: isEditModeLesson ? "PUT" : "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify({ ...newLesson, courseId: parseInt(newLesson.courseId) }) });
      if (res.ok) { toast({ title: "Thành công!" }); setShowAddLesson(false); fetchAllData(); } 
      else throw new Error();
    } catch (e) { toast({ title: "Thất bại", variant: "destructive" }); } finally { setIsSubmitting(false); }
  };

  const handleSaveExercise = async () => {
    const validTestCases = testCases.filter(tc => tc.expectedOutput.trim() !== "");
    if (!newExercise.title.trim() || !newExercise.lessonId || validTestCases.length === 0) return toast({ title: "Lỗi dữ liệu", variant: "destructive" });
    setIsSubmitting(true);
    try {
      const url = isEditModeEx ? `${API_BASE_URL}/api/Exercises/${newExercise.id}` : `${API_BASE_URL}/api/Exercises`;
      const res = await fetch(url, { method: isEditModeEx ? "PUT" : "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify({ ...newExercise, lessonId: parseInt(newExercise.lessonId), testCases: JSON.stringify(validTestCases) }) });
      if (res.ok) { toast({ title: "Thành công!" }); setShowAddExercise(false); fetchAllData(); } 
      else throw new Error();
    } catch (e) { toast({ title: "Thất bại", variant: "destructive" }); } finally { setIsSubmitting(false); }
  };

  // 💡 BỔ SUNG LẠI 3 HÀM DÀNH CHO TEST CASES
  const addTestCase = () => setTestCases([...testCases, { input: "", expectedOutput: "" }]);
  const removeTestCase = (i: number) => { if (testCases.length > 1) setTestCases(testCases.filter((_, idx) => idx !== i)); };
  const updateTestCase = (i: number, f: keyof TestCase, v: string) => { const n = [...testCases]; n[i][f] = v; setTestCases(n); };

  // Helper
  const getAuthorName = (lecturerId?: number) => {
    if (!lecturerId) return "Hệ thống (Admin)";
    const author = studentStats.find(s => s.id === lecturerId);
    return author ? author.fullName || author.email : "Giảng viên (ẩn danh)";
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff?.toLowerCase()) { case 'easy': return <Badge className="bg-success">Dễ</Badge>; case 'medium': return <Badge className="bg-warning">Trung bình</Badge>; case 'hard': return <Badge variant="destructive">Khó</Badge>; default: return <Badge variant="outline">{diff}</Badge>; }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-6 pt-24 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard <span className="text-gradient-primary">Quản Lý</span></h1>
          <p className="text-muted-foreground">Công cụ dành cho {user?.role === "Admin" ? "Quản trị viên" : "Giảng viên"}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Bài tập", value: exercises.length, icon: BookOpen, color: "text-primary" },
            { label: "Người dùng", value: studentStats.length, icon: Users, color: "text-accent" },
            { label: "Bài nộp đúng", value: studentStats.reduce((sum, s) => sum + s.completedExercises, 0), icon: Trophy, color: "text-success" },
            { label: "Trạng thái", value: "Online", icon: TrendingUp, color: "text-warning" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card><CardContent className="p-5 flex gap-4"><div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-muted ${stat.color}`}><stat.icon className="h-6 w-6" /></div><div><p className="text-sm text-muted-foreground">{stat.label}</p><p className="text-xl font-bold">{stat.value}</p></div></CardContent></Card>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList className="flex flex-wrap gap-2">
            <TabsTrigger value="courses" className="gap-1.5"><Layers className="h-4 w-4" /> Khóa học</TabsTrigger>
            <TabsTrigger value="lessons" className="gap-1.5"><FileText className="h-4 w-4" /> Bài học</TabsTrigger>
            <TabsTrigger value="exercises" className="gap-1.5"><Code2 className="h-4 w-4" /> Bài tập</TabsTrigger>
            <TabsTrigger value="students" className="gap-1.5"><Users className="h-4 w-4" /> Người dùng</TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Thống kê</TabsTrigger>
          </TabsList>

          <TabsContent value="courses">
            <CoursesTab courses={courses} currentUser={user} effectiveUserId={effectiveUserId} getAuthorName={getAuthorName} onOpenDialog={(c) => { setIsEditModeCourse(!!c); setNewCourse(c || { id: 0, title: "" }); setShowAddCourse(true); }} onDelete={(id, title) => setDeleteConfirm({ isOpen: true, type: "course", id, title })} />
          </TabsContent>
          <TabsContent value="lessons">
            <LessonsTab lessons={lessons} courses={courses} currentUser={user} effectiveUserId={effectiveUserId} onOpenDialog={(l) => { setIsEditModeLesson(!!l); setNewLesson(l ? { ...l, courseId: l.courseId.toString() } : { id: 0, courseId: "", title: "", orderNum: 1, content: "" }); setShowAddLesson(true); }} onDelete={(id, title) => setDeleteConfirm({ isOpen: true, type: "lesson", id, title })} />
          </TabsContent>
          <TabsContent value="exercises">
            <ExercisesTab exercises={exercises} lessons={lessons} courses={courses} currentUser={user} effectiveUserId={effectiveUserId} getDifficultyBadge={getDifficultyBadge} onDelete={(id, title) => setDeleteConfirm({ isOpen: true, type: "exercise", id, title })} onOpenDialog={(ex) => { setIsEditModeEx(!!ex); if(ex) { setNewExercise({...ex, lessonId: ex.lessonId.toString()}); const t = lessons.find(l=>l.id===ex.lessonId); if(t) setSelectedCourseIdEx(t.courseId.toString()); try{setTestCases(JSON.parse(ex.testCases))}catch{setTestCases([{input:"",expectedOutput:""}])} } else { setNewExercise({id:0,title:"",description:"",difficulty:"Easy",lessonId:""}); setSelectedCourseIdEx(""); setTestCases([{input:"",expectedOutput:""}]); } setShowAddExercise(true); }} />
          </TabsContent>
          <TabsContent value="students">
            <UsersTab studentStats={studentStats} exercisesCount={exercises.length} searchTerm={searchTerm} setSearchTerm={setSearchTerm} currentUser={user} onOpenRoleDialog={(email, role, name) => { if(user?.email===email) return; setRoleTargetUser({email, currentRole: role, fullName: name}); setSelectedNewRole(role); setShowRoleDialog(true); }} />
          </TabsContent>
          <TabsContent value="stats">
            <StatsTab studentStats={studentStats} coursesCount={courses.length} exercises={exercises} />
          </TabsContent>
        </Tabs>
      </div>

      {/* DIALOG THÊM KHÓA HỌC */}
      <Dialog open={showAddCourse} onOpenChange={setShowAddCourse}><DialogContent><DialogHeader><DialogTitle>{isEditModeCourse ? "Sửa" : "Tạo"} khóa học</DialogTitle></DialogHeader><div className="space-y-4 mt-4"><Input placeholder="Tên khóa học" value={newCourse.title} onChange={e => setNewCourse({ ...newCourse, title: e.target.value })} /><Button onClick={handleSaveCourse} disabled={isSubmitting} className="w-full bg-primary">{isSubmitting ? <Loader2 className="animate-spin" /> : "Lưu"}</Button></div></DialogContent></Dialog>
      
      {/* DIALOG THÊM BÀI HỌC */}
      <Dialog open={showAddLesson} onOpenChange={setShowAddLesson}><DialogContent><DialogHeader><DialogTitle>{isEditModeLesson ? "Sửa" : "Tạo"} bài học</DialogTitle></DialogHeader><div className="space-y-4 mt-4">
        <Select value={newLesson.courseId} onValueChange={v => setNewLesson({ ...newLesson, courseId: v })}><SelectTrigger><SelectValue placeholder="Chọn Khóa học" /></SelectTrigger><SelectContent>{courses.filter(c => user?.role === "Admin" || c.lecturerId === effectiveUserId).map(c => (<SelectItem key={c.id} value={c.id.toString()}>{c.title}</SelectItem>))}</SelectContent></Select>
        <Input placeholder="Tên bài học" value={newLesson.title} onChange={e => setNewLesson({ ...newLesson, title: e.target.value })} />
        <Input type="number" placeholder="Số thứ tự" value={newLesson.orderNum} onChange={e => setNewLesson({ ...newLesson, orderNum: parseInt(e.target.value) || 1 })} />
        <Button onClick={handleSaveLesson} disabled={isSubmitting} className="w-full bg-primary">Lưu</Button></div></DialogContent>
      </Dialog>

      {/* DIALOG THÊM BÀI TẬP */}
      <Dialog open={showAddExercise} onOpenChange={setShowAddExercise}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{isEditModeEx ? "Sửa" : "Tạo"} bài tập</DialogTitle></DialogHeader><div className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-3"><Select value={selectedCourseIdEx} onValueChange={(v) => { setSelectedCourseIdEx(v); setNewExercise({...newExercise, lessonId: ""}); }}><SelectTrigger><SelectValue placeholder="Khóa học" /></SelectTrigger><SelectContent>{courses.filter(c => user?.role === "Admin" || c.lecturerId === effectiveUserId).map(c => (<SelectItem key={c.id} value={c.id.toString()}>{c.title}</SelectItem>))}</SelectContent></Select>
        <Select value={newExercise.lessonId} onValueChange={v => setNewExercise({ ...newExercise, lessonId: v })} disabled={!selectedCourseIdEx}><SelectTrigger><SelectValue placeholder="Bài học" /></SelectTrigger><SelectContent>{lessons.filter(l => l.courseId.toString() === selectedCourseIdEx).map(l => (<SelectItem key={l.id} value={l.id.toString()}>Bài {l.orderNum}: {l.title}</SelectItem>))}</SelectContent></Select></div>
        <Input placeholder="Tiêu đề" value={newExercise.title} onChange={e => setNewExercise(p => ({ ...p, title: e.target.value }))} /><Textarea placeholder="Mô tả..." rows={4} value={newExercise.description} onChange={e => setNewExercise(p => ({ ...p, description: e.target.value }))} />
        <Select value={newExercise.difficulty} onValueChange={v => setNewExercise(p => ({ ...p, difficulty: v }))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Easy">Dễ</SelectItem><SelectItem value="Medium">Trung bình</SelectItem><SelectItem value="Hard">Khó</SelectItem></SelectContent></Select>
        <div className="pt-4 border-t"><div className="flex justify-between mb-4"><label className="font-semibold">Test Cases</label><Button type="button" variant="secondary" size="sm" onClick={addTestCase}><Plus className="h-3 w-3" /> Thêm</Button></div>
          <div className="space-y-3">{testCases.map((tc, idx) => (<div key={idx} className="flex gap-2"><Input placeholder="Input" value={tc.input} onChange={e => updateTestCase(idx, 'input', e.target.value)} /><Input placeholder="Output" value={tc.expectedOutput} onChange={e => updateTestCase(idx, 'expectedOutput', e.target.value)} />{testCases.length > 1 && <Button type="button" variant="ghost" onClick={() => removeTestCase(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div>))}</div></div>
        <Button onClick={handleSaveExercise} disabled={isSubmitting} className="w-full bg-primary">Lưu</Button></div></DialogContent>
      </Dialog>

      {/* POPUP ĐỔI QUYỀN */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}><DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>Quản lý quyền</DialogTitle></DialogHeader>
        <div className="py-4"><Select value={selectedNewRole} onValueChange={setSelectedNewRole}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Student">Sinh viên</SelectItem><SelectItem value="Lecturer">Giảng viên</SelectItem><SelectItem value="Admin">Admin</SelectItem></SelectContent></Select></div>
        <DialogFooter><Button onClick={submitRoleChange} disabled={isSubmitting}>Cập nhật</Button></DialogFooter></DialogContent>
      </Dialog>

      {/* POPUP XÓA */}
      <Dialog open={deleteConfirm.isOpen} onOpenChange={(open) => setDeleteConfirm(prev => ({ ...prev, isOpen: open }))}><DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle className="flex gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Xác nhận xóa</DialogTitle><DialogDescription>Xóa <strong className="text-foreground">{deleteConfirm.title}</strong>?</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}>Hủy</Button><Button variant="destructive" onClick={executeDelete} disabled={isSubmitting}>Xóa</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
};

export default Dashboard;