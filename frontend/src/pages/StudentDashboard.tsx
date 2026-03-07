import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Code2, BookOpen, Star, Clock, Trophy } from "lucide-react";

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
  
  // Khởi tạo công cụ chuyển trang
  const navigate = useNavigate();

  useEffect(() => {
    // Xin danh sách bài từ Database. LƯU Ý CỔNG 5043 NHÉ
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Code2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight hover:text-primary transition-colors">AI Learning Hub</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full font-medium text-sm">
                <Trophy className="h-4 w-4" /> 120 điểm
            </div>
          <div className="h-9 w-9 rounded-full bg-gray-200 border-2 border-white shadow-sm flex items-center justify-center font-bold text-gray-600">
            DMC
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Xin chào, Kỹ sư tương lai! 👋</h1>
          <p className="text-gray-500 text-lg">Hôm nay bạn muốn thử sức với bài toán nào?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="animate-pulse">Đang tải danh sách bài tập...</div>
          ) : exercises.length > 0 ? (
            exercises.map((ex) => (
              <div key={ex.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getDifficultyColor(ex.difficulty)}`}>
                    {ex.difficulty ? ex.difficulty.toUpperCase() : 'CƠ BẢN'}
                  </div>
                  <div className="flex items-center gap-1 text-gray-400 text-sm">
                    <Clock className="h-4 w-4" /> 15p
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1" title={ex.title}>
                  {ex.title}
                </h3>
                
                <p className="text-gray-500 text-sm mb-6 flex-1 line-clamp-3">
                  {ex.description}
                </p>
                
                {/* NÚT CHUYỂN TRANG MANG THEO ID */}
                <Button 
                  onClick={() => navigate(`/workspace?id=${ex.id}`)} 
                  className="w-full bg-primary hover:bg-primary/90 text-white font-medium rounded-xl h-11"
                >
                  <BookOpen className="mr-2 h-4 w-4" /> Bắt đầu làm bài
                </Button>
              </div>
            ))
          ) : (
             <div className="col-span-full text-center py-12">
                 <p className="text-gray-500">Chưa có bài tập nào được tạo trong DB.</p>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;