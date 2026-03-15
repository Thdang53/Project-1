using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Net;
using System.IO; // 👈 Cần thiết cho StreamReader

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

        public class ChatMessage
        {
            public string Role { get; set; } = string.Empty;
            public string Content { get; set; } = string.Empty;
        }

        public class AIRequest
        {
            public string Code { get; set; } = string.Empty;
            public string Language { get; set; } = "python";
            public string ErrorOutput { get; set; } = string.Empty; 
            public string UserQuestion { get; set; } = string.Empty; 
            public string ExerciseTitle { get; set; } = string.Empty;
            public string ExerciseDescription { get; set; } = string.Empty;
            public List<ChatMessage> ChatHistory { get; set; } = new();
        }

        private string StripHTML(string input)
        {
            if (string.IsNullOrEmpty(input)) return string.Empty;
            string noHtml = Regex.Replace(input, "<.*?>", string.Empty);
            string decodedText = WebUtility.HtmlDecode(noHtml);
            return decodedText.Trim();
        }

        // 💡 GIỮ NGUYÊN IActionResult, TRẢ VỀ EmptyResult ĐỂ KHÔNG BỊ LỖI
        [HttpPost("analyze")]
        public async Task<IActionResult> AnalyzeCode([FromBody] AIRequest request)
        {
            string? apiKey = _configuration["GeminiApiKey"];
            if (string.IsNullOrEmpty(apiKey))
            {
                return StatusCode(500, new { feedback = "Lỗi máy chủ: Chưa cấu hình Gemini API Key." });
            }

            // 1. TẠO SYSTEM INSTRUCTION
            string systemInstruction = $@"Bạn là một giảng viên IT nhiệt tình và xuất sắc. Ngôn ngữ lập trình hiện tại là {request.Language}.
Nhiệm vụ của bạn:
1. Đọc hiểu Tên bài tập và Yêu cầu đề bài.
2. Đối chiếu code của sinh viên để tìm ra lỗ hổng thuật toán, sai logic hoặc hiểu sai đề.
3. Nếu có Lịch sử trò chuyện, hãy dựa vào đó để trả lời tiếp mạch suy nghĩ của sinh viên một cách tự nhiên.
4. Đưa ra gợi ý từng bước để sinh viên tự khắc phục. Tuyệt đối KHÔNG viết sẵn toàn bộ code.
5. Luôn trả lời bằng định dạng Markdown đẹp mắt, thân thiện.";

            // 2. TẠO USER PROMPT
            string userPrompt = "";

            if (!string.IsNullOrEmpty(request.ExerciseTitle) || !string.IsNullOrEmpty(request.ExerciseDescription))
            {
                userPrompt += "--- [BỐI CẢNH BÀI TẬP] ---\n";
                if (!string.IsNullOrEmpty(request.ExerciseTitle)) 
                    userPrompt += $"Tên bài tập: {request.ExerciseTitle}\n";
                if (!string.IsNullOrEmpty(request.ExerciseDescription)) 
                    userPrompt += $"Yêu cầu: {StripHTML(request.ExerciseDescription)}\n\n";
            }

            userPrompt += $"--- [CODE HIỆN TẠI CỦA SINH VIÊN] ---\n```\n{request.Code}\n```\n\n";

            if (!string.IsNullOrEmpty(request.ErrorOutput))
            {
                userPrompt += $"--- [LỖI HỆ THỐNG GHI NHẬN] ---\n```\n{request.ErrorOutput}\n```\n\n";
            }

            if (request.ChatHistory != null && request.ChatHistory.Count > 0)
            {
                userPrompt += "--- [LỊCH SỬ TRÒ CHUYỆN TRƯỚC ĐÓ] ---\n";
                foreach (var msg in request.ChatHistory)
                {
                    string sender = msg.Role == "user" ? "Sinh viên" : "Bạn (AI)";
                    if (!string.IsNullOrWhiteSpace(msg.Content)) 
                    {
                        userPrompt += $"{sender}: {msg.Content}\n";
                    }
                }
                userPrompt += "\n";
            }

            if (!string.IsNullOrEmpty(request.UserQuestion))
            {
                userPrompt += $"--- [CÂU HỎI MỚI NHẤT CỦA SINH VIÊN] ---\n\"{request.UserQuestion}\"\n\n";
                userPrompt += "Dựa vào Code, Bối cảnh và Lịch sử trò chuyện, hãy trả lời câu hỏi mới nhất này.";
            }
            else
            {
                userPrompt += "--- [YÊU CẦU PHÂN TÍCH] ---\n";
                userPrompt += "Hãy phân tích đoạn code trên xem có đáp ứng đúng yêu cầu bài tập không. Có lỗi cú pháp hay logic thuật toán nào không?";
            }

            // 3. XÂY DỰNG PAYLOAD
            var payload = new
            {
                systemInstruction = new { parts = new[] { new { text = systemInstruction } } },
                contents = new[] { new { parts = new[] { new { text = userPrompt } } } },
                generationConfig = new { temperature = 0.2 }
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            try
            {
                // Gọi API dạng stream (có tham số alt=sse)
                string url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key={apiKey}";
                var requestMessage = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
                
                using var response = await _httpClient.SendAsync(requestMessage, HttpCompletionOption.ResponseHeadersRead);

                if (!response.IsSuccessStatusCode)
                {
                    var responseString = await response.Content.ReadAsStringAsync();
                    return StatusCode((int)response.StatusCode, new { feedback = $"Lỗi từ Google Gemini: {responseString}" });
                }

                // 💡 CẤU HÌNH HEADERS CHO SSE CHUẨN MỰC
                Response.ContentType = "text/event-stream";
               Response.Headers.Append("Cache-Control", "no-cache");
               Response.Headers.Append("Connection", "keep-alive");
                await Response.Body.FlushAsync();

                using var stream = await response.Content.ReadAsStreamAsync();
                using var reader = new StreamReader(stream);
            
                while (!reader.EndOfStream!)
                {
                    var line = await reader.ReadLineAsync();
                    if (!string.IsNullOrEmpty(line) && line.StartsWith("data: "))
                    {
                        var json = line.Substring(6); 
                        if (json.Trim() == "[DONE]") continue;

                        try
                        {
                            using var doc = JsonDocument.Parse(json);
                            var root = doc.RootElement;
                            var candidates = root.GetProperty("candidates");
                            if (candidates.GetArrayLength() > 0)
                            {
                                var parts = candidates[0].GetProperty("content").GetProperty("parts");
                                if (parts.GetArrayLength() > 0 && parts[0].TryGetProperty("text", out var textElement))
                                {
                                    var text = textElement.GetString();
                                    if (!string.IsNullOrEmpty(text))
                                    {
                                        var responsePayload = JsonSerializer.Serialize(new { text = text });
                                        await Response.WriteAsync($"data: {responsePayload}\n\n");
                                        await Response.Body.FlushAsync();
                                    }
                                }
                            }
                        }
                        catch { /* Bỏ qua lỗi parsing của từng cục nhỏ để tiếp tục stream */ }
                    }
                }

                // Trả về EmptyResult để kết thúc luồng an toàn mà không bị lỗi
                return new EmptyResult();
            }
            catch (Exception ex)
            {
                if (!Response.HasStarted)
                {
                    return StatusCode(500, new { feedback = "Lỗi kết nối đến Google Gemini: " + ex.Message });
                }
                return new EmptyResult();
            }
        }
    }
}