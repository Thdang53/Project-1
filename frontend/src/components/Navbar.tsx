import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Code2, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  variant?: "default" | "transparent";
}

const Navbar = ({ variant = "default" }: NavbarProps) => {
  const { user, signOut } = useAuth();
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    if (!user) { setIsStaff(false); return; }
    const check = async () => {
      const { data: admin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" as const });
      const { data: teacher } = await supabase.rpc("has_role", { _user_id: user.id, _role: "teacher" as const });
      setIsStaff(!!admin || !!teacher);
    };
    check();
  }, [user]);

  const dashboardLink = isStaff ? "/dashboard" : "/student-dashboard";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 border-b border-border/50 ${
      variant === "transparent" ? "bg-background/80 backdrop-blur-xl" : "bg-background"
    }`}>
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
            <Code2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">CodeAI</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link to="/courses" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Khóa học</Link>
          <Link to="/workspace" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Workspace</Link>
          <Link to={dashboardLink} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
          <a href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Tính năng</a>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="hidden sm:inline text-sm">{user.email?.split("@")[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-muted-foreground text-xs cursor-default">
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Đăng nhập</Button>
              </Link>
              <Link to="/login">
                <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                  Bắt đầu học
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
