using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

public class Lesson
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int CourseId { get; set; } // Khóa ngoại liên kết với bảng Course

    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty; // Lý thuyết bài học

    public int OrderNum { get; set; } // Thứ tự bài học (Bài 1, Bài 2...)
}