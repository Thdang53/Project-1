using System;
using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class AdvisorChat
    {
        [Key]
        public int Id { get; set; }
        
        // 🌟 ĐÃ ĐỔI: Khóa ngoại liên kết với Bảng Cuộc trò chuyện (AdvisorSession)
        public int SessionId { get; set; } 
        
        public string Role { get; set; } = "user"; // "user" (Giảng viên) hoặc "ai" (Trợ lý)
        
        public string Content { get; set; } = string.Empty; // Nội dung tin nhắn
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}