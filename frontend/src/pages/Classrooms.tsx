import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, PlusCircle, LogIn, Loader2, ArrowRight, GraduationCap, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ClassInfo { id: number; className: string; joinCode: string; studentCount: number; createdAt: string; lecturerName?: string; joinedAt?: string; }

const Classrooms = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const userRole = (user as any)?.role;

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // States cho Form Tạo/Tham gia lớp
  const [newClassName, setNewClassName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  useEffect(() => {
    if (token) fetchClasses();
  }, [token, userRole]);

  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Class/my-classes`, { headers: { "Authorization": `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setClasses(data.data);
    } catch (error) { toast({ title: "Lỗi tải lớp học", variant: "destructive" }); } finally { setIsLoading(false); }
  };

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return toast({ title: "Vui lòng nhập tên lớp", variant: "destructive" });
    setIsActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Class/create`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ ClassName: newClassName })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Thành công", description: `Đã tạo lớp. Mã: ${data.data.joinCode}` });
        setIsCreateModalOpen(false); setNewClassName(""); fetchClasses();
      } else toast({ title: "Lỗi", description: data.message, variant: "destructive" });
    } catch (error) { toast({ title: "Lỗi hệ thống", variant: "destructive" }); } finally { setIsActionLoading(false); }
  };

  const handleJoinClass = async () => {
    if (!joinCode.trim()) return toast({ title: "Vui lòng nhập mã lớp", variant: "destructive" });
    setIsActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Class/join`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ JoinCode: joinCode.toUpperCase() })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Thành công", description: data.message });
        setIsJoinModalOpen(false); setJoinCode(""); fetchClasses();
      } else toast({ title: "Lỗi", description: data.message, variant: "destructive" });
    } catch (error) { toast({ title: "Lỗi hệ thống", variant: "destructive" }); } finally { setIsActionLoading(false); }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-muted/10 flex flex-col font-sans">
      <Navbar />
      <div className="container mx-auto px-6 pt-24 pb-12 max-w-6xl flex-1">
        
        {/* HEADER THUẦN TÚY */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">Không gian Lớp học</h1>
            <p className="text-muted-foreground mt-1">Quản lý các khóa học và lộ trình học tập của bạn.</p>
          </div>
          
          <div className="flex gap-3">
            {userRole === "Student" ? (
              <Dialog open={isJoinModalOpen} onOpenChange={setIsJoinModalOpen}>
                <DialogTrigger asChild><Button className="bg-primary shadow-md hover:bg-primary/90"><LogIn className="h-4 w-4 mr-2" /> Tham gia lớp</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nhập mã lớp học</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Input placeholder="VD: A1B2C3" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} className="uppercase font-mono tracking-widest text-center text-lg h-12"/>
                    <Button onClick={handleJoinClass} disabled={isActionLoading} className="w-full h-12">{isActionLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Xác nhận tham gia"}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild><Button className="bg-primary shadow-md hover:bg-primary/90"><PlusCircle className="h-4 w-4 mr-2" /> Tạo lớp mới</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Tạo lớp học mới</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Input placeholder="Tên lớp (VD: Lập trình C++ Cơ bản)" value={newClassName} onChange={e => setNewClassName(e.target.value)} className="h-12"/>
                    <Button onClick={handleCreateClass} disabled={isActionLoading} className="w-full h-12">{isActionLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Tạo Lớp"}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* LƯỚI LỚP HỌC (GRID) */}
        {classes.length === 0 ? (
          <div className="text-center py-24 bg-card border rounded-2xl border-dashed">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-bold text-foreground">Bạn chưa tham gia lớp nào</h3>
            <p className="text-muted-foreground mt-2">Bấm nút ở góc trên để bắt đầu nhé!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <Card key={cls.id} className="overflow-hidden hover:shadow-xl transition-all hover:border-primary/50 group cursor-pointer flex flex-col bg-card" onClick={() => navigate(`/classrooms/${cls.id}`)}>
                <div className="h-2 bg-gradient-to-r from-primary to-blue-500 w-full" />
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors">{cls.className}</h3>
                  <div className="mt-auto space-y-3">
                    <div className="flex justify-between items-center text-sm text-muted-foreground bg-muted/40 p-3 rounded-xl border">
                      {userRole === "Student" ? (
                        <span className="font-medium truncate flex items-center"><GraduationCap className="h-4 w-4 mr-2 text-primary"/> GV: {cls.lecturerName}</span>
                      ) : (
                        <>
                          <Badge variant="secondary" className="font-mono bg-background">Mã: {cls.joinCode}</Badge>
                          <span className="flex items-center font-medium"><Users className="h-4 w-4 mr-1.5 text-primary"/> {cls.studentCount} SV</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 border-t bg-muted/10 flex justify-between items-center group-hover:bg-primary/5 transition-colors">
                  <span className="text-sm font-semibold text-primary">{userRole === "Student" ? "Vào lớp học" : "Quản lý lớp"}</span>
                  <ArrowRight className="h-4 w-4 text-primary opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Classrooms;