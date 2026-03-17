import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Code2, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
// 💡 IMPORT THƯ VIỆN GOOGLE VÀO ĐÂY
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  // 💡 LẤY THÊM HÀM signInWithGoogle
  const { user, signIn, signUp, signInWithGoogle } = useAuth();
  const { toast } = useToast();

  // Tự động chuyển hướng nếu đã đăng nhập thành công
  useEffect(() => {
    if (user) {
      // Ưu tiên chuyển về trang trước đó, nếu không thì phân quyền Admin/Student
      const from = (location.state as any)?.from?.pathname || (user.role === "Admin" ? "/dashboard" : "/student-dashboard");
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Kiểm tra dữ liệu đầu vào cơ bản
    if (!email || !password || (isRegister && !displayName)) {
      toast({ title: "Lỗi", description: "Vui lòng nhập đầy đủ thông tin.", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Lỗi", description: "Mật khẩu phải có ít nhất 6 ký tự.", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      if (isRegister) {
        // GỌI HÀM ĐĂNG KÝ CỦA C#
        const { error } = await signUp(email, password, displayName);
        
        if (error) {
          const errorMsg = error.toLowerCase();
          
          if (errorMsg.includes("already exists") || errorMsg.includes("đã tồn tại") || errorMsg.includes("conflict")) {
            throw new Error("Email này đã được đăng ký! Vui lòng dùng email khác hoặc đăng nhập.");
          } else {
            throw new Error(error || "Không thể tạo tài khoản. Vui lòng thử lại sau.");
          }
        } 
        
        toast({ title: "Đăng ký thành công!", description: "Tài khoản của bạn đã được tạo. Vui lòng đăng nhập." });
        // Chuyển về màn hình đăng nhập và xóa mật khẩu
        setIsRegister(false);
        setPassword("");
        
      } else {
        // GỌI HÀM ĐĂNG NHẬP CỦA C#
        const { error } = await signIn(email, password);
        
        if (error) {
          // Bắt lỗi đăng nhập sai
          throw new Error("Sai email hoặc mật khẩu. Vui lòng kiểm tra lại.");
        }
        
        toast({ title: "Đăng nhập thành công!", description: "Chào mừng bạn quay trở lại." });
      }
    } catch (error: any) {
      toast({ 
        title: isRegister ? "Đăng ký thất bại" : "Đăng nhập thất bại", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left: Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-10">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
              <Code2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">CodeAI</span>
          </Link>

          <h1 className="text-3xl font-bold text-foreground">
            {isRegister ? "Tạo tài khoản" : "Đăng nhập"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isRegister ? "Bắt đầu hành trình học lập trình cùng AI" : "Chào mừng trở lại! Tiếp tục học ngay."}
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {isRegister && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Họ tên</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="Nguyễn Văn A"
                    disabled={submitting}
                  />
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="email@example.com"
                  disabled={submitting}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-foreground block">Mật khẩu</label>
                {/* Tính năng Quên mật khẩu sẽ được bổ sung ở Phase sau */}
                {!isRegister && (
                  <button type="button" className="text-xs text-primary hover:underline" onClick={() => alert("Tính năng cấp lại mật khẩu qua Email đang được phát triển.")}>
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="••••••••"
                  disabled={submitting}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-11 text-base mt-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>{isRegister ? "Đăng ký" : "Đăng nhập"} <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </form>

          {/* 💡 NÚT ĐĂNG NHẬP GOOGLE NẰM Ở ĐÂY */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-background px-2 text-muted-foreground">Hoặc tiếp tục với</span>
              </div>
            </div>
            
            <div className="mt-6 flex justify-center">
              <GoogleOAuthProvider clientId="920755384852-deu0vgnrhbs4ql97hdgb5pk8966sa990.apps.googleusercontent.com">
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    if (credentialResponse.credential) {
                      setSubmitting(true);
                      const { error } = await signInWithGoogle(credentialResponse.credential);
                      setSubmitting(false);
                      if (error) {
                        toast({ title: "Lỗi", description: error, variant: "destructive" });
                      } else {
                        toast({ title: "Thành công!", description: "Đăng nhập bằng Google thành công." });
                      }
                    }
                  }}
                  onError={() => {
                    toast({ title: "Lỗi", description: "Đăng nhập Google bị hủy hoặc thất bại.", variant: "destructive" });
                  }}
                  useOneTap
                />
              </GoogleOAuthProvider>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
            <button 
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setDisplayName("");
                setPassword("");
              }} 
              className="font-medium text-primary hover:underline"
            >
              {isRegister ? "Đăng nhập" : "Đăng ký ngay"}
            </button>
          </p>
        </div>
      </div>

      {/* Right: Visual */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-hero p-12">
        <div className="max-w-md text-center">
          <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-2xl bg-gradient-primary mb-8 animate-float">
            <Code2 className="h-10 w-10 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Học lập trình<br />thông minh hơn
          </h2>
          <p className="text-primary-foreground/60 leading-relaxed">
            AI phân tích code, gợi ý sửa lỗi và trả lời mọi câu hỏi — giúp bạn tiến bộ mỗi ngày.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;