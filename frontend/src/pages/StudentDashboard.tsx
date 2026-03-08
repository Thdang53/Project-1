import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { 
  Code2, BookOpen, Clock, Trophy, 
  LogOut, User, ChevronDown, CheckCircle2 
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface Exercise {
  id: number;
  lessonId: number;
  title: string;
  description: string;
  difficulty: string;
}

const StudentDashboard = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // STATE MỚI: Lưu danh sách ID các bài tập đã làm đúng (Accepted)
  const [completedExercises, setCompletedExercises] = useState<number[]>([]);
  
  const navigate = useNavigate();
  const { user, signOut } = useAuth(); 

  useEffect(() => {
    // 1. Gọi API lấy danh sách bài tập
    fetch("http://localhost:5043/api/Exercises")
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

  // 2. EFFECT MỚI: Gọi API lấy lịch sử nộp bài của sinh viên
  useEffect(() => {
    if (user?.email) {
      fetch(`http://localhost:5043/api/CodeExecution/submissions/${user.email}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            // Lọc ra những bài nộp có trạng thái "Accepted" và lấy ID bài tập
            const completedIds = data
              .filter((sub: any) => sub.status === "Accepted")
              .map((sub: any) => sub.exerciseId);
            
            // Xóa các ID trùng lặp (nếu nộp đúng 1 bài nhiều lần)
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
      case 'easy': return 'bg-green-100 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const getInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "SV";
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-700 group-hover:opacity-90 transition-opacity shadow-sm">
              <Code2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">AI Learning Hub</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100 font-bold text-xs uppercase tracking-wider">
                <Trophy className="h-3.5 w-3.5" /> 
                {/* Có thể thay điểm XP bằng số bài tập đã làm xong */}
                {completedExercises.length * 10} XP
            </div>
          
            <div className="relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-slate-100 transition-colors focus:outline-none border border-transparent hover:border-slate-200"
              >
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-xs shadow-sm border border-indigo-200">
                  {getInitials()}
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)}></div>
                  
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                    <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Sinh viên</p>
                      <p className="text-sm font-bold text-slate-900 truncate" title={user?.email}>
                        {user?.email || "Chưa đăng nhập"}
                      </p>
                    </div>
                    <div className="p-2">
                      <Link 
                        to="/profile" 
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all group"
                      >
                        <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-indigo-50 transition-colors text-slate-500 group-hover:text-indigo-600">
                          <User className="h-4 w-4" />
                        </div>
                        Hồ sơ của tôi
                      </Link>
                      
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-all group"
                      >
                        <div className="p-2 rounded-lg bg-red-50 transition-colors">
                          <LogOut className="h-4 w-4" />
                        </div>
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Chào mừng trở lại! 👋</h1>
          <p className="text-slate-500 text-lg">
            Bạn đã hoàn thành <span className="font-bold text-indigo-600">{completedExercises.length}/{exercises.length}</span> bài tập.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-64 bg-white rounded-3xl border border-slate-200 animate-pulse" />
            ))
          ) : exercises.length > 0 ? (
            exercises.map((ex) => {
              // Kiểm tra xem bài tập này đã nằm trong danh sách "Accepted" chưa
              const isCompleted = completedExercises.includes(ex.id);

              return (
                <div key={ex.id} className={`group p-6 rounded-3xl border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col h-full ${
                  isCompleted ? 'bg-green-50/30 border-green-200' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getDifficultyColor(ex.difficulty)}`}>
                      {ex.difficulty || 'CƠ BẢN'}
                    </div>
                    {/* Nếu làm xong thì hiện tích xanh, chưa xong thì hiện thời gian */}
                    {isCompleted ? (
                      <div className="flex items-center gap-1 text-green-600 text-xs font-bold">
                        <CheckCircle2 className="h-4 w-4" /> Hoàn thành
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                        <Clock className="h-3.5 w-3.5" /> 15 phút
                      </div>
                    )}
                  </div>
                  
                  <h3 className={`text-xl font-bold mb-3 transition-colors line-clamp-1 ${
                    isCompleted ? 'text-green-800' : 'text-slate-900 group-hover:text-indigo-600'
                  }`}>
                    {ex.title}
                  </h3>
                  
                  <p className={`text-sm mb-8 flex-1 line-clamp-3 leading-relaxed ${
                    isCompleted ? 'text-green-700/70' : 'text-slate-500'
                  }`}>
                    {ex.description}
                  </p>
                  
                  {/* Đổi màu nút dựa trên trạng thái hoàn thành */}
                  <Button 
                    onClick={() => navigate(`/workspace?id=${ex.id}`)} 
                    className={`w-full font-bold rounded-2xl h-12 transition-all ${
                      isCompleted 
                        ? 'bg-green-100 hover:bg-green-200 text-green-700 shadow-none' 
                        : 'bg-slate-900 hover:bg-indigo-600 text-white shadow-lg shadow-slate-200 hover:shadow-indigo-200'
                    }`}
                  >
                    {isCompleted ? (
                      <><CheckCircle2 className="mr-2 h-4 w-4" /> Xem lại mã nguồn</>
                    ) : (
                      <><BookOpen className="mr-2 h-4 w-4" /> Bắt đầu giải bài</>
                    )}
                  </Button>
                </div>
              );
            })
          ) : (
             <div className="col-span-full bg-white rounded-3xl border-2 border-dashed border-slate-200 py-20 text-center">
                 <p className="text-slate-400 font-medium italic">Dữ liệu bài tập đang được cập nhật...</p>
             </div>
          )}
        </div>
      </main>

      <footer className="py-8 px-6 text-center border-t border-slate-100 bg-white/50 mt-auto">
          <p className="text-xs text-slate-400">Học tập hiệu quả hơn cùng AI Learning Hub &copy; 2026</p>
      </footer>
    </div>
  );
};

export default StudentDashboard;