import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { 
  Code2, BookOpen, Clock, Trophy, 
  LogOut, User, ChevronDown 
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
  const [showProfileMenu, setShowProfileMenu] = useState(false); // Trạng thái đóng/mở menu profile
  
  const navigate = useNavigate();
  const { user, signOut } = useAuth(); // Lấy thông tin user và hàm đăng xuất từ hook xác thực

  useEffect(() => {
    // Gọi API lấy danh sách bài tập
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

  const getDifficultyColor = (diff: string) => {
    switch (diff?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Hàm xử lý Đăng xuất
  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  // Hàm lấy tên viết tắt cho Avatar (Ví dụ: tuandao@gmail.com -> TU)
  const getInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "SV";
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* HEADER ĐÃ ĐỒNG BỘ VỚI TRANG CHỦ */}
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
                <Trophy className="h-3.5 w-3.5" /> 120 XP
            </div>
          
            {/* Vùng Avatar & Dropdown Menu (Thay thế nút DMC cũ) */}
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

              {/* Menu thả xuống */}
              {showProfileMenu && (
                <>
                  {/* Lớp phủ để bấm ra ngoài thì đóng menu */}
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
          <p className="text-slate-500 text-lg">Hôm nay bạn muốn rèn luyện kỹ năng nào?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-64 bg-white rounded-3xl border border-slate-200 animate-pulse" />
            ))
          ) : exercises.length > 0 ? (
            exercises.map((ex) => (
              <div key={ex.id} className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getDifficultyColor(ex.difficulty)}`}>
                    {ex.difficulty || 'CƠ BẢN'}
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                    <Clock className="h-3.5 w-3.5" /> 15 phút
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {ex.title}
                </h3>
                
                <p className="text-slate-500 text-sm mb-8 flex-1 line-clamp-3 leading-relaxed">
                  {ex.description}
                </p>
                
                <Button 
                  onClick={() => navigate(`/workspace?id=${ex.id}`)} 
                  className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold rounded-2xl h-12 transition-all shadow-lg shadow-slate-200 hover:shadow-indigo-200"
                >
                  <BookOpen className="mr-2 h-4 w-4" /> Bắt đầu giải bài
                </Button>
              </div>
            ))
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