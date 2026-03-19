using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Net;
using System.IO; 
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Linq; // 💡 ĐÃ BỔ SUNG LINQ CHO HÀM XOAY VÒNG KEY

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

        private string StripHTML(string input)
        {
            if (string.IsNullOrEmpty(input)) return string.Empty;
            string noHtml = Regex.Replace(input, "<.*?>", string.Empty);
            string decodedText = WebUtility.HtmlDecode(noHtml);
            return decodedText.Trim();
        }

        // =================================================================
        // 💡 HÀM BÍ MẬT: TỰ ĐỘNG CHỌN NGẪU NHIÊN 1 API KEY TỪ APPSETTINGS
        // =================================================================
        private string GetRandomApiKey()
        {
            // Lấy danh sách Keys từ mảng cấu hình mới
            var keysSection = _configuration.GetSection("GeminiApiKeys").GetChildren();
            var keys = keysSection.Select(x => x.Value).Where(x => !string.IsNullOrWhiteSpace(x)).ToList();

            if (keys.Count > 0)
            {
                // Chọn ngẫu nhiên 1 cái để san sẻ tải trọng (Load Balancing)
                int index = new Random().Next(keys.Count);
                return keys[index]!.Trim().Replace(" ", "");
            }

            // Phòng hờ lỡ bạn chưa sửa tên biến bên appsettings, nó vẫn đọc biến cũ
            string? singleKey = _configuration["GeminiApiKey"];
            if (!string.IsNullOrWhiteSpace(singleKey))
            {
                return singleKey.Trim().Replace(" ", "");
            }

            return string.Empty;
        }


        // =================================================================
        // API 1: PHÂN TÍCH LỖI VÀ CHAT VỚI AI
        // =================================================================
        [HttpPost("analyze")]
        public async Task<IActionResult> AnalyzeCode([FromBody] AIRequest request)
        {
            // 💡 SỬ DỤNG HÀM BỐC THĂM KEY
            string apiKey = GetRandomApiKey();
            if (string.IsNullOrEmpty(apiKey))
            {
                return StatusCode(500, new { feedback = "Lỗi máy chủ: Chưa cấu hình danh sách Gemini API Keys." });
            }

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
            // 💡 SỬ DỤNG HÀM BỐC THĂM KEY
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
            // 💡 SỬ DỤNG HÀM BỐC THĂM KEY
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
    }
}