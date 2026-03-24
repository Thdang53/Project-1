using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class AICorrection
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ExerciseId { get; set; } 
    
    [Required]
    public int StudentId { get; set; } // Dùng để bắn thông báo chuông cho sinh viên này

    [Required]
    public string StudentIssue { get; set; } = string.Empty; // Bối cảnh/Đoạn chat bị lỗi

    [Required]
    public string OriginalAIResponse { get; set; } = string.Empty; // AI đã trả lời gì lúc đầu

    // --- Phần của Giảng viên ---
    public string? LecturerHint { get; set; } // Lời giải thích chuẩn (Bí kíp RAG)
    public int? LecturerId { get; set; } // Giảng viên nào đã duyệt
    
    public bool IsResolved { get; set; } = false; // Trạng thái: Chờ duyệt hay Đã xong?
    public string? StudentCode { get; set; } // Thêm dòng này để lưu code của sinh viên (nếu cần thiết cho việc giảng viên xem xét)
    
    // --- Phần Thông báo ---
    public bool IsRead { get; set; } = false; // Sinh viên đã click vào chuông chưa?

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}