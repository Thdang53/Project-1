using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class UserProfile
    {
        [Key]
        public string Email { get; set; } = string.Empty; // Dùng Email làm khóa chính để tìm kiếm
        public string FullName { get; set; } = string.Empty;
        public string Nickname { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty; // Lưu dạng Base64 hoặc Link
        public string Location { get; set; } = string.Empty;
        public string GithubUrl { get; set; } = string.Empty;
        public string Bio { get; set; } = string.Empty;
        public string ContactInfo { get; set; } = string.Empty;

        // 🌟 BỔ SUNG 2 BIẾN NÀY ĐỂ AI CHẠY ĐỘNG CƠ ADAPTIVE (THÍCH ỨNG)
        // Khẩu vị cốt truyện đề bài (Game, Kinh tế, Truyện tranh...)
        public string? PreferredTopic { get; set; } 

        // Trình độ do AI tự đánh giá (Cơ bản, Trung bình, OLP)
        public string CurrentLevel { get; set; } = "Cơ bản";
    }
}