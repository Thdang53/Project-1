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

    public string TestCases { get; set; } = string.Empty;


    [MaxLength(50)]
    public string Difficulty { get; set; } = "Cơ bản";
}