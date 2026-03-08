import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";

// Import các trang
import Index from "./pages/Index";
import Workspace from "./pages/Workspace";
import Courses from "./pages/Courses";
import Dashboard from "./pages/Dashboard";
import StudentDashboard from "./pages/StudentDashboard";
import Login from "./pages/Login";
import Profile from "./pages/Profile"; // Import trang Profile mới tạo
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Trang chủ công cộng */}
            <Route path="/" element={<Index />} />
            
            {/* Trang đăng nhập công cộng */}
            <Route path="/login" element={<Login />} />
            
            {/* Trang danh sách khóa học công cộng */}
            <Route path="/courses" element={<Courses />} />

            {/* CÁC TUYẾN ĐƯỜNG ĐƯỢC BẢO VỆ (CẦN ĐĂNG NHẬP) */}
            
            {/* Trang gõ code và làm bài tập */}
            <Route path="/workspace" element={<ProtectedRoute><Workspace /></ProtectedRoute>} /> 
            
            {/* Trang quản lý cho Admin/Giảng viên */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            
            {/* Trang danh sách bài tập của sinh viên */}
            <Route path="/student-dashboard" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
            
            {/* Trang Hồ sơ cá nhân của sinh viên */}
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            
            {/* Trang báo lỗi 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;