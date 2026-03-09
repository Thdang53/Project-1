using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    // Khuôn mẫu hứng dữ liệu từ giao diện Đăng ký gửi lên
    public class RegisterRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(6, ErrorMessage = "Mật khẩu phải có ít nhất 6 ký tự")]
        public string Password { get; set; } = string.Empty;

        [Required]
        public string FullName { get; set; } = string.Empty;
    }

    // Khuôn mẫu hứng dữ liệu từ giao diện Đăng nhập gửi lên
    public class LoginRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }
}