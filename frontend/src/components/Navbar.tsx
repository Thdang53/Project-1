import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Code2, LogIn } from "lucide-react";

interface NavbarProps {
  variant?: "transparent" | "default";
}

const Navbar = ({ variant = "default" }: NavbarProps) => {
  const isTransparent = variant === "transparent";

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

        {/* Các Menu chính - Đã sửa lại đường dẫn */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className={`text-sm font-medium hover:text-primary transition-colors ${isTransparent ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
            Trang chủ
          </Link>
          
          {/* Sinh viên click vào đây sẽ ra danh sách bài tập, không bị nhảy vào màn hình code trống */}
          <Link to="/student-dashboard" className={`text-sm font-medium hover:text-primary transition-colors ${isTransparent ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
            Không gian học tập
          </Link>

          {/* Dành cho giáo viên */}
          <Link to="/dashboard" className={`text-sm font-medium hover:text-primary transition-colors ${isTransparent ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
            Quản lý (Admin)
          </Link>
        </div>

        {/* Nút Đăng nhập góc phải */}
        <div className="flex items-center gap-4">
          <Link to="/login">
            <Button variant={isTransparent ? "outline" : "default"} className={isTransparent ? "text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/10" : ""}>
              <LogIn className="mr-2 h-4 w-4" /> Đăng nhập
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;