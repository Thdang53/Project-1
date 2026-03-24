import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; 
import { Code2, LogIn, LogOut, User, Bell, CheckCircle2, MessageSquareText, BookOpen } from "lucide-react";
import { useAuth } from "../hooks/useAuth"; 
import { motion, AnimatePresence } from "framer-motion";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Notification {
  id: number;
  exerciseId: number;
  exerciseTitle: string;
  isRead: boolean;
  createdAt: string;
  lecturerName: string;
}

const Navbar = ({ variant = "default" }: { variant?: "transparent" | "default" }) => {
  const isTransparent = variant === "transparent";
  const navigate = useNavigate();
  const { user, token, signOut } = useAuth();
  
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const handleLogout = async () => {
    await signOut();
    setShowMenu(false);
    navigate("/");
  };

  const getInitials = () => {
    if (user?.email) return user.email.substring(0, 2).toUpperCase();
    return "SV";
  };

  useEffect(() => {
    if (user?.email && token) {
      const fetchNotifications = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/AIAssistant/my-notifications?email=${user.email}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) {
            setNotifications(data.data);
          }
        } catch (error) {
          console.error("Lỗi lấy thông báo:", error);
        }
      };

      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); 
      return () => clearInterval(interval);
    }
  }, [user, token]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = async (notif: Notification) => {
    setShowNotifications(false);
    
    // Đánh dấu đã đọc trên DB
    if (!notif.isRead) {
      try {
        await fetch(`${API_BASE_URL}/api/AIAssistant/mark-read/${notif.id}`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      } catch (e) {}
    }

    // 💡 CHUYỂN HƯỚNG SANG TRANG DASHBOARD, TAB "REPORTS" (GÓC THẮC MẮC)
    navigate(`/student-dashboard?tab=reports&reportId=${notif.id}`);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMin = Math.round((now.getTime() - date.getTime()) / 60000);
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)} giờ trước`;
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <nav className={`w-full z-40 transition-all duration-300 ${isTransparent ? 'absolute top-0 bg-transparent' : 'bg-background border-b border-border'}`}>
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary group-hover:opacity-90 transition-opacity">
            <Code2 className="h-5 w-5 text-white" />
          </div>
          <span className={`font-bold text-xl tracking-tight ${isTransparent ? 'text-primary-foreground' : 'text-foreground'}`}>
            AI Learning Hub
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className={`text-sm font-medium hover:text-primary transition-colors ${isTransparent ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>Trang chủ</Link>
          <Link to="/student-dashboard" className={`text-sm font-medium hover:text-primary transition-colors ${isTransparent ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>Không gian học tập</Link>
          {(user?.role === "Lecturer" || user?.role === "Admin") && (
            <Link to="/lecturer-dashboard" className={`text-sm font-medium hover:text-primary transition-colors ${isTransparent ? 'text-primary-foreground/80' : 'text-amber-500 font-semibold'}`}>Khu vực Giảng viên</Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              {/* CHUÔNG THÔNG BÁO */}
              <div className="relative">
                <button
                  onClick={() => { setShowNotifications(!showNotifications); setShowMenu(false); }}
                  className={`relative p-2 rounded-full transition-colors focus:outline-none ${isTransparent ? "text-white hover:bg-white/20" : "text-muted-foreground hover:bg-muted"}`}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden origin-top-right"
                    >
                      <div className="px-4 py-3 border-b border-gray-50 bg-gray-50 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-900">Thông báo</h3>
                        {unreadCount > 0 && <Badge variant="secondary" className="bg-red-50 text-red-600 border-red-100">{unreadCount} tin mới</Badge>}
                      </div>
                      
                      <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-sm text-gray-500 flex flex-col items-center gap-2">
                            <CheckCircle2 className="h-8 w-8 text-gray-300" /> Bạn chưa có thông báo nào!
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id} onClick={() => handleNotificationClick(notif)}
                              className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!notif.isRead ? 'bg-primary/5' : ''}`}
                            >
                              <div className="flex gap-3 items-start">
                                <div className={`mt-0.5 p-1.5 rounded-full ${!notif.isRead ? 'bg-primary/20 text-primary' : 'bg-gray-100 text-gray-500'}`}>
                                  <MessageSquareText className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                  <p className={`text-sm ${!notif.isRead ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                                    Giảng viên <span className="text-primary">{notif.lecturerName}</span> đã giải đáp thắc mắc của bạn!
                                  </p>
                                  <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                                    <BookOpen className="h-3 w-3" />
                                    <span className="truncate max-w-[120px]">{notif.exerciseTitle}</span>
                                    <span>•</span><span>{formatTime(notif.createdAt)}</span>
                                  </div>
                                </div>
                                {!notif.isRead && <div className="h-2 w-2 bg-primary rounded-full shrink-0 mt-2" />}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* MENU AVATAR */}
              <div className="relative">
                <button 
                  onClick={() => { setShowMenu(!showMenu); setShowNotifications(false); }}
                  className={`h-9 w-9 rounded-full border-2 shadow-sm flex items-center justify-center font-bold transition-colors ${isTransparent ? "bg-white/20 border-white/30 text-white" : "bg-primary/10 border-primary/20 text-primary"}`}
                >
                  {getInitials()}
                </button>
                <AnimatePresence>
                  {showMenu && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden origin-top-right">
                      <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                        <p className="text-sm font-medium text-gray-900">Xin chào!</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <div className="p-1">
                        <button onClick={handleLogout} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                          <LogOut className="h-4 w-4" /> Đăng xuất
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <Link to="/login"><Button variant={isTransparent ? "outline" : "default"}>Đăng nhập</Button></Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;