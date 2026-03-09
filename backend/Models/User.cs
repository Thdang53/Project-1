using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class User
{
    [Key]
    public int Id { get; set; }

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    // Chứa mật khẩu đã được BCrypt mã hóa an toàn
    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    // SỬA TỪ Username THÀNH FullName ĐỂ KHỚP VỚI GIAO DIỆN
    [Required]
    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Role { get; set; } = "Student"; // "Student" hoặc "Admin"

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}