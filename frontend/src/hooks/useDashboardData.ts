import { useQuery } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const useDashboardData = () => {
  // 1. Fetch Khóa học
  const { data: courses = [], isLoading: loadingCourses, refetch: refetchCourses } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/Courses`);
      if (!res.ok) throw new Error("Lỗi tải khóa học");
      return res.json();
    }
  });

  // 2. Fetch Bài học
  const { data: lessons = [], isLoading: loadingLessons, refetch: refetchLessons } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/Lessons`);
      if (!res.ok) throw new Error("Lỗi tải bài học");
      return res.json();
    }
  });

  // 3. Fetch Bài tập
  const { data: exercises = [], isLoading: loadingExercises, refetch: refetchExercises } = useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/Exercises`);
      if (!res.ok) throw new Error("Lỗi tải bài tập");
      return res.json();
    }
  });

  // 4. Fetch Thống kê người dùng
  const { data: studentStats = [], isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ["studentStats"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/UserProfile/stats`);
      if (!res.ok) throw new Error("Lỗi tải thống kê");
      return res.json();
    }
  });

  // Tính toán trạng thái loading chung
  const isLoading = loadingCourses || loadingLessons || loadingExercises || loadingStats;

  // Hàm gọi lại tất cả API khi có thay đổi (Thêm/Sửa/Xóa)
  const refetchAll = () => {
    refetchCourses();
    refetchLessons();
    refetchExercises();
    refetchStats();
  };

  return {
    courses,
    lessons,
    exercises,
    studentStats,
    isLoading,
    refetchAll
  };
};