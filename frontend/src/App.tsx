import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";

// Import các trang
import LecturerDashboard from "./pages/LecturerDashboard";
import RewardStore from "./pages/RewardStore"; // 💡 THÊM IMPORT TRANG ĐỔI THƯỞNG
import Index from "./pages/Index";
import Workspace from "./pages/Workspace";
import Courses from "./pages/Courses";
import Dashboard from "./pages/Dashboard";
import StudentDashboard from "./pages/StudentDashboard";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import AILesson from "./pages/AILesson";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* CÁC TUYẾN ĐƯỜNG CÔNG CỘNG */}
            {/* Trang chủ công cộng */}
            <Route path="/" element={<Index />} />
            
            {/* Trang đăng nhập công cộng */}
            <Route path="/login" element={<Login />} />
            
            {/* Trang danh sách khóa học công cộng */}
            <Route path="/courses" element={<Courses />} />

            {/* CÁC TUYẾN ĐƯỜNG ĐƯỢC BẢO VỆ (CẦN ĐĂNG NHẬP) */}
            
            {/* Trang bài học AI chuẩn bị trước khi code */}
            <Route 
              path="/ai-lesson/:lessonId" 
              element={
                <ProtectedRoute>
                  <AILesson />
                </ProtectedRoute>
              } 
            />
            {/* Route dự phòng nếu gọi /ai-lesson không có ID */}
            <Route 
              path="/ai-lesson" 
              element={
                <ProtectedRoute>
                  <AILesson />
                </ProtectedRoute>
              } 
            />

            {/* Trang gõ code và làm bài tập */}
            <Route 
              path="/workspace" 
              element={
                <ProtectedRoute>
                  <Workspace />
                </ProtectedRoute>
              } 
            /> 
            <Route 
              path="/workspace/:lessonId" 
              element={
                <ProtectedRoute>
                  <Workspace />
                </ProtectedRoute>
              } 
            />
            
            {/* Trang quản lý cho Admin */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />

            {/* Trang Không gian làm việc của Giảng viên */}
            <Route 
              path="/lecturer-dashboard" 
              element={
                <ProtectedRoute>
                  <LecturerDashboard />
                </ProtectedRoute>
              } 
            />

            {/* 💡 THÊM MỚI: Trang Cửa hàng Đổi thưởng (Dành cho Giảng viên) */}
            <Route 
              path="/rewards" 
              element={
                <ProtectedRoute>
                  <RewardStore />
                </ProtectedRoute>
              } 
            />
            
            {/* Trang danh sách bài tập của sinh viên */}
            <Route 
              path="/student-dashboard" 
              element={
                <ProtectedRoute>
                  <StudentDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Trang Hồ sơ cá nhân của sinh viên */}
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            
            {/* Trang báo lỗi 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;