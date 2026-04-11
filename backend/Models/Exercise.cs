using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

public class Exercise
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int LessonId { get; set; } // Khóa ngoại liên kết với bảng Lesson

    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty; // Đề bài tập
    

    // 🌟 BỔ SUNG CỘT NÀY ĐỂ CHỨA CODE MẪU CHO SINH VIÊN VÀ FIX LỖI AI CỐ VẤN
    public string StarterCode { get; set; } = string.Empty; 

    public string TestCases { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Difficulty { get; set; } = "Cơ bản";

    public bool IsPublic { get; set; } = false; // Thuộc thư viện chung hay cá nhân?
    public int OwnerId { get; set; } // ID người tạo ra bài này
    public int? ClassId { get; set; }   // Nếu bài tập này thuộc về một lớp học cụ thể nào đó (null nếu không thuộc lớp nào)
}