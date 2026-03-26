using System;
using System.Text.Json.Serialization;

namespace backend.Models
{
    public class GeminiMessage
    {
        public int Id { get; set; }
        
        public int SessionId { get; set; }
        
        // "user" (người dùng) hoặc "ai" (Gemini)
        public string Role { get; set; } = string.Empty; 
        
        public string Content { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [JsonIgnore]
        public GeminiSession? Session { get; set; }
    }
}