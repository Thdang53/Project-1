using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    public class StudentActivity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string UserEmail { get; set; } = string.Empty;

        [Required]
        public int ExerciseId { get; set; }

        // Thời gian bắt đầu mở bài tập (để đo thời gian loay hoay)
        public DateTime StartTime { get; set; } = DateTime.UtcNow;

        // Thời gian nộp bài thử gần nhất
        public DateTime LastAttemptTime { get; set; } = DateTime.UtcNow;

        // Số lần nộp sai liên tiếp (Rada cảnh báo nếu > 5)
        public int ConsecutiveErrors { get; set; } = 0;

        // Đánh dấu true nếu cuối cùng sinh viên cũng nộp đúng (Passed)
        public bool IsResolved { get; set; } = false;

        [ForeignKey("ExerciseId")]
        public Exercise? Exercise { get; set; }
    }
}