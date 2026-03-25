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
            {/* ========================================== */}
            {/* CÁC TUYẾN ĐƯỜNG CÔNG CỘNG (AI CŨNG VÀO ĐƯỢC) */}
            {/* ========================================== */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/courses" element={<Courses />} />

            {/* ========================================== */}
            {/* KHU VỰC HỌC TẬP (DÀNH CHO STUDENT, LECTURER, ADMIN CŨNG CÓ THỂ XEM) */}
            {/* ========================================== */}
            <Route 
              path="/ai-lesson/:lessonId" 
              element={
                <ProtectedRoute allowedRoles={["Student", "Lecturer", "Admin"]}>
                  <AILesson />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/ai-lesson" 
              element={
                <ProtectedRoute allowedRoles={["Student", "Lecturer", "Admin"]}>
                  <AILesson />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/workspace" 
              element={
                <ProtectedRoute allowedRoles={["Student", "Lecturer", "Admin"]}>
                  <Workspace />
                </ProtectedRoute>
              } 
            /> 
            <Route 
              path="/workspace/:lessonId" 
              element={
                <ProtectedRoute allowedRoles={["Student", "Lecturer", "Admin"]}>
                  <Workspace />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student-dashboard" 
              element={
                <ProtectedRoute allowedRoles={["Student", "Lecturer", "Admin"]}>
                  <StudentDashboard />
                </ProtectedRoute>
              } 
            />

            {/* ========================================== */}
            {/* KHU VỰC QUẢN LÝ (CHỈ DÀNH CHO LECTURER VÀ ADMIN) */}
            {/* ========================================== */}
            
            {/* Trang Quản lý Khóa học */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute allowedRoles={["Lecturer", "Admin"]}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />

            {/* Trang Không gian làm việc của Giảng viên */}
            <Route 
              path="/lecturer-dashboard" 
              element={
                <ProtectedRoute allowedRoles={["Lecturer", "Admin"]}>
                  <LecturerDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Trang Cửa hàng Đổi thưởng */}
            <Route 
              path="/rewards" 
              element={
                <ProtectedRoute allowedRoles={["Lecturer", "Admin"]}>
                  <RewardStore />
                </ProtectedRoute>
              } 
            />

            {/* ========================================== */}
            {/* CÁC TUYẾN ĐƯỜNG CHUNG (CẦN ĐĂNG NHẬP, KHÔNG PHÂN BIỆT ROLE) */}
            {/* ========================================== */}
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