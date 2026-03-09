import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, MapPin, Github, Phone, Camera, Save, Loader2, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";

// 1. Cấu trúc dữ liệu khớp với Backend C#
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
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. State lưu trữ dữ liệu thật từ DB thay vì dữ liệu ảo
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

  // 3. Gọi API lấy dữ liệu khi vừa vào trang
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.email) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/UserProfile/${user.email}`);
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
        } else {
          // Nếu chưa có profile trong DB, dùng tạm email và tên từ Token
          setProfile(prev => ({
            ...prev,
            email: user.email || "",
            fullName: user.fullName || user.email?.split("@")[0] || "Học viên",
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

  // Hàm cập nhật các field văn bản
  const update = (key: keyof UserProfile, value: string) =>
    setProfile((prev) => ({ ...prev, [key]: value }));

  // 4. Hàm xử lý upload ảnh (Chuyển sang Base64)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ 
          title: "Lỗi định dạng", 
          description: "Vui lòng chọn file hình ảnh (JPG, PNG).", 
          variant: "destructive" 
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, avatarUrl: reader.result as string }));
        toast({
          title: "Đã tải ảnh lên",
          description: "Bản xem trước đã được cập nhật.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // 5. Hàm lưu dữ liệu xuống SQL Server
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/UserProfile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!response.ok) throw new Error("Máy chủ C# phản hồi lỗi");
      
      toast({ title: "Đã lưu thành công!", description: "Thông tin cá nhân đã được cập nhật vào cơ sở dữ liệu." });
    } catch (err: any) {
      toast({ title: "Lỗi lưu dữ liệu", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const initials = profile.fullName
    ? profile.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "SV";

  // Màn hình chờ khi đang load dữ liệu
  if (fetching) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Đang tải dữ liệu hồ sơ...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Input ẩn dùng để chọn file ảnh */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      <div className="flex-1 pt-6">
        <div className="container mx-auto px-4 sm:px-6 mb-4">
          <Link to="/student-dashboard">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Quay lại Dashboard
            </Button>
          </Link>
        </div>

        <div className="container mx-auto px-4 sm:px-6 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-6xl mx-auto"
          >
            {/* ─── Left Column: Identity Card ─── */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden rounded-2xl border-border shadow-card hover:shadow-elevated transition-shadow duration-300 sticky top-24">
                {/* Banner */}
                <div className="relative h-36 bg-gradient-primary">
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-4 right-6 h-24 w-24 rounded-full bg-primary-foreground/10 blur-2xl" />
                    <div className="absolute bottom-2 left-8 h-16 w-16 rounded-full bg-primary-foreground/10 blur-xl" />
                  </div>
                </div>

                {/* Avatar overlapping banner */}
                <div className="relative px-6">
                  <div className="-mt-14 mb-4">
                    <Avatar className="h-28 w-28 ring-4 ring-card shadow-elevated bg-card">
                      <AvatarImage src={profile.avatarUrl} alt={profile.fullName} className="object-cover" />
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground text-3xl font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="pb-6">
                    <h2 className="text-2xl font-bold text-foreground line-clamp-1" title={profile.fullName}>{profile.fullName}</h2>
                    <p className="text-muted-foreground text-sm font-mono">@{profile.nickname || "chuacobietdanh"}</p>

                    <Separator className="my-5" />

                    <div className="space-y-3.5">
                      <InfoRow icon={<Mail className="h-4 w-4" />} text={profile.email} />
                      <InfoRow icon={<MapPin className="h-4 w-4" />} text={profile.location || "Chưa cập nhật vị trí"} />
                      <InfoRow
                        icon={<Github className="h-4 w-4" />}
                        text={profile.githubUrl ? profile.githubUrl.replace(/https?:\/\/github\.com\//, '') : "Chưa liên kết Github"}
                        href={profile.githubUrl}
                      />
                      <InfoRow icon={<Phone className="h-4 w-4" />} text={profile.contactInfo || "Chưa cập nhật SĐT"} />
                    </div>

                    {profile.bio && (
                      <>
                        <Separator className="my-5" />
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* ─── Right Column: Edit Form ─── */}
            <div className="lg:col-span-3">
              <Card className="rounded-2xl border-border shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Cài đặt hồ sơ
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-4 space-y-6">
                  {/* Avatar Upload */}
                  <div className="flex items-center gap-5 p-4 rounded-xl bg-muted/50 border border-border">
                    <Avatar className="h-16 w-16 shrink-0 bg-card">
                      <AvatarImage src={profile.avatarUrl} alt={profile.fullName} className="object-cover" />
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground text-lg font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Ảnh đại diện</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Hỗ trợ định dạng JPG, PNG. Tối đa 2MB.</p>
                    </div>
                    {/* Bấm nút này sẽ kích hoạt cái <input type="file"> đang ẩn */}
                    <Button variant="outline" size="sm" className="gap-1.5 shrink-0 bg-background" onClick={() => fileInputRef.current?.click()}>
                      <Camera className="h-3.5 w-3.5" />
                      Đổi ảnh
                    </Button>
                  </div>

                  {/* Form Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormField
                      label="Họ và tên"
                      required
                      value={profile.fullName}
                      onChange={(v) => update("fullName", v)}
                      placeholder="Nhập họ và tên"
                    />
                    <FormField
                      label="Nickname"
                      value={profile.nickname}
                      onChange={(v) => update("nickname", v)}
                      placeholder="username"
                      prefix="@"
                    />
                    <FormField
                      label="Email"
                      value={profile.email}
                      onChange={() => {}}
                      disabled
                      placeholder="email@example.com"
                    />
                    <FormField
                      label="Vị trí"
                      value={profile.location}
                      onChange={(v) => update("location", v)}
                      placeholder="Thành phố, Quốc gia"
                    />
                    <FormField
                      label="GitHub URL"
                      value={profile.githubUrl}
                      onChange={(v) => update("githubUrl", v)}
                      placeholder="https://github.com/username"
                    />
                    <FormField
                      label="Số điện thoại"
                      value={profile.contactInfo}
                      onChange={(v) => update("contactInfo", v)}
                      placeholder="+84 xxx xxx xxx"
                    />
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Giới thiệu bản thân</Label>
                    <Textarea
                      value={profile.bio}
                      onChange={(e) => update("bio", e.target.value)}
                      placeholder="Viết vài dòng về bản thân, kinh nghiệm lập trình hoặc mục tiêu của bạn..."
                      className="min-h-[120px] resize-none bg-background focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground text-right">{profile.bio.length}/500</p>
                  </div>

                  <Separator />

                  {/* Save */}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2 px-8 h-11"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang lưu vào hệ thống...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Lưu thay đổi
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

/* ─── Sub-components ─── */

const InfoRow = ({ icon, text, href }: { icon: React.ReactNode; text: string; href?: string }) => (
  <div className="flex items-center gap-3 text-sm">
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
      {icon}
    </div>
    {href ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-foreground hover:text-primary truncate transition-colors font-medium"
      >
        {text}
      </a>
    ) : (
      <span className="text-foreground truncate">{text}</span>
    )}
  </div>
);

const FormField = ({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  required,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  prefix?: string;
}) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium text-foreground">
      {label}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </Label>
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">{prefix}</span>
      )}
      <Input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`bg-background focus-visible:ring-primary ${disabled ? "opacity-60 cursor-not-allowed bg-muted/50" : ""} ${prefix ? "pl-8" : ""}`}
      />
    </div>
  </div>
);

export default Profile;