import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Code2, BookOpen, ArrowRight, Clock, Users } from "lucide-react";
import { motion } from "framer-motion";

// Định nghĩa kiểu dữ liệu Khóa học (Khớp với Database từ C# Backend)
interface Course {
  id: number;
  title: string;
  description: string;
  level: string;
  // Các trường dưới đây chưa có trong DB, tạm thời để optional (?)
  lessons?: number;
  students?: number;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const }
  })
};

const levelColor: Record<string, string> = {
  "Cơ bản": "bg-primary/10 text-primary",
  "Trung bình": "bg-accent/10 text-accent",
  "Nâng cao": "bg-destructive/10 text-destructive",
};

const Courses = () => {
  // 1. Khai báo State để chứa dữ liệu từ API
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 2. Gọi API khi trang được tải lên
  useEffect(() => {
    // Lưu ý: Đảm bảo cổng 5043 khớp với cổng Backend ASP.NET của bạn
    fetch("http://localhost:5043/api/Courses")
      .then((response) => response.json())
      .then((data) => {
        setCourses(data); // Đưa dữ liệu thật vào state
        setIsLoading(false); // Tắt màn hình loading
      })
      .catch((error) => {
        console.error("Lỗi khi lấy dữ liệu khóa học:", error);
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
              <Code2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">AI Learning Hub</span>
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

        {/* Xử lý hiển thị khi đang tải dữ liệu */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((c, i) => (
              <motion.div
                key={c.id}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i}
              >
                <Link to="/workspace" className="group block rounded-xl border border-border bg-card p-6 shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-4">
                    {/* Thêm fallback màu sắc trong trường hợp Level trả về không khớp key */}
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${levelColor[c.level] || 'bg-primary/10 text-primary'}`}>
                      {c.level}
                    </span>
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors">{c.title}</h3>
                  {/* Sử dụng c.description thay cho c.desc để khớp với C# Model */}
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.description}</p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{c.lessons || 10} bài</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{c.students || 100}</span>
                  </div>
                  <div className="mt-4 flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Bắt đầu học <ArrowRight className="ml-1 h-4 w-4" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
        
        {/* Hiển thị thông báo nếu Database trống */}
        {!isLoading && courses.length === 0 && (
          <div className="text-center text-muted-foreground mt-8">
            Hiện chưa có khóa học nào trong hệ thống.
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;