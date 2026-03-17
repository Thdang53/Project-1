import { useState, useEffect, createContext, useContext, ReactNode, useRef } from "react";
import { jwtDecode } from "jwt-decode";

// Khuôn mẫu dữ liệu của một người dùng
interface User {
  email: string;
  fullName: string;
  role: string;
}

// Khuôn mẫu của cái Thẻ JWT (những thông tin mình nhét vào nó bên C#)
interface JwtPayload {
  sub: string;
  email: string;
  FullName: string;
  Role?: string;
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"?: string; // 💡 ĐÃ SỬA: Thêm Role chuẩn của .NET
  exp: number;
}

// Cung cấp các chức năng liên quan đến xác thực
interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null, user?: User }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signInWithGoogle: (credential: string) => Promise<{ error: string | null, user?: User }>; // 💡 THÊM DÒNG NÀY CHO GOOGLE LOGIN
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }), // 💡 KHỞI TẠO MẶC ĐỊNH
  signOut: () => {},
});

// Dùng biến môi trường an toàn
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:5043";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Biến lưu trữ bộ đếm giờ để tự động đăng xuất
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Hàm thiết lập hẹn giờ tự động đăng xuất khi Token hết hạn
  const setupAutoLogout = (exp: number) => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }

    const currentTime = Date.now() / 1000;
    const timeLeft = (exp - currentTime) * 1000;

    if (timeLeft > 0) {
      logoutTimerRef.current = setTimeout(() => {
        alert("Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.");
        signOut();
      }, timeLeft);
    } else {
      signOut();
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("jwt_token");

    if (savedToken) {
      try {
        const decodedToken = jwtDecode<JwtPayload>(savedToken);
        const currentTime = Date.now() / 1000;

        if (decodedToken.exp < currentTime) {
          console.log("Token đã hết hạn.");
          signOut();
        } else {
          setToken(savedToken);
          
          // 💡 ĐÃ SỬA: Đọc Role từ tên chuẩn của .NET JWT để không bị mất quyền khi Reload
          const userRole = decodedToken["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || decodedToken.Role || "Student";
          
          setUser({
            email: decodedToken.email,
            fullName: decodedToken.FullName,
            role: userRole,
          });
          setupAutoLogout(decodedToken.exp);
        }
      } catch (error) {
        console.error("Token không hợp lệ:", error);
        signOut();
      }
    }
    
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const errorText = await response.text();
        console.error("Lỗi Server thô:", errorText);
        throw new Error("Lỗi Backend: Vui lòng xem màn hình Terminal đang chạy C# để biết lý do.");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Đăng nhập thất bại");
      }

      localStorage.setItem("jwt_token", data.token);
      setToken(data.token);
      
      const userData = {
        email: data.user.email,
        fullName: data.user.fullName,
        role: data.user.role
      };
      
      setUser(userData);

      const decodedToken = jwtDecode<JwtPayload>(data.token);
      setupAutoLogout(decodedToken.exp);

      return { error: null, user: userData };
      
    } catch (error: unknown) {
      if (error instanceof Error) {
        return { error: error.message };
      }
      return { error: "Lỗi mạng hoặc lỗi không xác định" };
    }
  };

  // 💡 HÀM XỬ LÝ ĐĂNG NHẬP BẰNG GOOGLE
  const signInWithGoogle = async (credential: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Auth/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Đăng nhập Google thất bại");

      localStorage.setItem("jwt_token", data.token);
      setToken(data.token);
      
      const userData = { 
        email: data.user.email, 
        fullName: data.user.fullName, 
        role: data.user.role 
      };
      setUser(userData);

      const decodedToken = jwtDecode<JwtPayload>(data.token);
      setupAutoLogout(decodedToken.exp);

      return { error: null, user: userData };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const errorText = await response.text();
        console.error("Lỗi Server thô:", errorText);
        throw new Error("Lỗi Backend: Vui lòng xem màn hình Terminal đang chạy C# để biết lý do.");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Đăng ký thất bại");
      }

      return { error: null };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return { error: error.message };
      }
      return { error: "Lỗi mạng hoặc lỗi không xác định" };
    }
  };

  const signOut = () => {
    localStorage.removeItem("jwt_token");
    setToken(null);
    setUser(null);
    
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }
  };

  return (
    // 💡 ĐỪNG QUÊN TRUYỀN signInWithGoogle VÀO PROVIDER
    <AuthContext.Provider value={{ user, token, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);