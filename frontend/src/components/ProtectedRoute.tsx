import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // 💡 THÊM MỚI: Mảng chứa các Role được phép truy cập
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Đang kiểm tra trạng thái đăng nhập
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // 1. Chưa đăng nhập -> Đá về trang Login và lưu lại URL cũ để đăng nhập xong quay lại
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Đã đăng nhập nhưng KHÔNG ĐÚNG ROLE -> Đá về đúng Dashboard của họ
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    if (user.role === "Student") return <Navigate to="/student-dashboard" replace />;
    if (user.role === "Lecturer") return <Navigate to="/lecturer-dashboard" replace />;
    if (user.role === "Admin") return <Navigate to="/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  // 3. Hợp lệ -> Cho phép truy cập vào trang
  return <>{children}</>;
};

export default ProtectedRoute;