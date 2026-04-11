using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    public class SpacedRepetition
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        public int ExerciseId { get; set; }

        // --- Các thông số của thuật toán SM-2 ---
        public int Repetitions { get; set; } = 0; // Số chuỗi thắng liên tiếp
        public double EaseFactor { get; set; } = 2.5; // Hệ số dễ (Mặc định 2.5)
        public int Interval { get; set; } = 0; // Số ngày cách quãng
        public DateTime NextReviewDate { get; set; } = DateTime.UtcNow; // Ngày báo thức bắt làm lại

        [ForeignKey("UserId")]
        public User? User { get; set; }

        [ForeignKey("ExerciseId")]
        public Exercise? Exercise { get; set; }
    }
}