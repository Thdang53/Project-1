using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class Course
    {
        [Key]
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public int OrderNum { get; set; }

        // 💡 THÊM MỚI: Định danh người tạo khóa học
        public int? LecturerId { get; set; } 
    }
}