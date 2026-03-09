import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Code2, LogIn, LogOut, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth"; // Sửa đường dẫn import sang dạng tương đối để tránh lỗi biên dịch

interface NavbarProps {
  variant?: "transparent" | "default";
}

const Navbar = ({ variant = "default" }: NavbarProps) => {
  const isTransparent = variant === "transparent";
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    await signOut();
    setShowMenu(false);
    navigate("/");
  };

  const getInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "SV";
  };

  return (
    <nav className={`w-full z-50 transition-all duration-300 ${isTransparent ? 'absolute top-0 bg-transparent' : 'bg-background border-b border-border'}`}>
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary group-hover:opacity-90 transition-opacity">
            <Code2 className="h-5 w-5 text-white" />
          </div>
          <span className={`font-bold text-xl tracking-tight ${isTransparent ? 'text-primary-foreground' : 'text-foreground'}`}>
            AI Learning Hub
          </span>
        </Link>

        {/* Các Menu chính */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className={`text-sm font-medium hover:text-primary transition-colors ${isTransparent ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
            Trang chủ
          </Link>
          <Link to="/student-dashboard" className={`text-sm font-medium hover:text-primary transition-colors ${isTransparent ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
            Không gian học tập
          </Link>
          
          {/* CHỈ HIỂN THỊ NÚT ADMIN NẾU TÀI KHOẢN LÀ ADMIN */}
          {user?.role === "Admin" && (
            <Link to="/dashboard" className={`text-sm font-medium hover:text-primary transition-colors ${isTransparent ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
              Quản lý (Admin)
            </Link>
          )}
        </div>

        {/* Khu vực Nút Đăng nhập hoặc Avatar Profile */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className={`h-9 w-9 rounded-full border-2 shadow-sm flex items-center justify-center font-bold transition-colors focus:outline-none ${
                  isTransparent 
                    ? "bg-white/20 border-white/30 text-white hover:bg-white/30" 
                    : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                }`}
              >
                {getInitials()}
              </button>

              {/* Menu thả xuống khi nhấn vào Avatar */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                    <p className="text-sm font-medium text-gray-900 truncate">Xin chào!</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5" title={user.email}>
                      {user.email}
                    </p>
                  </div>
                  <div className="p-1">
                    {/* Link dẫn tới trang Profile cá nhân */}
                    <Link 
                      to="/profile" 
                      onClick={() => setShowMenu(false)}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <User className="h-4 w-4" /> Hồ sơ của tôi
                    </Link>

                    <button 
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="h-4 w-4" /> Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login">
              <Button variant={isTransparent ? "outline" : "default"} className={isTransparent ? "text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/10" : ""}>
                <LogIn className="mr-2 h-4 w-4" /> Đăng nhập
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;