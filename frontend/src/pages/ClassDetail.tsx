import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, ArrowLeft, PlusCircle, Play, Loader2, Sparkles, Trash2, Code2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface TestCase {
  input: string;
  expectedOutput: string;
}

const ClassDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const userRole = (user as any)?.role;

  const [classInfo, setClassInfo] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form tạo bài thủ công (Full tính năng)
  const [showForm, setShowForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [newEx, setNewEx] = useState({ 
    title: "", 
    description: "", 
    difficulty: "Cơ bản",
    starterCode: "# Viết code của bạn ở đây...\ndef solve():\n  pass"
  });
  const [testCases, setTestCases] = useState<TestCase[]>([{ input: "", expectedOutput: "" }]);

  useEffect(() => {
    if (token) fetchClassDetail();
  }, [token, id]);

  const fetchClassDetail = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/Class/${id}`, { headers: { "Authorization": `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setClassInfo(data.classInfo);
        setExercises(data.exercises);
      }
    } catch (e) { toast({ title: "Lỗi tải dữ liệu", variant: "destructive" }); } finally { setIsLoading(false); }
  };

  // Quản lý Test Cases
  const handleAddTestCase = () => {
    setTestCases([...testCases, { input: "", expectedOutput: "" }]);
  };

  const handleRemoveTestCase = (index: number) => {
    if (testCases.length === 1) return toast({ title: "Phải có ít nhất 1 Test Case", variant: "destructive" });
    const newCases = testCases.filter((_, i) => i !== index);
    setTestCases(newCases);
  };

  const handleTestCaseChange = (index: number, field: keyof TestCase, value: string) => {
    const newCases = [...testCases];
    newCases[index][field] = value;
    setTestCases(newCases);
  };

  const handleCreateExercise = async () => {
    if (!newEx.title || !newEx.description) return toast({ title: "Vui lòng nhập đủ Tên và Mô tả", variant: "destructive" });
    
    // Kiểm tra xem Test Case có bị rỗng không
    const invalidTestCase = testCases.find(tc => !tc.input.trim() || !tc.expectedOutput.trim());
    if (invalidTestCase) return toast({ title: "Vui lòng điền đủ Input/Output cho các Test Case", variant: "destructive" });

    setIsCreating(true);
    
    // Đóng gói dữ liệu để gửi xuống API C#
    const payload = {
      Title: newEx.title,
      Description: newEx.description,
      Difficulty: newEx.difficulty,
      StarterCode: newEx.starterCode,
      TestCases: testCases.map(tc => ({ Input: tc.input, ExpectedOutput: tc.expectedOutput })) // Format lại key cho khớp C#
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/Class/${id}/exercises`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Tuyệt vời! Đã giao bài tập cho lớp." });
        setShowForm(false); 
        // Reset form
        setNewEx({ title: "", description: "", difficulty: "Cơ bản", starterCode: "# Viết code của bạn ở đây...\ndef solve():\n  pass" });
        setTestCases([{ input: "", expectedOutput: "" }]);
        fetchClassDetail(); // Tải lại danh sách
      }
    } catch (e) { toast({ title: "Lỗi kết nối", variant: "destructive" }); } finally { setIsCreating(false); }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Navbar />
      <div className="container mx-auto px-6 pt-24 pb-10 max-w-5xl">
        <Button variant="ghost" onClick={() => navigate("/classrooms")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" /> Quay lại Lớp học</Button>
        
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-8 border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">{classInfo?.className}</h1>
            <p className="text-muted-foreground mt-2 font-medium">Giảng viên: <span className="text-foreground">{classInfo?.lecturerName}</span> • Mã Lớp: <span className="uppercase text-primary">{classInfo?.joinCode}</span></p>
          </div>
          {userRole !== "Student" && (
            <Button onClick={() => setShowForm(!showForm)} className="bg-primary shadow-md"><PlusCircle className="h-4 w-4 mr-2" /> Giao bài thủ công</Button>
          )}
        </div>

        {/* 🌟 FORM TẠO BÀI TẬP CHI TIẾT */}
        {showForm && (
          <Card className="p-6 mb-8 border-primary/30 shadow-lg animate-in slide-in-from-top-4">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Sparkles className="h-5 w-5 text-warning"/> Soạn Bài tập Lập trình</h2>
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold">Tên bài tập</label>
                  <Input placeholder="VD: Tính tổng mảng, Tìm số nguyên tố..." value={newEx.title} onChange={e => setNewEx({...newEx, title: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Độ khó</label>
                  <select value={newEx.difficulty} onChange={e => setNewEx({...newEx, difficulty: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary">
                    <option>Cơ bản</option><option>Trung bình</option><option>Nâng cao</option><option>OLP</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Mô tả Đề bài (Hỗ trợ Markdown)</label>
                <Textarea placeholder="Viết đề bài chi tiết, giải thích rõ Input/Output..." value={newEx.description} onChange={e => setNewEx({...newEx, description: e.target.value})} className="min-h-[120px]"/>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2"><Code2 className="h-4 w-4"/> Code Mẫu (Starter Code)</label>
                <Textarea placeholder="Đoạn code ban đầu hiện ra trên màn hình sinh viên..." value={newEx.starterCode} onChange={e => setNewEx({...newEx, starterCode: e.target.value})} className="min-h-[120px] font-mono text-sm bg-muted/30"/>
              </div>

              {/* KHU VỰC TEST CASES */}
              <div className="pt-4 border-t space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-primary">Bộ Test Cases chấm điểm</label>
                  <Button variant="outline" size="sm" onClick={handleAddTestCase}><Plus className="h-4 w-4 mr-1"/> Thêm Test Case</Button>
                </div>
                
                <div className="space-y-3">
                  {testCases.map((tc, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 border rounded-xl bg-muted/10 relative group">
                      <div className="flex-1 space-y-2">
                        <Input placeholder="Input (VD: 1 2 3)" value={tc.input} onChange={e => handleTestCaseChange(index, "input", e.target.value)} className="font-mono text-sm h-9"/>
                      </div>
                      <div className="flex-1 space-y-2">
                        <Input placeholder="Expected Output (VD: 6)" value={tc.expectedOutput} onChange={e => handleTestCaseChange(index, "expectedOutput", e.target.value)} className="font-mono text-sm h-9"/>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 mt-0.5" onClick={() => handleRemoveTestCase(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowForm(false)}>Hủy bỏ</Button>
                <Button onClick={handleCreateExercise} disabled={isCreating} className="bg-gradient-primary w-32">
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Phát hành"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* 🌟 DANH SÁCH BÀI TẬP */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center"><BookOpen className="h-5 w-5 mr-2 text-primary" /> Bài tập Lớp học</h2>
          {exercises.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground border border-dashed rounded-xl bg-muted/10">
              <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30"/> 
              <p>Lớp chưa có bài tập nào.</p>
              {userRole !== "Student" && <p className="text-sm mt-1">Thầy/Cô hãy giao bài thủ công hoặc qua nhờ AI Cố vấn tạo giúp nhé!</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {exercises.map(ex => (
                <Card key={ex.id} className="p-5 flex justify-between items-center hover:border-primary/50 transition-all hover:shadow-md bg-card">
                  <div className="flex-1 pr-6">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg text-foreground">{ex.title}</h3>
                      <span className="text-[10px] uppercase font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-md">{ex.difficulty}</span>
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-2 prose prose-sm dark:prose-invert">
                      <ReactMarkdown>{ex.description}</ReactMarkdown>
                    </div>
                  </div>
                  <Button onClick={() => navigate(`/workspace?id=${ex.id}`)} className="bg-primary hover:bg-primary/90 shrink-0 shadow-sm h-11 px-6 rounded-xl">
                    <Play className="h-4 w-4 mr-2" /> Làm bài
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassDetail;