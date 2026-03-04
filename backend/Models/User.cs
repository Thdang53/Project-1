using System.ComponentModel.DataAnnotations;

namespace backend.Models; // Lưu ý: 'backend' là tên mặc định theo thư mục hiện tại của bạn

public class User
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Role { get; set; } = "student"; 

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}