using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Course
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Level { get; set; } = string.Empty;
}