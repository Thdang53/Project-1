using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Net;
using System.IO; 
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Linq; 
using Microsoft.EntityFrameworkCore; 
using backend.Data;    
using backend.Models;  

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AIAssistantController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly AppDbContext _context; 
        
        private readonly backend.Services.GeminiAssistantService _geminiService;

        public AIAssistantController(HttpClient httpClient, IConfiguration configuration, AppDbContext context, backend.Services.GeminiAssistantService geminiService)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _context = context; 
            _geminiService = geminiService; 
        }

        // ==========================================
        // CÁC CLASS MODEL YÊU CẦU DỮ LIỆU
        // ==========================================
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
            public int ExerciseId { get; set; } 
            public string ExerciseTitle { get; set; } = string.Empty;
            public string ExerciseDescription { get; set; } = string.Empty;
            public List<ChatMessage> ChatHistory { get; set; } = new();
        }

        public class PrerequisiteRequest
        {
            public string ExerciseTitle { get; set; } = string.Empty;
            public string ExerciseDescription { get; set; } = string.Empty;
            public string StudentLevel { get; set; } = "Cơ bản"; 
        }

        public class GenerateExerciseRequest
        {
            public string StudentEmail { get; set; } = string.Empty; 
            public string Language { get; set; } = string.Empty; 
            public string Topic { get; set; } = string.Empty;    
            public string Difficulty { get; set; } = string.Empty; 
        }

        public class GeneratedExerciseResponse
        {
            public string Title { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
            public string Difficulty { get; set; } = string.Empty;
            public string StarterCode { get; set; } = string.Empty;
            public List<GeneratedTestCase> TestCases { get; set; } = new();
        }

        public class GeneratedTestCase
        {
            public string Input { get; set; } = string.Empty;
            public string ExpectedOutput { get; set; } = string.Empty;
        }

        public class ReportFlagRequest
        {
            public int ExerciseId { get; set; }
            public string StudentEmail { get; set; } = string.Empty;
            public string StudentIssue { get; set; } = string.Empty;
            public string OriginalAIResponse { get; set; } = string.Empty;
            public string StudentCode { get; set; } = string.Empty; 
        }

        public class GeminiChatRequest
        {
            public int? SessionId { get; set; } 
            public string Message { get; set; } = string.Empty;
        }

        private string StripHTML(string input)
        {
            if (string.IsNullOrEmpty(input)) return string.Empty;
            string noHtml = Regex.Replace(input, "<.*?>", string.Empty);
            string decodedText = WebUtility.HtmlDecode(noHtml);
            return decodedText.Trim();
        }

        private string GetRandomApiKey()
        {
            var keysSection = _configuration.GetSection("GeminiApiKeys").GetChildren();
            var keys = keysSection.Select(x => x.Value).Where(x => !string.IsNullOrWhiteSpace(x)).ToList();

            if (keys.Count > 0)
            {
                int index = new Random().Next(keys.Count);
                return keys[index]!.Trim().Replace(" ", "");
            }

            string? singleKey = _configuration["GeminiApiKey"];
            if (!string.IsNullOrWhiteSpace(singleKey))
            {
                return singleKey.Trim().Replace(" ", "");
            }

            return string.Empty;
        }

        // =================================================================
        // API 1: PHÂN TÍCH LỖI VÀ CHAT VỚI AI (ĐÃ TÍCH HỢP RAG ĐƯỢC TỐI ƯU)
        // =================================================================
        [HttpPost("analyze")]
        public async Task<IActionResult> AnalyzeCode([FromBody] AIRequest request)
        {
            string apiKey = GetRandomApiKey();
            if (string.IsNullOrEmpty(apiKey))
            {
                return StatusCode(500, new { feedback = "Lỗi máy chủ: Chưa cấu hình danh sách Gemini API Keys." });
            }

            var lecturerHints = _context.AICorrections
                .Where(c => c.ExerciseId == request.ExerciseId && c.IsResolved == true && !string.IsNullOrEmpty(c.LecturerHint))
                .Select(c => c.LecturerHint)
                .ToList();

            string ragContext = "";
            if (lecturerHints.Count > 0)
            {
                ragContext = "\n\n🚨 [CÁC LƯU Ý TỪ CHUYÊN GIA / GIẢNG VIÊN - BẠN PHẢI TUÂN THỦ TUYỆT ĐỐI]:\n";
                foreach (var hint in lecturerHints)
                {
                    ragContext += $"- {hint}\n";
                }
            }

            string systemInstruction = $@"
Bạn là 'InnoX AI' - Trợ giảng lập trình tận tâm của hệ thống AI Learning Hub.
Nhiệm vụ của bạn là hỗ trợ sinh viên làm bài tập: '{request.ExerciseTitle}'.
Ngôn ngữ lập trình: {request.Language}.

QUY TẮC NGHIÊM NGẶT CỦA TRỢ GIẢNG:
1. ĐI THẲNG VÀO VẤN ĐỀ: Bắt đầu ngay lập tức vào việc phân tích hoặc gợi ý.
2. TUYỆT ĐỐI KHÔNG viết sẵn toàn bộ code giải bài. Chỉ đưa ra gợi ý (hint) và hướng tư duy.
3. Phân tích lỗi (nếu có: {request.ErrorOutput}) thật ngắn gọn, đi thẳng vào nguyên nhân cốt lõi.
4. Trình bày câu trả lời bằng Markdown ĐẸP MẮT.
5. Xưng hô là 'Mình' và gọi sinh viên là 'Bạn'. Luôn giữ thái độ thân thiện, khích lệ.
6. TỪ CHỐI trả lời mọi câu hỏi lạc đề (toán học, đời sống, nấu ăn...) và nhắc sinh viên quay lại việc code.
{ragContext} 
";

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

            var payload = new
            {
                systemInstruction = new { parts = new[] { new { text = systemInstruction } } },
                contents = new[] { new { parts = new[] { new { text = userPrompt } } } },
                generationConfig = new { temperature = 0.2 }
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            try
            {
                var uriBuilder = new UriBuilder("https", "generativelanguage.googleapis.com");
                uriBuilder.Path = "/v1beta/models/gemini-2.5-flash:streamGenerateContent";
                uriBuilder.Query = $"alt=sse&key={apiKey}";

                var requestMessage = new HttpRequestMessage(HttpMethod.Post, uriBuilder.Uri) { Content = content };
                
                using var response = await _httpClient.SendAsync(requestMessage, HttpCompletionOption.ResponseHeadersRead);

                if (!response.IsSuccessStatusCode)
                {
                    var responseString = await response.Content.ReadAsStringAsync();
                    return StatusCode((int)response.StatusCode, new { feedback = $"Lỗi từ Google Gemini: {responseString}" });
                }

                Response.ContentType = "text/event-stream";
                Response.Headers.Append("Cache-Control", "no-cache");
                Response.Headers.Append("Connection", "keep-alive");
                await Response.Body.FlushAsync();

                using var stream = await response.Content.ReadAsStreamAsync();
                using var reader = new StreamReader(stream);
            
                while (!reader.EndOfStream)
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
                        catch { /* Bỏ qua lỗi parsing */ }
                    }
                }

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

        // =================================================================
        // API 2: TẠO BÀI GIẢNG CHUẨN BỊ KIẾN THỨC
        // =================================================================
        [HttpPost("prerequisites")]
        public async Task<IActionResult> GetPrerequisites([FromBody] PrerequisiteRequest request)
        {
            string apiKey = GetRandomApiKey();
            if (string.IsNullOrEmpty(apiKey))
            {
                return StatusCode(500, new { feedback = "Lỗi máy chủ: Chưa cấu hình danh sách Gemini API Keys." });
            }

            string systemInstruction = @"Bạn là một chuyên gia lập trình. 
            Nhiệm vụ của bạn là liệt kê NGAY LẬP TỨC các kiến thức trọng tâm cần chuẩn bị cho bài tập. 
            Tuyệt đối KHÔNG chào hỏi, KHÔNG giới thiệu bản thân, KHÔNG viết lời mở đầu, KHÔNG viết lời kết luận.
            Chỉ sử dụng Markdown để trình bày ngắn gọn, đi thẳng vào vấn đề bằng các gạch đầu dòng và đoạn code ví dụ.";

            string userPrompt = $"Tên bài tập sắp làm: {request.ExerciseTitle}\n" +
                                $"Mô tả bài tập: {StripHTML(request.ExerciseDescription)}\n" +
                                $"Trình độ hiện tại của sinh viên: {request.StudentLevel}\n\n" +
                                $"Hãy soạn bài giảng chuẩn bị kiến thức cho mình.";

            var payload = new
            {
                systemInstruction = new { parts = new[] { new { text = systemInstruction } } },
                contents = new[] { new { parts = new[] { new { text = userPrompt } } } },
                generationConfig = new { temperature = 0.4 } 
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            try
            {
                var uriBuilder = new UriBuilder("https", "generativelanguage.googleapis.com");
                uriBuilder.Path = "/v1beta/models/gemini-2.5-flash:generateContent";
                uriBuilder.Query = $"key={apiKey}";

                var requestMessage = new HttpRequestMessage(HttpMethod.Post, uriBuilder.Uri) { Content = content };
                using var response = await _httpClient.SendAsync(requestMessage);

                string responseString = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    return StatusCode((int)response.StatusCode, new { feedback = $"Lỗi từ Google Gemini: {responseString}" });
                }

                using var doc = JsonDocument.Parse(responseString);
                var root = doc.RootElement;
                var textResult = root.GetProperty("candidates")[0]
                                     .GetProperty("content")
                                     .GetProperty("parts")[0]
                                     .GetProperty("text").GetString();

                return Ok(new { data = textResult });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { feedback = "Lỗi kết nối đến Google Gemini: " + ex.Message });
            }
        }

        // =================================================================
        // API 3: AI TỰ ĐỘNG TẠO BÀI TẬP VỚI "KHIÊN CHỐNG CRASH"
        // =================================================================
        [HttpPost("generate-exercise")]
        public async Task<IActionResult> GenerateExercise([FromBody] GenerateExerciseRequest request)
        {
            string apiKey = GetRandomApiKey();
            if (string.IsNullOrEmpty(apiKey))
            {
                return Ok(new { success = false, message = "Lỗi máy chủ: Chưa cấu hình danh sách Gemini API Keys." });
            }

            string preferredTopic = request.Topic;
            string adaptiveDifficulty = request.Difficulty;
            string aiDependencePrompt = "Không có lưu ý đặc biệt về mức độ hỗ trợ.";
            string bigOPrompt = "Không yêu cầu khắt khe về thời gian chạy (Time Limit).";
            string microSkillPrompt = "Hãy kiểm tra kiến thức tổng hợp của chủ đề này.";
            string speedPrompt = "Tạo các Test Case tiêu chuẩn.";

            try 
            {
                if (!string.IsNullOrEmpty(request.StudentEmail))
                {
                    var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.StudentEmail);
                    if (user != null)
                    {
                        var profile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.Email == request.StudentEmail);
                        if (profile != null && !string.IsNullOrWhiteSpace(profile.PreferredTopic))
                        {
                            preferredTopic = $"{request.Topic}, và HÃY LỒNG GHÉP CỐT TRUYỆN VỀ '{profile.PreferredTopic}' vào đề bài";
                        }

                        var sessionIds = await _context.GeminiSessions.Where(s => s.UserId == user.Id).Select(s => s.Id).ToListAsync();
                        int aiChatCount = await _context.GeminiMessages.CountAsync(m => m.Role == "user" && sessionIds.Contains(m.SessionId));
                        
                        if (aiChatCount > 30)
                        {
                            aiDependencePrompt = "⚠️ Báo động: Sinh viên này đang có dấu hiệu ỷ lại AI quá nhiều. YÊU CẦU: Hãy chia phần mô tả bài toán thành 3 bước nhỏ (Step-by-step) thật dễ hiểu để dắt tay chỉ việc, giúp họ tự tin làm bài mà không cần hỏi thêm.";
                        }

                        var recentSubmissions = await _context.Submissions
                            .Where(s => s.UserEmail == request.StudentEmail)
                            .OrderByDescending(s => s.SubmittedAt)
                            .Take(10).ToListAsync();

                        if (recentSubmissions.Any())
                        {
                            int failedCount = recentSubmissions.Count(s => s.Status != "Accepted");

                            if (failedCount > 7)
                            {
                                bigOPrompt = "⚠️ Cảnh báo: Sinh viên nộp bài sai quá nhiều lần. YÊU CẦU ĐẶC BIỆT: Hãy ép thời gian giới hạn (Time Limit) cực gắt (< 0.1s), và ra đề bài cấm tuyệt đối việc dùng 2 vòng lặp lồng nhau (O(n^2)) để buộc sinh viên phải suy nghĩ kĩ thuật toán trước khi nộp.";
                            }

                            if (failedCount >= 5 && failedCount <= 7)
                            {
                                microSkillPrompt = "⚠️ Sinh viên nộp bài sai khá nhiều ở các bài trước. YÊU CẦU: Tập trung kiểm tra kỹ năng xử lý Mảng (Array) và Ngoại lệ (Exception). Tạo 1 bài toán vá lỗi cơ bản.";
                                speedPrompt = "Hãy tạo các Test Case số lượng nhỏ, giá trị dương, dễ hiểu để sinh viên dễ dàng pass và lấy lại động lực.";
                            }
                            else if (failedCount == 0 && recentSubmissions.Count >= 5)
                            {
                                speedPrompt = "🔥 Sinh viên này đang có chuỗi làm bài xuất sắc. YÊU CẦU: Hãy tạo thêm 2 Test Case ẩn CỰC KHÓ (Edge cases: mảng rỗng, số âm, số siêu lớn) để bẫy và thử thách sự cẩn thận của họ.";
                            }
                        }
                    }
                }
            } 
            catch (Exception) 
            { 
                // Bỏ qua lỗi quét Database, AI vẫn sẽ đẻ ra bài tập theo thông số mặc định.
            }

            string systemInstruction = $@"
