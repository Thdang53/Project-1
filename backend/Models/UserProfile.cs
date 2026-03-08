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
    }
}