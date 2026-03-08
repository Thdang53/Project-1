import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  User, Mail, MapPin, Github, Camera, Save, 
  ArrowLeft, Upload, MessageSquare, Info
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";

// Cấu trúc dữ liệu khớp với SQL Server
interface UserProfile {
  fullName: string;
  nickname: string;
  email: string;
  avatarUrl: string; 
  location: string;
  githubUrl: string;
  bio: string;
  contactInfo: string;
}

const API_BASE_URL = "http://localhost:5043";

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile>({
    fullName: "",
    nickname: "",
    email: "",
    avatarUrl: "",
    location: "",
    githubUrl: "",
    bio: "",
    contactInfo: "",
  });

  // 1. Lấy dữ liệu hồ sơ từ SQL Server
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.email) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/UserProfile/${user.email}`);
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
        } else {
          setProfile(prev => ({
            ...prev,
            email: user.email || "",
            fullName: user.email?.split("@")[0] || "Học viên",
          }));
        }
      } catch (err) {
        console.error("Lỗi kết nối API:", err);
      } finally {
        setFetching(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // 2. Xử lý khi chọn ảnh từ máy tính
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ 
          title: "Lỗi tệp tin", 
          description: "Vui lòng chọn một file hình ảnh (jpg, png).", 
          variant: "destructive" 
        });
        return;
      }
      
      // Đọc file thành chuỗi Base64 để hiển thị và lưu vào DB
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, avatarUrl: reader.result as string }));
        toast({
          title: "Đã chọn ảnh",
          description: "Bản xem trước đã được cập nhật.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/UserProfile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!response.ok) throw new Error("Máy chủ phản hồi lỗi");
      toast({ title: "Thành công!", description: "Hồ sơ đã được lưu vào SQL Server." });
    } catch (err: any) {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = () => {
    return profile.fullName ? profile.fullName.substring(0, 2).toUpperCase() : "SV";
  };

  if (fetching) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
      <p className="text-slate-500">Đang tải hồ sơ từ SQL Server...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <Navbar />
      
      {/* Input file ẩn */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 pt-24">
        <Link to="/student-dashboard" className="inline-flex items-center text-sm text-slate-500 hover:text-primary mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại Dashboard
        </Link>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cột trái: Thẻ hồ sơ */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden sticky top-24 pb-8">
              <div className="h-24 bg-gradient-to-r from-indigo-500 to-violet-600" />
              <div className="relative -mt-12 flex justify-center mb-4">
                <div className="h-24 w-24 rounded-full border-4 border-white bg-slate-100 shadow-md overflow-hidden flex items-center justify-center">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-slate-300">{getInitials()}</span>
                  )}
                </div>
              </div>
              <div className="text-center px-6">
                <h2 className="text-xl font-bold text-slate-900 truncate">{profile.fullName}</h2>
                {profile.nickname && <p className="text-primary text-sm font-medium">@{profile.nickname}</p>}
                
                <div className="mt-6 space-y-3 text-left border-t pt-4">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Mail className="h-4 w-4" /> {profile.email}
                  </div>
                  {profile.location && (
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <MapPin className="h-4 w-4" /> {profile.location}
                    </div>
                  )}
                  {profile.githubUrl && (
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <Github className="h-4 w-4" /> 
                      <span className="truncate">{profile.githubUrl.replace(/https?:\/\/github\.com\//, '')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cột phải: Form chỉnh sửa */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-10">
              <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-2">
                <User className="text-primary" /> Thiết lập hồ sơ sinh viên
              </h3>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="h-20 w-20 rounded-2xl bg-white border flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-slate-200" />
                    )}
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h4 className="font-bold text-slate-800 text-sm mb-1">Ảnh đại diện</h4>
                    <p className="text-xs text-slate-400 mb-4">Hỗ trợ JPG, PNG. Tối đa 2MB.</p>
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-xl bg-white">
                      <Upload className="h-4 w-4 mr-2" /> Chọn ảnh từ máy tính
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Họ và tên *</label>
                    <input name="fullName" value={profile.fullName} onChange={handleChange} required className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Biệt danh</label>
                    <input name="nickname" value={profile.nickname} onChange={handleChange} className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Địa chỉ Email</label>
                    <input value={profile.email} readOnly className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Địa điểm</label>
                    <input name="location" value={profile.location} onChange={handleChange} className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">GitHub URL</label>
                    <input name="githubUrl" value={profile.githubUrl} onChange={handleChange} placeholder="https://github.com/..." className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Liên hệ (SĐT/Zalo)</label>
                    <input name="contactInfo" value={profile.contactInfo} onChange={handleChange} className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Giới thiệu bản thân</label>
                  <textarea name="bio" value={profile.bio} onChange={handleChange} rows={4} className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none" />
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={isSaving} className="h-12 px-10 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                    {isSaving ? "Đang lưu..." : "Lưu vào hệ thống"} <Save className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;