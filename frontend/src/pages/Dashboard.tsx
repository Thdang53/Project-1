import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";
import { Card, CardContent } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useToast } from "../hooks/use-toast";
import { Users, BookOpen, TrendingUp, Trophy, Layers, FileText, Code2, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

// API Hook & Tabs
import { useDashboardData } from "../hooks/useDashboardData";
import StatsTab from "../components/dashboard/StatsTab";
import UsersTab from "../components/dashboard/UsersTab";
import CoursesTab from "../components/dashboard/CoursesTab";
import LessonsTab from "../components/dashboard/LessonsTab";
import ExercisesTab from "../components/dashboard/ExercisesTab";

// Modals
import CourseModal from "../components/dashboard/CourseModal";
import LessonModal from "../components/dashboard/LessonModal";
import ExerciseModal from "../components/dashboard/ExerciseModal";
import RoleDialog from "../components/dashboard/RoleDialog";
import DeleteConfirmDialog from "../components/dashboard/DeleteConfirmDialog";

// 🚀 Tích hợp Trợ lý Gemini Sidebar
import GeminiSidebar from "../components/dashboard/GeminiSidebar";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Dashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { courses, lessons, exercises, studentStats, isLoading: loading, refetchAll: fetchAllData } = useDashboardData();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveUserId = (token && JSON.parse(atob(token.split('.')[1]))?.nameid) 
    ? parseInt(JSON.parse(atob(token.split('.')[1])).nameid) 
    : studentStats.find(s => s.email?.toLowerCase() === user?.email?.toLowerCase())?.id || (user as any)?.id;

  // States
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [roleTargetUser, setRoleTargetUser] = useState<any>(null);
  const [selectedNewRole, setSelectedNewRole] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null as string | null, id: 0, title: "" });

  const [showAddCourse, setShowAddCourse] = useState(false);
  const [isEditModeCourse, setIsEditModeCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({ id: 0, title: "" });

  const [showAddLesson, setShowAddLesson] = useState(false);
  const [isEditModeLesson, setIsEditModeLesson] = useState(false);
  const [newLesson, setNewLesson] = useState({ id: 0, courseId: "", title: "", orderNum: 1, content: "" });

  const [showAddExercise, setShowAddExercise] = useState(false);
  const [isEditModeEx, setIsEditModeEx] = useState(false);
  const [newExercise, setNewExercise] = useState({ id: 0, title: "", description: "", difficulty: "Easy", lessonId: "" });
  const [testCases, setTestCases] = useState([{ input: "", expectedOutput: "" }]);
  const [selectedCourseIdEx, setSelectedCourseIdEx] = useState("");

  useEffect(() => { if (!user) navigate("/login"); }, [user, navigate]);

  // Logic Xử lý API (Xóa, Đổi quyền, Lưu...)
  const handleApiRequest = async (url: string, method: string, body?: any, successMsg = "Thành công!") => {
    setIsSubmitting(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.ok) { toast({ title: successMsg }); fetchAllData(); return true; }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Lỗi thao tác");
    } catch (e: any) {
      toast({ title: "Thất bại", description: e.message, variant: "destructive" }); return false;
    } finally { setIsSubmitting(false); }
  };

  const executeDelete = async () => {
    const ep = deleteConfirm.type === "course" ? "Courses" : deleteConfirm.type === "lesson" ? "Lessons" : "Exercises";
    const ok = await handleApiRequest(`${API_BASE_URL}/api/${ep}/${deleteConfirm.id}`, "DELETE", null, "Đã xóa dữ liệu");
    if (ok) setDeleteConfirm(p => ({ ...p, isOpen: false }));
  };

  const submitRoleChange = async () => {
    if (!roleTargetUser || roleTargetUser.currentRole === selectedNewRole) return setShowRoleDialog(false);
    const ok = await handleApiRequest(`${API_BASE_URL}/api/UserProfile/role`, "PUT", { email: roleTargetUser.email, role: selectedNewRole });
    if (ok) setShowRoleDialog(false);
  };

  const handleSaveCourse = async () => {
    if (!newCourse.title.trim()) return toast({ title: "Lỗi", description: "Nhập tên khóa học", variant: "destructive" });
    const url = `${API_BASE_URL}/api/Courses${isEditModeCourse ? `/${newCourse.id}` : ""}`;
    const ok = await handleApiRequest(url, isEditModeCourse ? "PUT" : "POST", newCourse);
    if (ok) setShowAddCourse(false);
  };

  const handleSaveLesson = async () => {
    if (!newLesson.title.trim() || !newLesson.courseId) return toast({ title: "Lỗi", description: "Thiếu thông tin", variant: "destructive" });
    const url = `${API_BASE_URL}/api/Lessons${isEditModeLesson ? `/${newLesson.id}` : ""}`;
    const ok = await handleApiRequest(url, isEditModeLesson ? "PUT" : "POST", { ...newLesson, courseId: parseInt(newLesson.courseId) });
    if (ok) setShowAddLesson(false);
  };

  const handleSaveExercise = async () => {
    const validTCs = testCases.filter(tc => tc.expectedOutput.trim() !== "");
    if (!newExercise.title.trim() || !newExercise.lessonId || validTCs.length === 0) return toast({ title: "Lỗi", description: "Kiểm tra lại dữ liệu", variant: "destructive" });
    const url = `${API_BASE_URL}/api/Exercises${isEditModeEx ? `/${newExercise.id}` : ""}`;
    const ok = await handleApiRequest(url, isEditModeEx ? "PUT" : "POST", { ...newExercise, lessonId: parseInt(newExercise.lessonId), testCases: JSON.stringify(validTCs) });
    if (ok) setShowAddExercise(false);
  };

  const addTC = () => setTestCases([...testCases, { input: "", expectedOutput: "" }]);
  const rmTC = (i: number) => { if (testCases.length > 1) setTestCases(testCases.filter((_, idx) => idx !== i)); };
  const upTC = (i: number, f: string, v: string) => { const n: any = [...testCases]; n[i][f] = v; setTestCases(n); };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

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
            { label: "Người dùng", value: studentStats.length, icon: Users, color: "text-primary" },
            { label: "Bài nộp đúng", value: studentStats.reduce((sum, s) => sum + s.completedExercises, 0), icon: Trophy, color: "text-primary" },
            { label: "Trạng thái", value: "Online", icon: TrendingUp, color: "text-primary" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card><CardContent className="p-5 flex gap-4"><div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ${stat.color}`}><stat.icon className="h-6 w-6" /></div><div><p className="text-sm text-muted-foreground">{stat.label}</p><p className="text-xl font-bold">{stat.value}</p></div></CardContent></Card>
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
          <TabsContent value="courses"><CoursesTab courses={courses} currentUser={user} effectiveUserId={effectiveUserId} getAuthorName={(id?:number) => studentStats.find(s=>s.id===id)?.fullName || "Admin"} onOpenDialog={c => { setIsEditModeCourse(!!c); setNewCourse(c || {id:0, title:""}); setShowAddCourse(true); }} onDelete={(id, title) => setDeleteConfirm({isOpen:true, type:"course", id, title})} /></TabsContent>
          <TabsContent value="lessons"><LessonsTab lessons={lessons} courses={courses} currentUser={user} effectiveUserId={effectiveUserId} onOpenDialog={l => { setIsEditModeLesson(!!l); setNewLesson(l ? {...l, courseId: l.courseId.toString()} : {id:0, courseId:"", title:"", orderNum:1, content:""}); setShowAddLesson(true); }} onDelete={(id, title) => setDeleteConfirm({isOpen:true, type:"lesson", id, title})} /></TabsContent>
          <TabsContent value="exercises"><ExercisesTab exercises={exercises} lessons={lessons} courses={courses} currentUser={user} effectiveUserId={effectiveUserId} getDifficultyBadge={()=><span/>} onDelete={(id, title) => setDeleteConfirm({isOpen:true, type:"exercise", id, title})} onOpenDialog={ex => { setIsEditModeEx(!!ex); if(ex){setNewExercise({...ex, lessonId: ex.lessonId.toString()}); const t=lessons.find(l=>l.id===ex.lessonId); if(t)setSelectedCourseIdEx(t.courseId.toString()); try{setTestCases(JSON.parse(ex.testCases))}catch{setTestCases([{input:"",expectedOutput:""}])}}else{setNewExercise({id:0,title:"",description:"",difficulty:"Easy",lessonId:""}); setSelectedCourseIdEx(""); setTestCases([{input:"",expectedOutput:""}])} setShowAddExercise(true); }} /></TabsContent>
          <TabsContent value="students"><UsersTab studentStats={studentStats} exercisesCount={exercises.length} searchTerm={searchTerm} setSearchTerm={setSearchTerm} currentUser={user} onOpenRoleDialog={(email, role, name) => { setRoleTargetUser({email, currentRole: role, fullName: name}); setSelectedNewRole(role); setShowRoleDialog(true); }} /></TabsContent>
          <TabsContent value="stats"><StatsTab studentStats={studentStats} coursesCount={courses.length} exercises={exercises} /></TabsContent>
        </Tabs>
      </div>

      <CourseModal open={showAddCourse} setOpen={setShowAddCourse} isEdit={isEditModeCourse} course={newCourse} setCourse={setNewCourse} onSave={handleSaveCourse} isSubmitting={isSubmitting} />
      <LessonModal open={showAddLesson} setOpen={setShowAddLesson} isEdit={isEditModeLesson} lesson={newLesson} setLesson={setNewLesson} courses={courses} user={user} effectiveUserId={effectiveUserId} onSave={handleSaveLesson} isSubmitting={isSubmitting} />
      <ExerciseModal open={showAddExercise} setOpen={setShowAddExercise} isEdit={isEditModeEx} ex={newExercise} setEx={setNewExercise} courses={courses} lessons={lessons} user={user} effectiveUserId={effectiveUserId} selectedCourseId={selectedCourseIdEx} setSelectedCourseId={setSelectedCourseIdEx} testCases={testCases} addTestCase={addTC} updateTestCase={upTC} removeTestCase={rmTC} onSave={handleSaveExercise} isSubmitting={isSubmitting} />
      <RoleDialog open={showRoleDialog} setOpen={setShowRoleDialog} targetUser={roleTargetUser} role={selectedNewRole} setRole={setSelectedNewRole} onSubmit={submitRoleChange} isSubmitting={isSubmitting} />
      <DeleteConfirmDialog open={deleteConfirm.isOpen} setOpen={(open:boolean) => setDeleteConfirm(p => ({...p, isOpen: open}))} info={deleteConfirm} onConfirm={executeDelete} isSubmitting={isSubmitting} />

      {/* 🚀 ĐÂY LÀ CHỖ GỌI SIÊU PHẨM TRỢ LÝ GEMINI */}
      <GeminiSidebar />
    </div>
  );
};

export default Dashboard;