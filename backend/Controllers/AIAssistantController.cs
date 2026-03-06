using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AIAssistantController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public AIAssistantController(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _configuration = configuration;
        }

        public class AIRequest
        {
            public string Code { get; set; } = string.Empty;
            public string Language { get; set; } = "python";
            public string ErrorOutput { get; set; } = string.Empty; 
            public string UserQuestion { get; set; } = string.Empty; 
        }

        [HttpPost("analyze")]
        public async Task<IActionResult> AnalyzeCode([FromBody] AIRequest request)
        {
            string? apiKey = _configuration["GeminiApiKey"];
            if (string.IsNullOrEmpty(apiKey))
            {
                return StatusCode(500, new { feedback = "Lỗi máy chủ: Chưa cấu hình Gemini API Key." });
            }

            // ==========================================
            // NGHỆ THUẬT PROMPT ENGINEERING (ĐÃ TỐI ƯU)
            // ==========================================
            string prompt = $"Bạn là một giảng viên IT nhiệt tình và xuất sắc. Ngôn ngữ lập trình hiện tại là {request.Language}.\n\n";

            // TRƯỜNG HỢP 1: Sinh viên CHAT (Có đặt câu hỏi cụ thể)
            if (!string.IsNullOrEmpty(request.UserQuestion))
            {
                prompt += $"Sinh viên hỏi bạn: \"{request.UserQuestion}\"\n\n";
                prompt += "HƯỚNG DẪN TRẢ LỜI CHO BẠN (AI):\n";
                prompt += "1. Nếu câu hỏi là kiến thức lập trình lý thuyết chung chung (ví dụ: vòng lặp là gì, if else là gì, hàm là gì...), hãy trả lời trực tiếp vào lý thuyết đó một cách dễ hiểu mà KHÔNG CẦN liên kết ép buộc với đoạn code sinh viên đang viết.\n";
                prompt += "2. Nếu câu hỏi của sinh viên liên quan trực tiếp đến lỗi code (ví dụ: 'sao code em không chạy', 'lỗi này là gì'), hãy dựa vào [Tài liệu tham khảo] bên dưới để giải thích.\n";
                prompt += "3. Luôn trả lời bằng định dạng Markdown đẹp mắt, thân thiện.\n\n";

                // Chỉ đưa code vào như một tài liệu tham khảo đính kèm, không ép AI phải dùng
                prompt += $"--- [TÀI LIỆU THAM KHẢO: Code hiện tại của sinh viên] ---\n```\n{request.Code}\n```\n";
                if (!string.IsNullOrEmpty(request.ErrorOutput))
                {
                    prompt += $"--- [TÀI LIỆU THAM KHẢO: Lỗi hệ thống báo] ---\n```\n{request.ErrorOutput}\n```\n";
                }
            }
            // TRƯỜNG HỢP 2: Sinh viên BẤM NÚT "HỎI AI" (Không có câu hỏi, yêu cầu phân tích code)
            else
            {
                prompt += $"Đây là đoạn code của sinh viên:\n```\n{request.Code}\n```\n";
                if (!string.IsNullOrEmpty(request.ErrorOutput))
                {
                    prompt += $"Khi chạy thử, hệ thống báo lỗi sau:\n```\n{request.ErrorOutput}\n```\n";
                }
                prompt += "Hãy phân tích xem đoạn code trên có lỗi cú pháp hay logic nào không. Nếu có, hãy giải thích ngắn gọn và hướng dẫn cách sửa. Nếu code đúng, hãy khen ngợi và gợi ý cách viết tối ưu hơn. Trả về định dạng Markdown.";
            }
            // ==========================================

            var payload = new
            {
                contents = new[] { new { parts = new[] { new { text = prompt } } } }
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            try
            {
                string url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";
                var response = await _httpClient.PostAsync(url, content);
                var responseString = await response.Content.ReadAsStringAsync();

                using var doc = JsonDocument.Parse(responseString);
                var root = doc.RootElement;

                if (root.TryGetProperty("error", out var errorElement))
                {
                    return Ok(new { feedback = $"[LỖI TỪ GOOGLE]: {errorElement.GetProperty("message").GetString()}" });
                }

                string aiResponse = root.GetProperty("candidates")[0]
                                        .GetProperty("content")
                                        .GetProperty("parts")[0]
                                        .GetProperty("text").GetString() ?? "AI không có phản hồi.";

                return Ok(new { feedback = aiResponse });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { feedback = "Lỗi kết nối đến Google Gemini: " + ex.Message });
            }
        }
    }
}