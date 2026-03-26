using System;
using System.Collections.Generic;

namespace backend.Models
{
    public class GeminiSession
    {
        public int Id { get; set; }
        
        // Khóa ngoại liên kết với người dùng (Admin/Lecturer)
        public int UserId { get; set; } 
        
        // Tiêu đề cuộc trò chuyện (AI sẽ tự đặt tên dựa trên câu hỏi đầu tiên)
        public string Title { get; set; } = "Cuộc trò chuyện mới"; 
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Danh sách tin nhắn trong phiên này
        public ICollection<GeminiMessage> Messages { get; set; } = new List<GeminiMessage>();
    }
}