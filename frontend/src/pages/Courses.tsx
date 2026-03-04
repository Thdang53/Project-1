import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Code2, BookOpen, ArrowRight, Clock, BarChart3, Users } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const }
  })
};

const courses = [
  {
    id: 1, title: "Python cơ bản", desc: "Biến, kiểu dữ liệu, vòng lặp, hàm và cấu trúc dữ liệu cơ bản.",
    level: "Cơ bản", lessons: 12, students: 1240, color: "primary",
  },
  {
    id: 2, title: "JavaScript & DOM", desc: "Tương tác với trang web, xử lý sự kiện và thao tác DOM.",
    level: "Cơ bản", lessons: 15, students: 980, color: "primary",
  },
  {
    id: 3, title: "Cấu trúc dữ liệu", desc: "Stack, Queue, Linked List, Tree và các thuật toán tìm kiếm/sắp xếp.",
    level: "Trung bình", lessons: 20, students: 670, color: "accent",
  },
  {
    id: 4, title: "React.js Thực chiến", desc: "Components, State, Hooks và xây dựng ứng dụng SPA hoàn chỉnh.",
    level: "Trung bình", lessons: 18, students: 540, color: "accent",
  },
  {
    id: 5, title: "Thuật toán nâng cao", desc: "Dynamic Programming, Greedy, Graph — luyện đề thi và phỏng vấn.",
    level: "Nâng cao", lessons: 25, students: 320, color: "destructive",
  },
  {
    id: 6, title: "SQL & Cơ sở dữ liệu", desc: "Thiết kế database, truy vấn, JOIN, subquery và tối ưu hóa.",
    level: "Cơ bản", lessons: 10, students: 890, color: "primary",
  },
];

const levelColor: Record<string, string> = {
  "Cơ bản": "bg-primary/10 text-primary",
  "Trung bình": "bg-accent/10 text-accent",
  "Nâng cao": "bg-destructive/10 text-destructive",
};

const Courses = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
              <Code2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">CodeAI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghost" size="sm">Đăng nhập</Button></Link>
            <Link to="/workspace">
              <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">Workspace</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 pt-28 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Khóa học <span className="text-gradient-primary">lập trình</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Chọn khóa học phù hợp và bắt đầu thực hành cùng AI ngay hôm nay.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((c, i) => (
            <motion.div
              key={c.id}
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={i}
            >
              <Link to="/workspace" className="group block rounded-xl border border-border bg-card p-6 shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${levelColor[c.level]}`}>{c.level}</span>
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors">{c.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{c.lessons} bài</span>
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{c.students}</span>
                </div>
                <div className="mt-4 flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Bắt đầu học <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Courses;
