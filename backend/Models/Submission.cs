using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    public class Submission
    {
        [Key]
        public int Id { get; set; }

        // Lưu email của học viên (Liên kết với bảng UserProfile nếu cần)
        [Required]
        public string UserEmail { get; set; } = string.Empty;

        // Mã ID của bài tập mà học viên vừa nộp
        [Required]
        public int ExerciseId { get; set; }

        // Code mà học viên đã gõ (để sau này họ xem lại)
        public string Code { get; set; } = string.Empty;

        // Ngôn ngữ lập trình (python, cpp, java...)
        public string Language { get; set; } = string.Empty;

        // Trạng thái cuối cùng: "Accepted" (Đúng hết) hoặc "Wrong Answer" (Sai)
        public string Status { get; set; } = string.Empty;

        // BỔ SUNG 2 CỘT NÀY ĐỂ FIX LỖI ĐỎ: Lưu số test case vượt qua và tổng số test case
        public int PassedTests { get; set; }
        public int TotalTests { get; set; }

        // Thời gian nộp bài
        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

        // Khóa ngoại (Tùy chọn) để EF Core biết bài tập này thuộc bảng Exercises
        [ForeignKey("ExerciseId")]
        public Exercise? Exercise { get; set; }
    }
}