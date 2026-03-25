import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Star, Trophy, ShoppingBag, Gift, Ticket, Award,
  Smartphone, Shirt, Coffee, Sparkles, Crown, BookOpen, Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Danh mục quà tặng cố định của hệ thống
const rewards = [
  { id: "1", title: "Voucher Shopee 50K", cost: 500, category: "voucher", icon: Ticket, gradient: "from-orange-400 to-rose-400" },
  { id: "2", title: "Voucher Grab 100K", cost: 900, category: "voucher", icon: Smartphone, gradient: "from-emerald-400 to-teal-500" },
  { id: "3", title: "Voucher Tiki 200K", cost: 1800, category: "voucher", icon: ShoppingBag, gradient: "from-sky-400 to-blue-500" },
  { id: "4", title: "Áo thun AI Learning Hub", cost: 1200, category: "physical", icon: Shirt, gradient: "from-violet-400 to-purple-500" },
  { id: "5", title: "Bộ sticker giảng viên", cost: 300, category: "physical", icon: Gift, gradient: "from-pink-400 to-rose-500" },
  { id: "6", title: "Ly giữ nhiệt Premium", cost: 1500, category: "physical", icon: Coffee, gradient: "from-amber-400 to-orange-500" },
  { id: "7", title: "Huy hiệu \"AI Trainer\"", cost: 200, category: "badge", icon: Award, gradient: "from-yellow-400 to-amber-500" },
  { id: "8", title: "Huy hiệu \"Top Contributor\"", cost: 800, category: "badge", icon: Crown, gradient: "from-indigo-400 to-violet-500" },
  { id: "9", title: "Chứng nhận đặc biệt", cost: 2000, category: "badge", icon: BookOpen, gradient: "from-teal-400 to-cyan-500" },
];

const categoryLabels: Record<string, string> = {
  all: "Tất cả",
  voucher: "E-Voucher",
  physical: "Quà hiện vật",
  badge: "Đặc quyền",
};

