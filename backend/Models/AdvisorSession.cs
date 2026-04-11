using System;
using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class AdvisorSession
    {
        [Key]
        public int Id { get; set; }
        
        public int ClassId { get; set; } // Cuộc trò chuyện này thuộc về Lớp nào
        
        public int LecturerId { get; set; } // Của Giảng viên nào
        
        public string Title { get; set; } = "Cuộc trò chuyện mới"; // Tên hiển thị ở thanh lịch sử bên góc
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}