Bạn là một chuyên gia tạo đề thi lập trình AI Learning Hub CỰC KỲ SÁNG TẠO.
ĐÂY LÀ HỆ THỐNG THÍCH ỨNG SÂU (DEEP ADAPTIVE). BẠN PHẢI TUÂN THỦ NGHIÊM NGẶT HỒ SƠ NĂNG LỰC SAU:

- Ngôn ngữ: {request.Language}
- Chủ đề gốc: {request.Topic}
- Mức độ khó yêu cầu: {adaptiveDifficulty} (Bám sát mức độ này)

🔥 THÔNG TIN CÁ NHÂN HÓA DÀNH RIÊNG CHO SINH VIÊN NÀY (BẮT BUỘC ÁP DỤNG):
1. [Sở thích / Cốt truyện]: {preferredTopic}
2. [Điểm yếu kỹ năng]: {microSkillPrompt}
3. [Hiệu suất thuật toán]: {bigOPrompt}
4. [Tâm lý học tập]: {aiDependencePrompt}
5. [Thử thách Test Case]: {speedPrompt}

YÊU CẦU TỐI THƯỢNG: Trả về dữ liệu bằng đúng cấu trúc JSON sau đây:
{{
  ""Title"": ""Tên bài tập ngắn gọn, sáng tạo theo cốt truyện"",
  ""Description"": ""Mô tả chi tiết bài toán, lồng ghép cốt truyện thật hấp dẫn. Có ví dụ minh họa Input/Output rõ ràng."",
  ""Difficulty"": ""{adaptiveDifficulty}"",
  ""StarterCode"": ""Đoạn code template ban đầu (có sẵn hàm/class) bằng ngôn ngữ {request.Language} để sinh viên viết tiếp code vào đó"",
  ""TestCases"": [
    {{ ""Input"": ""Giá trị test"", ""ExpectedOutput"": ""Kết quả đúng"" }}
  ]
}}
Lưu ý: Sinh ra ít nhất 3 Test Cases để chấm điểm.";

            var payload = new
            {
                systemInstruction = new { parts = new[] { new { text = systemInstruction } } },
                contents = new[] { new { parts = new[] { new { text = $"Dựa vào 5 chỉ số năng lực của tôi, hãy tạo ra MỘT bài tập hoàn hảo, khớp 100% với trình độ của tôi ngay lúc này." } } } },
                generationConfig = new { 
                    temperature = 0.7,
                    responseMimeType = "application/json" 
                } 
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            try
            {
                var uriBuilder = new UriBuilder("https", "generativelanguage.googleapis.com");
                uriBuilder.Path = "/v1beta/models/gemini-2.5-flash:generateContent";
                uriBuilder.Query = $"key={apiKey}";

                var requestMessage = new HttpRequestMessage(HttpMethod.Post, uriBuilder.Uri) { Content = content };
                using var response = await _httpClient.SendAsync(requestMessage);

                string responseString = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    return Ok(new { success = false, message = $"AI đang bận quá tải, hãy thử lại nhé! (Mã lỗi: {response.StatusCode})" });
                }

                using var doc = JsonDocument.Parse(responseString);
                var root = doc.RootElement;
                string aiTextResponse = root.GetProperty("candidates")[0]
                                            .GetProperty("content")
                                            .GetProperty("parts")[0]
                                            .GetProperty("text").GetString() ?? "";

                string cleanJson = aiTextResponse.Trim();
                if (cleanJson.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
                {
                    cleanJson = cleanJson.Substring(7);
                }
                else if (cleanJson.StartsWith("```"))
                {
                    cleanJson = cleanJson.Substring(3);
                }
                if (cleanJson.EndsWith("```"))
                {
                    cleanJson = cleanJson.Substring(0, cleanJson.Length - 3);
                }
                cleanJson = cleanJson.Trim();

                GeneratedExerciseResponse generatedExercise;
                try 
                {
                    generatedExercise = JsonSerializer.Deserialize<GeneratedExerciseResponse>(cleanJson, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });
                }
                catch (JsonException)
                {
                    return Ok(new { success = false, message = "AI đang hơi lú lẫn trả về sai định dạng. Bạn chịu khó bấm Tạo Lại nha!" });
                }

                int fakeId = new Random().Next(1000, 9999); 

                return Ok(new 
                { 
                    success = true, 
                    message = "Tạo bài tập Adaptive thành công!",
                    exerciseId = fakeId, 
                    data = generatedExercise 
                });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = "Lỗi kết nối mạng: " + ex.Message });
            }
        }

        // =================================================================
        // API 4: SINH VIÊN BÁO CÁO LỖI AI (CẦN GIẢNG VIÊN HỖ TRỢ)
        // =================================================================
        [HttpPost("report-flag")]
        // [Authorize] // Nhớ mở comment dòng này nếu bạn đã setup JWT Auth đầy đủ
        public async Task<IActionResult> ReportAIFlag([FromBody] ReportFlagRequest request)
        {
            try
            {
                var user = _context.Users.FirstOrDefault(u => u.Email == request.StudentEmail);
                if (user == null) return Unauthorized(new { message = "Không tìm thấy người dùng. Bạn cần đăng nhập." });

                var newCorrection = new AICorrection
                {
                    ExerciseId = request.ExerciseId,
                    StudentId = user.Id, 
                    StudentIssue = request.StudentIssue,
                    OriginalAIResponse = request.OriginalAIResponse,
                    StudentCode = request.StudentCode, 
                    IsResolved = false, 
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };

                _context.AICorrections.Add(newCorrection);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Hệ thống đã ghi nhận! Giảng viên sẽ sớm xem xét và điều chỉnh." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        // =================================================================
        // API 5: LẤY DANH SÁCH THÔNG BÁO CỦA SINH VIÊN
        // =================================================================
        [HttpGet("my-notifications")]
        public async Task<IActionResult> GetMyNotifications([FromQuery] string email)
        {
            var user = _context.Users.FirstOrDefault(u => u.Email == email);
            if (user == null) return Unauthorized();

            var notifications = _context.AICorrections
                .Where(c => c.StudentId == user.Id && c.IsResolved == true)
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new {
                    c.Id,
                    c.ExerciseId,
                    ExerciseTitle = _context.Exercises.Where(e => e.Id == c.ExerciseId).Select(e => e.Title).FirstOrDefault() ?? ("Bài tập #" + c.ExerciseId),
                    c.IsRead,
                    c.CreatedAt,
                    LecturerName = _context.Users.Where(u => u.Id == c.LecturerId).Select(u => u.FullName ?? "Một giảng viên").FirstOrDefault()
                })
                .Take(10) // Lấy 10 thông báo gần nhất
                .ToList();

            return Ok(new { success = true, data = notifications });
        }

        // =================================================================
        // API 6: ĐÁNH DẤU ĐÃ ĐỌC THÔNG BÁO
        // =================================================================
        [HttpPost("mark-read/{id}")]
        public async Task<IActionResult> MarkNotificationAsRead(int id)
        {
            var correction = await _context.AICorrections.FindAsync(id);
            if (correction != null && !correction.IsRead)
            {
                correction.IsRead = true;
                await _context.SaveChangesAsync();
            }
            return Ok(new { success = true });
        }

        // =================================================================
        // API 7: LẤY LỊCH SỬ BÁO CÁO CỦA SINH VIÊN (CHO TAB GÓC THẮC MẮC)
        // =================================================================
        [HttpGet("my-reports")]
        public async Task<IActionResult> GetMyReports([FromQuery] string email)
        {
            var user = _context.Users.FirstOrDefault(u => u.Email == email);
            if (user == null) return Unauthorized();

            var reports = _context.AICorrections
                .Where(c => c.StudentId == user.Id)
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new {
                    c.Id,
                    c.ExerciseId,
                    ExerciseTitle = _context.Exercises.Where(e => e.Id == c.ExerciseId).Select(e => e.Title).FirstOrDefault() ?? ("Bài tập #" + c.ExerciseId),
                    c.StudentIssue,
                    c.OriginalAIResponse,
                    c.IsResolved, // Trạng thái: Đang chờ hay Đã giải quyết
                    c.LecturerHint, // Bí kíp
                    c.CreatedAt,
                    LecturerName = _context.Users.Where(u => u.Id == c.LecturerId).Select(u => u.FullName ?? "Một giảng viên").FirstOrDefault()
                })
                .ToList();

            return Ok(new { success = true, data = reports });
        }

        // =================================================================
        // API 8: TRỢ LÝ GEMINI CHAT (CÓ LƯU LỊCH SỬ VÀO DATABASE)
        // =================================================================
        [HttpPost("gemini-chat")]
        [Authorize(Roles = "Admin,Lecturer")]
        public async Task<IActionResult> GeminiChat([FromBody] GeminiChatRequest request)
        {
            try
            {
                var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                var claimNameId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var claimEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;

                if (string.IsNullOrEmpty(userRole))
                    return Unauthorized(new { success = false, message = "Không xác định được danh tính." });

                int userId = 0;
                if (int.TryParse(claimNameId, out int parsedId)) userId = parsedId;
                else 
                {
                    string emailToFind = claimEmail ?? claimNameId;
                    if (!string.IsNullOrEmpty(emailToFind))
                    {
                        var userDb = await _context.Users.FirstOrDefaultAsync(u => u.Email == emailToFind);
                        if (userDb != null) userId = userDb.Id;
                    }
                }

                // 1. Xử lý Session (Phiên chat)
                int currentSessionId = request.SessionId ?? 0;
                GeminiSession session;

                if (currentSessionId == 0)
                {
                    // Tạo phiên chat mới, lấy tối đa 30 ký tự đầu làm Tiêu đề
                    string title = request.Message.Length > 30 ? request.Message.Substring(0, 30) + "..." : request.Message;
                    session = new GeminiSession { UserId = userId, Title = title };
                    _context.GeminiSessions.Add(session);
                    await _context.SaveChangesAsync();
                    currentSessionId = session.Id;
                }
                else
                {
                    session = await _context.GeminiSessions.FindAsync(currentSessionId);
                    if (session == null || session.UserId != userId) return NotFound(new { success = false, message = "Không tìm thấy đoạn chat." });
                }

                // 2. Lưu tin nhắn của User vào DB
                var userMsg = new GeminiMessage { SessionId = currentSessionId, Role = "user", Content = request.Message };
                _context.GeminiMessages.Add(userMsg);
                await _context.SaveChangesAsync();

                // 3. Gọi AI xử lý (GeminiAssistantService)
                var reply = await _geminiService.ProcessGeminiChatAsync(userRole, userId, request.Message);

                // 4. Lưu tin nhắn của AI vào DB
                var aiMsg = new GeminiMessage { SessionId = currentSessionId, Role = "ai", Content = reply };
                _context.GeminiMessages.Add(aiMsg);
                
                session.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return Ok(new { success = true, reply = reply, sessionId = currentSessionId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // =================================================================
        // API 9: LẤY DANH SÁCH CÁC ĐOẠN CHAT (CỘT BÊN TRÁI)
        // =================================================================
        [HttpGet("gemini-sessions")]
        [Authorize(Roles = "Admin,Lecturer")]
        public async Task<IActionResult> GetGeminiSessions()
        {
            var claimNameId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var claimEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
            int userId = 0;
            if (int.TryParse(claimNameId, out int parsedId)) userId = parsedId;
            else 
            {
                var userDb = await _context.Users.FirstOrDefaultAsync(u => u.Email == (claimEmail ?? claimNameId));
                if (userDb != null) userId = userDb.Id;
            }

            var sessions = await _context.GeminiSessions
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.UpdatedAt)
                .Select(s => new { s.Id, s.Title, s.UpdatedAt })
                .ToListAsync();

            return Ok(new { success = true, data = sessions });
        }

        // =================================================================
        // API 10: LẤY CHI TIẾT TIN NHẮN TRONG 1 ĐOẠN CHAT (KHUNG BÊN PHẢI)
        // =================================================================
        [HttpGet("gemini-sessions/{id}/messages")]
        [Authorize(Roles = "Admin,Lecturer")]
        public async Task<IActionResult> GetSessionMessages(int id)
        {
            var messages = await _context.GeminiMessages
                .Where(m => m.SessionId == id)
                .OrderBy(m => m.CreatedAt)
                .Select(m => new { m.Id, m.Role, text = m.Content }) 
                .ToListAsync();

            return Ok(new { success = true, data = messages });
        }

        // =================================================================
        // API 11: XÓA ĐOẠN CHAT
        // =================================================================
        [HttpDelete("gemini-sessions/{id}")]
        [Authorize(Roles = "Admin,Lecturer")]
        public async Task<IActionResult> DeleteSession(int id)
        {
            var session = await _context.GeminiSessions.FindAsync(id);
            if (session != null)
            {
                _context.GeminiSessions.Remove(session);
                await _context.SaveChangesAsync();
            }
            return Ok(new { success = true });
        }
        
        // =================================================================
        // API 12: SINH MINDMAP TRỰC TIẾP TỪ TEXT (DÙNG CHO TRANG AI LESSON)
        // =================================================================
        public class DirectMindmapRequest
        {
            public string Content { get; set; } = string.Empty;
        }

        [HttpPost("generate-direct-mindmap")]
        public async Task<IActionResult> GenerateDirectMindmap([FromBody] DirectMindmapRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Content))
                return BadRequest(new { success = false, message = "Nội dung trống." });

            try
            {
                string mermaidCode = await _geminiService.GenerateLessonMindmapAsync("Tóm tắt bài giảng AI", request.Content);
                
                return Ok(new { success = true, mindmapCode = mermaidCode });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi sinh Mindmap: " + ex.Message });
            }
        }

        // =================================================================
        // 🌟 API 13: KỸ NĂNG 4 - AI SOI CHUẨN BIG-O (PHÂN TÍCH HIỆU SUẤT)
        // =================================================================
        public class BigORequest
        {
            public string UserEmail { get; set; } = string.Empty;
            public int ExerciseId { get; set; }
        }

        [HttpPost("analyze-big-o")]
        [Authorize]
        public async Task<IActionResult> AnalyzeBigO([FromBody] BigORequest request)
        {
            string apiKey = GetRandomApiKey();
            if (string.IsNullOrEmpty(apiKey))
                return StatusCode(500, new { success = false, message = "Chưa cấu hình API Key." });

            try
            {
                // 1. Mò vào Database, tìm bài nộp "Accepted" mới nhất của sinh viên này
                var latestSubmission = await _context.Submissions
                    .Where(s => s.UserEmail == request.UserEmail && s.ExerciseId == request.ExerciseId && s.Status == "Accepted")
                    .OrderByDescending(s => s.SubmittedAt)
                    .FirstOrDefaultAsync();

                if (latestSubmission == null)
                {
                    return Ok(new { success = false, message = "Bạn cần nộp bài và đạt 'Accepted' trước khi nhờ AI chấm chuẩn Big-O." });
                }

                // 2. Đóng gói mã nguồn và thông số ExecutionTime, MemoryUsage để gửi cho AI
                string systemPrompt = @"Bạn là Giám Khảo Thuật Toán Khắt Khe. 
                Nhiệm vụ của bạn là nhận mã nguồn của sinh viên (đã chạy đúng kết quả) kèm theo thời gian chạy (ExecutionTime) và bộ nhớ (MemoryUsage).
                Hãy phân tích:
                1. Độ phức tạp thời gian (Big-O Time Complexity) của đoạn code là gì? (VD: O(N), O(N^2)).
                2. Độ phức tạp không gian (Big-O Space Complexity) là gì?
                3. Đưa ra 1 gợi ý NGẮN GỌN để tối ưu thuật toán (VD: Nên dùng Hash Map thay vì Vòng lặp lồng nhau).
                
                Trả lời ngắn gọn, format Markdown, nhấn mạnh vào các chỉ số Big-O.";

                string userPrompt = $@"
                Ngôn ngữ: {latestSubmission.Language}
                Thời gian chạy thực tế (Max Test Case): {latestSubmission.ExecutionTime} ms
                Bộ nhớ tiêu thụ ước tính: {latestSubmission.MemoryUsage} KB
                
                Mã nguồn của tôi:
                ```
                {latestSubmission.Code}
                ```
                Hãy soi chuẩn Big-O giúp tôi!";

                var payload = new
                {
                    systemInstruction = new { parts = new[] { new { text = systemPrompt } } },
                    contents = new[] { new { parts = new[] { new { text = userPrompt } } } },
                    generationConfig = new { temperature = 0.3 } 
                };

                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var uriBuilder = new UriBuilder("https", "generativelanguage.googleapis.com");
                uriBuilder.Path = "/v1beta/models/gemini-2.5-flash:generateContent";
                uriBuilder.Query = $"key={apiKey}";

                var requestMessage = new HttpRequestMessage(HttpMethod.Post, uriBuilder.Uri) { Content = content };
                using var response = await _httpClient.SendAsync(requestMessage);

                if (!response.IsSuccessStatusCode)
                    return StatusCode((int)response.StatusCode, new { success = false, message = "AI đang bận, vui lòng thử lại sau." });

                string responseString = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(responseString);
                var root = doc.RootElement;
                string aiTextResponse = root.GetProperty("candidates")[0]
                                            .GetProperty("content")
                                            .GetProperty("parts")[0]
                                            .GetProperty("text").GetString() ?? "";

                return Ok(new { success = true, report = aiTextResponse });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }
    }
}