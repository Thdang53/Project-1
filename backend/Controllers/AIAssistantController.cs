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
using Microsoft.EntityFrameworkCore; // Thêm dòng này để hỗ trợ các lệnh Async DB
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
        
        // Tiêm (Inject) thêm Bộ Não Gemini vào đây
        private readonly backend.Services.GeminiAssistantService _geminiService;

        public AIAssistantController(HttpClient httpClient, IConfiguration configuration, AppDbContext context, backend.Services.GeminiAssistantService geminiService)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _context = context; 
            _geminiService = geminiService; // Khởi tạo Service
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

        // Model mới cho Trợ lý Gemini Chat (Đã có thêm SessionId)
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
        // API 1: PHÂN TÍCH LỖI VÀ CHAT VỚI AI (ĐÃ TÍCH HỢP RAG)
        // =================================================================
        [HttpPost("analyze")]
        public async Task<IActionResult> AnalyzeCode([FromBody] AIRequest request)
        {
            string apiKey = GetRandomApiKey();
            if (string.IsNullOrEmpty(apiKey))
            {
                return StatusCode(500, new { feedback = "Lỗi máy chủ: Chưa cấu hình danh sách Gemini API Keys." });
            }

            // ==============================================================================
            // 🌟 PHÉP THUẬT RAG Ở ĐÂY: LẤY "BÍ KÍP" TỪ GIẢNG VIÊN TRONG DATABASE
            // ==============================================================================
            var lecturerHints = _context.AICorrections
                .Where(c => c.IsResolved == true && !string.IsNullOrEmpty(c.LecturerHint))
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
            // ==============================================================================

            string systemInstruction = $@"
Bạn là 'InnoX AI' - Trợ giảng lập trình tận tâm của hệ thống AI Learning Hub.
Nhiệm vụ của bạn là hỗ trợ sinh viên làm bài tập: '{request.ExerciseTitle}'.
Ngôn ngữ lập trình: {request.Language}.

QUY TẮC NGHIÊM NGẶT CỦA TRỢ GIẢNG:
1. ĐI THẲNG VÀO VẤN ĐỀ: TUYỆT ĐỐI KHÔNG dùng các câu chào hỏi (như 'Chào bạn', 'Xin chào', 'Dạ'). KHÔNG nói các câu rườm rà ở đầu và cuối. Bắt đầu ngay lập tức vào việc phân tích hoặc gợi ý.
2. TUYỆT ĐỐI KHÔNG viết sẵn toàn bộ code giải bài. Nếu sinh viên yêu cầu giải giùm, hãy từ chối khéo léo. Chỉ đưa ra gợi ý (hint) và hướng tư duy.
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
        // API 3: AI TỰ ĐỘNG TẠO BÀI TẬP VÀ TEST CASES CHUẨN JSON
        // =================================================================
        [HttpPost("generate-exercise")]
        public async Task<IActionResult> GenerateExercise([FromBody] GenerateExerciseRequest request)
        {
            string apiKey = GetRandomApiKey();
            if (string.IsNullOrEmpty(apiKey))
            {
                return StatusCode(500, new { message = "Lỗi máy chủ: Chưa cấu hình danh sách Gemini API Keys." });
            }

            string systemInstruction = $@"
Bạn là một chuyên gia tạo đề thi lập trình CỰC KỲ SÁNG TẠO.
Hãy tạo MỘT bài tập HOÀN TOÀN MỚI, ĐỘC ĐÁO VÀ CÓ TÍNH ỨNG DỤNG THỰC TẾ dựa trên yêu cầu sau.
⚠️ TUYỆT ĐỐI KHÔNG tạo lại các bài tập nhàm chán như: Nhập tên tuổi in ra lời chào, tính tổng 2 số, hay Hello World. Hãy nghĩ ra một kịch bản thú vị hơn!

- Ngôn ngữ: {request.Language}
- Chủ đề: {request.Topic}
- Độ khó: {request.Difficulty}

YÊU CẦU TỐI THƯỢNG: Trả về dữ liệu bằng cấu trúc JSON sau đây:
{{
  ""Title"": ""Tên bài tập ngắn gọn, sáng tạo"",
  ""Description"": ""Mô tả chi tiết bài toán, yêu cầu rõ ràng được lồng ghép vào một câu chuyện hoặc tình huống thực tế. Có ví dụ minh họa Input/Output."",
  ""Difficulty"": ""{request.Difficulty}"",
  ""StarterCode"": ""Đoạn code template ban đầu (có sẵn hàm/class) bằng ngôn ngữ {request.Language} để sinh viên viết tiếp code vào đó"",
  ""TestCases"": [
    {{ ""Input"": ""Giá trị test"", ""ExpectedOutput"": ""Kết quả đúng"" }}
  ]
}}
Lưu ý: Sinh ra ít nhất 3 Test Cases để chấm điểm.";

            var payload = new
            {
                systemInstruction = new { parts = new[] { new { text = systemInstruction } } },
                contents = new[] { new { parts = new[] { new { text = $"Hãy sáng tạo một bài tập thật độc đáo về chủ đề '{request.Topic}' bằng ngôn ngữ {request.Language} ngay bây giờ." } } } },
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
                    return StatusCode((int)response.StatusCode, new { message = $"Lỗi từ Google Gemini: {responseString}" });
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
                    return StatusCode(500, new { message = "AI trả về dữ liệu không đúng chuẩn JSON.", rawOutput = aiTextResponse });
                }

                int fakeId = new Random().Next(1000, 9999); 

                return Ok(new 
                { 
                    success = true, 
                    message = "Tạo bài tập thành công!",
                    exerciseId = fakeId, 
                    data = generatedExercise 
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
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

            // Lấy các báo cáo ĐÃ ĐƯỢC GIẢNG VIÊN DUYỆT (IsResolved = true) của sinh viên này
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
    }
}