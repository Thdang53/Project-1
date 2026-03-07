import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Code2, Bot, Terminal, Sparkles, BookOpen, Users, ArrowRight, Play, CheckCircle2, Zap, BrainCircuit } from "lucide-react";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-bg.jpg";
import Navbar from "@/components/Navbar";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" as const }
  })
};

const features = [
  {
    icon: Code2,
    title: "Code Editor trực tuyến",
    desc: "Viết và chạy code trực tiếp trên trình duyệt với Monaco Editor, hỗ trợ highlight cú pháp đa ngôn ngữ.",
  },
  {
    icon: BrainCircuit,
    title: "AI phân tích lỗi code",
    desc: "AI tự động tìm lỗi cú pháp, lỗi logic và gợi ý cách sửa — không viết sẵn code mà giúp bạn tự học.",
  },
  {
    icon: Bot,
    title: "Chatbot trợ giảng 24/7",
    desc: "Trợ lý AI hiểu ngữ cảnh bài tập, trả lời chính xác câu hỏi dựa trên code bạn đang viết.",
  },
  {
    icon: Terminal,
    title: "Terminal & Output",
    desc: "Xem kết quả chạy code ngay lập tức, cùng phản hồi chi tiết từ AI về lỗi và gợi ý.",
  },
  {
    icon: BookOpen,
    title: "Khóa học có hệ thống",
    desc: "Từ cơ bản đến nâng cao, mỗi bài học kèm bài tập thực hành để bạn hiểu sâu kiến thức.",
  },
  {
    icon: Users,
    title: "Theo dõi tiến độ",
    desc: "Hệ thống lưu trữ tiến độ, điểm số và lịch sử bài nộp để bạn biết mình đang ở đâu.",
  },
];

const steps = [
  { num: "01", title: "Chọn bài học", desc: "Chọn khóa học và bài tập phù hợp trình độ của bạn." },
  { num: "02", title: "Viết code", desc: "Sử dụng Code Editor để lập trình và giải bài tập." },
  { num: "03", title: "Nhờ AI hỗ trợ", desc: "AI phân tích code, chỉ ra lỗi và gợi ý cách sửa." },
  { num: "04", title: "Nâng trình", desc: "Hoàn thành bài tập, theo dõi tiến bộ mỗi ngày." },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="transparent" />

      <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: `url(${heroImg})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        
        <div className="container relative mx-auto px-6 py-20">
          <div className="max-w-3xl">
            <motion.div
              initial="hidden" animate="visible" variants={fadeUp} custom={0}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 mb-6"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Tích hợp AI Gemini</span>
            </motion.div>
            
            <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1}
              className="text-5xl md:text-7xl font-bold leading-tight tracking-tight"
            >
              <span className="text-primary-foreground">Học lập trình</span>
              <br />
              <span className="text-gradient-primary">cùng trợ giảng AI</span>
            </motion.h1>
            
            <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2}
              className="mt-6 text-lg md:text-xl text-primary-foreground/70 max-w-xl leading-relaxed"
            >
              Viết code, chạy thử và nhận phản hồi từ AI ngay trên trình duyệt. 
              Không cần cài đặt — chỉ cần bắt đầu.
            </motion.p>
            
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Link to="/student-dashboard">
                <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow text-base px-8 h-12">
                  <Play className="mr-2 h-5 w-5" /> Bắt đầu làm bài ngay
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CÁC PHẦN FEATURES VÀ STEPS ĐƯỢC GIỮ NGUYÊN... */}
      <section id="features" className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-4">
              <Zap className="h-4 w-4" /> Tính năng nổi bật
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-4">
              Mọi thứ bạn cần để <span className="text-gradient-primary">học lập trình</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Nền tảng tích hợp đầy đủ: editor, AI, chatbot và hệ thống bài tập — tất cả trong một.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i}
                className="group rounded-xl border border-border bg-card p-6 shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-gradient-primary group-hover:text-primary-foreground transition-all duration-300">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-card-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-muted/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground">
              Bắt đầu trong <span className="text-gradient-primary">4 bước</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i}
                className="text-center"
              >
                <div className="text-5xl font-bold text-primary/20 mb-4">{s.num}</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="rounded-2xl bg-gradient-hero p-12 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: `url(${heroImg})`, backgroundSize: "cover" }}
            />
            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4">
                Sẵn sàng chinh phục lập trình?
              </h2>
              <p className="text-lg text-primary-foreground/70 mb-8 max-w-xl mx-auto">
                Hàng trăm bài tập, AI hỗ trợ thông minh — bắt đầu hành trình ngay hôm nay.
              </p>
              <Link to="/student-dashboard">
                <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow text-base px-10 h-12">
                  Bắt đầu làm bài ngay <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER ĐÃ ĐƯỢC ĐỔI TÊN THÀNH AI LEARNING HUB */}
      <footer className="border-t border-border py-12 bg-background">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                <Code2 className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground">AI Learning Hub</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 AI Learning Hub — Nền tảng học lập trình tích hợp AI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;