const RewardStore = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  const [filter, setFilter] = useState("all");
  const [points, setPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  
  // Lịch sử đổi quà
  const [history, setHistory] = useState<any[]>([]); 

  // 💡 LOGIC 1: BẢO VỆ ROUTE & LẤY ĐIỂM + LỊCH SỬ TỪ DATABASE
  useEffect(() => {
    // Nếu chưa đăng nhập hoặc không phải Giảng viên/Admin -> Đá về trang chủ
    if (!user || (user.role !== "Lecturer" && user.role !== "Admin")) {
      toast({ title: "Truy cập bị từ chối", description: "Chỉ giảng viên mới có thể truy cập Cửa hàng.", variant: "destructive" });
      navigate("/");
      return;
    }

    const fetchData = async () => {
      try {
        // Lấy Điểm mới nhất
        const resPoints = await fetch(`${API_BASE_URL}/api/Lecturer/my-points?email=${user.email}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const dataPoints = await resPoints.json();
        if (dataPoints && dataPoints.success) {
          setPoints(dataPoints.points);
        }

        // Lấy Lịch sử đổi quà
        const resHistory = await fetch(`${API_BASE_URL}/api/Lecturer/my-redemptions?email=${user.email}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const dataHistory = await resHistory.json();
        if (dataHistory && dataHistory.success) {
          setHistory(dataHistory.data);
        }
      } catch (error) {
        console.error("Lỗi lấy thông tin:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, navigate, token]);

  const filtered = filter === "all" ? rewards : rewards.filter((r) => r.category === filter);

  // 💡 LOGIC 2: GỌI API TRỪ ĐIỂM VÀ LƯU LỊCH SỬ KHI ĐỔI QUÀ
  const handleRedeem = async (reward: typeof rewards[0]) => {
    if (points < reward.cost || !user?.email) return;
    
    if (!window.confirm(`Bạn có chắc chắn muốn dùng ${reward.cost} điểm để đổi "${reward.title}" không?`)) return;

    setRedeemingId(reward.id);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/Lecturer/redeem-reward`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ email: user.email, cost: reward.cost, rewardName: reward.title })
      });

      const data = await response.json();

      if (data.success) {
        setPoints(data.newBalance); // Cập nhật lại số dư trên UI
        toast({ 
          title: "Đổi quà thành công! 🎉", 
          description: `Đã trừ ${reward.cost} điểm. Admin sẽ sớm liên hệ để trao quà cho bạn.` 
        });
        
        // Thêm ngay vào lịch sử trên UI để phản hồi tức thì
        setHistory(prev => [{
          date: new Date().toLocaleDateString('vi-VN'),
          item: reward.title,
          status: "Đang xử lý",
          code: "Chờ cấp mã",
          statusColor: "bg-warning/10 text-warning border-warning/20"
        }, ...prev]);
      } else {
        toast({ title: "Lỗi", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Lỗi kết nối", description: "Không thể thực hiện giao dịch.", variant: "destructive" });
    } finally {
      setRedeemingId(null);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex-1 container mx-auto px-6 pt-24 pb-12 flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/lecturer-dashboard")} className="text-muted-foreground mt-0.5">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-lg shadow-primary/20">
                  <ShoppingBag className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Cửa hàng Đổi thưởng</h1>
              </div>
              <p className="text-sm text-muted-foreground ml-12">
                Cảm ơn thầy/cô đã đóng góp cho cộng đồng! Hãy đổi điểm cống hiến lấy những phần quà hấp dẫn.
              </p>
            </div>
          </div>

          {/* Balance card */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent p-[1px]">
            <div className="relative rounded-2xl bg-card/95 backdrop-blur-sm px-6 py-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/15">
                <Trophy className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Số dư hiện tại</p>
                <p className="text-2xl font-bold text-foreground">
                  {points.toLocaleString()} <span className="text-base font-medium text-muted-foreground">Điểm</span>
                </p>
              </div>
              <Star className="absolute -top-2 -right-2 h-16 w-16 text-warning/10 rotate-12" />
            </div>
          </motion.div>
        </div>

        {/* Filter tabs */}
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="bg-muted/60 p-1 rounded-full w-fit">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <TabsTrigger key={key} value={key} className="rounded-full px-5 text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Reward grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((reward, i) => {
            const canAfford = points >= reward.cost;
            const deficit = reward.cost - points;
            const Icon = reward.icon;
            const isRedeeming = redeemingId === reward.id;

            return (
              <motion.div key={reward.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -4 }} className="group">
                <Card className="border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden h-full flex flex-col">
                  <div className={`h-36 bg-gradient-to-br ${reward.gradient} flex items-center justify-center relative`}>
                    <Icon className="h-16 w-16 text-white/90 group-hover:scale-110 transition-transform duration-300" />
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-black/20 backdrop-blur-sm text-white border-none text-xs font-semibold px-2 py-1">
                        💎 {reward.cost}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-4 flex flex-col flex-1 gap-3">
                    <h3 className="text-base font-bold text-foreground">{reward.title}</h3>

                    <div className="mt-auto pt-2">
                      {canAfford ? (
                        <Button onClick={() => handleRedeem(reward)} disabled={isRedeeming} className="w-full bg-gradient-primary text-white hover:opacity-90 shadow-glow rounded-xl font-bold">
                          {isRedeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-2" /> Đổi ngay</>}
                        </Button>
                      ) : (
                        <Button variant="secondary" disabled className="w-full rounded-xl opacity-70 font-semibold border border-border">
                          Còn thiếu {deficit.toLocaleString()} điểm
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* History */}
        <div className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Lịch sử đổi quà</h2>
          </div>

          <Card className="border-border rounded-2xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-semibold">Ngày đổi</TableHead>
                  <TableHead className="font-semibold">Tên quà tặng</TableHead>
                  <TableHead className="font-semibold">Trạng thái</TableHead>
                  <TableHead className="font-semibold">Mã / Ghi chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Thầy/cô chưa thực hiện đổi món quà nào.
                    </TableCell>
                  </TableRow>
                ) : history.map((h, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm text-muted-foreground">{h.date}</TableCell>
                    <TableCell className="text-sm font-medium text-foreground">{h.item}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${h.statusColor} shadow-none`}>
                        {h.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">{h.code}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RewardStore;