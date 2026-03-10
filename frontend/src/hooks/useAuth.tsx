import { useState, useEffect, createContext, useContext, ReactNode } from "react";
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
  Role: string;
  exp: number;
}

// Cung cấp các chức năng liên quan đến xác thực
interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any, user?: User }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: () => {},
});

// Dùng biến môi trường an toàn
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:5043";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
          setUser({
            email: decodedToken.email,
            fullName: decodedToken.FullName,
            role: decodedToken.Role,
          });
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

      // BẢO VỆ: Nếu C# trả về lỗi HTML/Text thay vì JSON, chặn ngay lại
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

      // Trả về userData để màn hình Login biết phân quyền và chuyển hướng
      return { error: null, user: userData };
    } catch (error: any) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName }),
      });

      // BẢO VỆ: Nếu C# sập và trả về HTML/Text, lấy text báo lỗi
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
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = () => {
    localStorage.removeItem("jwt_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signUp, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);