import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Trophy, Clock, TrendingUp, Play, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type Course = Tables<"courses">;

interface EnrolledCourse extends Course {
  status: string;
  score: number | null;
  completed_at: string | null;
  lessonsCompleted: number;
}

const StudentDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();
    if (profile) setDisplayName(profile.display_name ?? user.email?.split("@")[0] ?? "");

    // Fetch progress
    const { data: progress } = await supabase
      .from("learning_progress")
      .select("course_id, status, score, completed_at, lesson_id")
      .eq("user_id", user.id);

    // Fetch all courses
    const { data: allCourses } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });

    if (!allCourses) {
      setLoading(false);
      return;
    }

    const enrolledCourseIds = new Set(progress?.map(p => p.course_id) ?? []);

    // Build enrolled courses with progress info
    const enrolled: EnrolledCourse[] = [];
    const courseProgressMap = new Map<string, typeof progress>();

    progress?.forEach(p => {
      const existing = courseProgressMap.get(p.course_id) ?? [];
      existing.push(p);
      courseProgressMap.set(p.course_id, existing);
    });

    allCourses.forEach(course => {
      if (enrolledCourseIds.has(course.id)) {
        const items = courseProgressMap.get(course.id) ?? [];
        const completed = items.filter(i => i.status === "completed");
        const latestCompleted = completed.sort((a, b) =>
          (b.completed_at ?? "").localeCompare(a.completed_at ?? "")
        )[0];
        const bestScore = Math.max(...items.map(i => i.score ?? 0), 0);
        const isCompleted = items.some(i => i.status === "completed" && !i.lesson_id);

        enrolled.push({
          ...course,
          status: isCompleted ? "completed" : "in_progress",
          score: bestScore > 0 ? bestScore : null,
          completed_at: latestCompleted?.completed_at ?? null,
          lessonsCompleted: completed.length,
        });
      }
    });

    setEnrolledCourses(enrolled);
    setAvailableCourses(allCourses.filter(c => !enrolledCourseIds.has(c.id)));
    setLoading(false);
  };

  const totalCourses = enrolledCourses.length;
  const completedCourses = enrolledCourses.filter(c => c.status === "completed").length;
  const inProgressCourses = totalCourses - completedCourses;
  const avgScore = enrolledCourses.filter(c => c.score !== null).length > 0
    ? Math.round(enrolledCourses.reduce((sum, c) => sum + (c.score ?? 0), 0) / enrolledCourses.filter(c => c.score !== null).length)
    : 0;

  const levelLabel: Record<string, string> = { basic: "Cơ bản", intermediate: "Trung bình", advanced: "Nâng cao" };
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary"; icon: typeof CheckCircle2 }> = {
    completed: { label: "Hoàn thành", variant: "default", icon: CheckCircle2 },
    in_progress: { label: "Đang học", variant: "secondary", icon: Play },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Xin chào, <span className="text-gradient-primary">{displayName}</span> 👋
          </h1>
          <p className="mt-1 text-muted-foreground">Theo dõi tiến độ học tập và khám phá khóa học mới</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Đã đăng ký", value: totalCourses, icon: BookOpen, color: "text-primary" },
            { label: "Đang học", value: inProgressCourses, icon: Clock, color: "text-accent" },
            { label: "Hoàn thành", value: completedCourses, icon: Trophy, color: "text-success" },
            { label: "Điểm TB", value: avgScore > 0 ? avgScore : "—", icon: TrendingUp, color: "text-warning" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="border-border shadow-card">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-muted ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Enrolled Courses */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4">Khóa học của tôi</h2>
          {enrolledCourses.length === 0 ? (
            <Card className="border-border shadow-card">
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">Bạn chưa đăng ký khóa học nào</p>
                <Link to="/courses">
                  <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                    Khám phá khóa học
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {enrolledCourses.map((course, i) => {
                const config = statusConfig[course.status] ?? statusConfig.in_progress;
                const progressPct = course.total_lessons > 0
                  ? Math.round((course.lessonsCompleted / course.total_lessons) * 100)
                  : course.status === "completed" ? 100 : 0;

                return (
                  <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                    <Card className="border-border shadow-card hover:shadow-elevated transition-shadow h-full flex flex-col">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base leading-tight">{course.title}</CardTitle>
                          <Badge variant={config.variant} className="shrink-0 gap-1">
                            <config.icon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2 text-sm">{course.description ?? "Không có mô tả"}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col justify-end gap-3">
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs">{course.language}</Badge>
                          <Badge variant="outline" className="text-xs">{levelLabel[course.level] ?? course.level}</Badge>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                            <span>Tiến độ</span>
                            <span>{progressPct}%</span>
                          </div>
                          <Progress value={progressPct} className="h-2" />
                        </div>
                        {course.score !== null && (
                          <p className="text-sm text-muted-foreground">Điểm: <span className="font-semibold text-foreground">{course.score}</span></p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Available Courses */}
        {availableCourses.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Khóa học có sẵn</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {availableCourses.map((course, i) => (
                <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <Card className="border-border shadow-card hover:shadow-elevated transition-shadow h-full flex flex-col">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base leading-tight">{course.title}</CardTitle>
                      <CardDescription className="line-clamp-2 text-sm">{course.description ?? "Không có mô tả"}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-end gap-3">
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">{course.language}</Badge>
                        <Badge variant="outline" className="text-xs">{levelLabel[course.level] ?? course.level}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{course.total_lessons} bài học</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
