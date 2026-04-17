using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using backend.Data;
using backend.Models;

namespace backend.Services
{
    public class AcademicAdvisorService
    {
        private readonly AppDbContext _context;
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public AcademicAdvisorService(AppDbContext context, HttpClient httpClient, IConfiguration configuration)
        {
            _context = context;
            _httpClient = httpClient;
            _configuration = configuration;
        }

        private string GetRandomApiKey()
        {
            var keys = _configuration.GetSection("GeminiApiKeys").GetChildren().Select(x => x.Value).Where(x => !string.IsNullOrWhiteSpace(x)).ToList();
            if (keys.Count > 0) return keys[new Random().Next(keys.Count)]!.Trim().Replace(" ", "");
            return _configuration["GeminiApiKey"]?.Trim().Replace(" ", "") ?? string.Empty;
        }

        // =================================================================================
        // 🌟 BỘ LỌC THÉP: XỬ LÝ GỌI API AN TOÀN VÀ TỰ ĐỘNG RETRY KHI GOOGLE QUÁ TẢI
        // =================================================================================
        private async Task<JsonElement> CallGeminiApiAsync(string apiKey, object payload)
        {
            var uriBuilder = new UriBuilder("https", "generativelanguage.googleapis.com")
            {
                Path = "/v1beta/models/gemini-2.5-flash:generateContent",
                Query = $"key={apiKey}"
            };

            var contentStr = JsonSerializer.Serialize(payload);
            int maxRetries = 3; 
            
            for (int i = 0; i < maxRetries; i++)
            {
                var content = new StringContent(contentStr, Encoding.UTF8, "application/json");
                var request = new HttpRequestMessage(HttpMethod.Post, uriBuilder.Uri) { Content = content };
                var response = await _httpClient.SendAsync(request);
                
                if (response.IsSuccessStatusCode)
                {
                    var responseString = await response.Content.ReadAsStringAsync();
                    return JsonDocument.Parse(responseString).RootElement;
                }

                if (response.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable || 
                    response.StatusCode == System.Net.HttpStatusCode.TooManyRequests ||
                    (int)response.StatusCode == 500)
                {
                    if (i == maxRetries - 1) 
                    {
                        string errorDetail = await response.Content.ReadAsStringAsync();
                        throw new Exception($"Google AI đang quá tải (Lỗi {(int)response.StatusCode}). Vui lòng đợi 10 giây rồi thử lại!");
                    }
                    await Task.Delay(2000 * (i + 1));
                    continue; 
                }

                string fatalError = await response.Content.ReadAsStringAsync();
                throw new Exception($"Lỗi {response.StatusCode} từ Google: {fatalError}");
            }

            throw new Exception("Lỗi không xác định khi kết nối Google AI.");
        }

        public class AIIntent
        {
            [JsonPropertyName("action")]
            public string Action { get; set; } = "general_chat";
            [JsonPropertyName("parameters")]
            public IntentParams Parameters { get; set; } = new();
        }

        public class IntentParams
        {
            [JsonPropertyName("quantity")]
            public int Quantity { get; set; } = 1;
            [JsonPropertyName("topic")]
            public string Topic { get; set; } = "Cơ bản";
            [JsonPropertyName("difficulty")]
            public string Difficulty { get; set; } = "Trung bình";
            [JsonPropertyName("target_student")]
            public string TargetStudent { get; set; } = "";
        }

        // =================================================================================
        // GIAI ĐOẠN 2: BỘ ĐIỀU PHỐI (THE ROUTER) 
        // =================================================================================
        public async Task<string> ProcessAdvisorChatAsync(int lecturerId, int classId, string message)
        {
            try
            {
                string apiKey = GetRandomApiKey();
                if (string.IsNullOrEmpty(apiKey)) return "⚠️ Lỗi: Chưa cấu hình Gemini API Key.";

                var targetClass = await _context.Classes.FirstOrDefaultAsync(c => c.Id == classId);
                string className = targetClass != null ? targetClass.ClassName : $"Lớp học ID {classId}";
                
                string msgLower = message.ToLower();
                AIIntent intent = new AIIntent();

                // -------------------------------------------------------------------------
                // NHỊP 1: BÓC TÁCH Ý ĐỊNH BẰNG JSON (ROUTER PHASE)
                // -------------------------------------------------------------------------
                if (message.StartsWith("[LỆNH HỆ THỐNG"))
                {
                    if (message.Contains("CẢNH BÁO")) intent.Action = "identify_risk";
                    else if (message.Contains("VÁ LỖI")) intent.Action = "create_exercises";
                    else intent.Action = "analyze_errors";
                }
                else
                {
                    string routerPrompt = $@"
                    Bạn là một AI Router. Đọc câu của Giảng viên và bóc tách yêu cầu.
                    BẮT BUỘC TRẢ VỀ CHUẨN JSON, KHÔNG DÙNG MARKDOWN:
                    {{ ""action"": """", ""parameters"": {{ ""quantity"": 1, ""topic"": """", ""difficulty"": """", ""target_student"": """" }} }}
                    
                    Các action:
                    - 'create_exercises': Tạo bài tập. Lấy số lượng (quantity), chủ đề (topic), độ khó (difficulty).
                    - 'check_progress': Tiến độ làm bài, tình hình lớp, lười học. Lấy tên/email (target_student).
                    - 'analyze_errors': Lớp sai ở đâu, phân tích lỗi.
                    - 'identify_risk': Tìm sinh viên lười, nộp sai nhiều, cá biệt.
                    - 'general_chat': Chat bình thường.

                    Câu hỏi: '{message}'";

                    var routerPayload = new {
                        contents = new[] { new { role = "user", parts = new[] { new { text = routerPrompt } } } },
                        generationConfig = new { temperature = 0.1 } 
                    };

                    try 
                    {
                        var routerRoot = await CallGeminiApiAsync(apiKey, routerPayload);
                        string jsonIntent = routerRoot.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString() ?? "{}";
                        
                        string cleanJson = jsonIntent.Trim();
                        if (cleanJson.StartsWith("```json", StringComparison.OrdinalIgnoreCase)) cleanJson = cleanJson.Substring(7);
                        else if (cleanJson.StartsWith("```")) cleanJson = cleanJson.Substring(3);
                        if (cleanJson.EndsWith("```")) cleanJson = cleanJson.Substring(0, cleanJson.Length - 3);
                        cleanJson = cleanJson.Trim();

                        intent = JsonSerializer.Deserialize<AIIntent>(cleanJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new AIIntent(); 
                        if (intent.Parameters == null) intent.Parameters = new IntentParams();
                    }
                    catch 
                    { 
                        intent.Action = "general_chat"; 
                    }

                    // LỚP BẢO HIỂM HYBRID TỪ KHÓA
                    if (intent.Action == "general_chat" || string.IsNullOrEmpty(intent.Action))
                    {
                        if (msgLower.Contains("tiến độ") || msgLower.Contains("tình hình") || msgLower.Contains("lười") || msgLower.Contains("báo cáo"))
                            intent.Action = "check_progress";
                        else if (msgLower.Contains("tạo bài") || msgLower.Contains("giao bài") || msgLower.Contains("vá lỗi"))
                            intent.Action = "create_exercises";
                        else if (msgLower.Contains("phân tích") || msgLower.Contains("lỗi") || msgLower.Contains("sai"))
                            intent.Action = "analyze_errors";
                        else if (msgLower.Contains("cá biệt") || msgLower.Contains("nguy cơ") || msgLower.Contains("rớt môn"))
                            intent.Action = "identify_risk";
                    }
                }

                // -------------------------------------------------------------------------
                // GỌI TOOL TƯƠNG ỨNG TRONG C#
                // -------------------------------------------------------------------------
                string rawDataFromDb = "";
                switch (intent.Action)
                {
                    case "create_exercises":
                        int lessonId = await _context.Lessons.OrderByDescending(l => l.Id).Select(l => l.Id).FirstOrDefaultAsync();
                        if (lessonId == 0) lessonId = 1;
                        rawDataFromDb = await Tool_CreateExercises(classId, lessonId, intent.Parameters.Quantity, intent.Parameters.Topic, intent.Parameters.Difficulty);
                        break;
                    
                    case "check_progress":
                        rawDataFromDb = await Tool_CheckClassProgress(classId, intent.Parameters.TargetStudent);
                        break;
                    
                    case "analyze_errors":
                        rawDataFromDb = await Tool_AnalyzeClassErrors(classId);
                        break;

                    case "identify_risk":
                        rawDataFromDb = await Tool_IdentifyAtRiskStudents(classId);
                        break;
                        
                    default:
                        rawDataFromDb = "Chưa có dữ liệu thống kê nào được truy xuất. Hãy dùng kiến thức sư phạm của bạn để trả lời.";
                        break;
                }

                // -------------------------------------------------------------------------
                // NHỊP 2: TỔNG HỢP VÀ TRẢ LỜI TỰ NHIÊN
                // -------------------------------------------------------------------------
                string systemInstruction = $@"Bạn là 'Trợ lý Cố vấn Học thuật AI' của nền tảng AI Learning Hub. 
                THÔNG TIN QUAN TRỌNG: Bạn đang hỗ trợ tư vấn cho lớp học có tên là '{className}'.
                
                Nhiệm vụ: Đọc DỮ LIỆU THỐNG KÊ TỪ DATABASE và trả lời Giảng viên một cách tự nhiên, chuyên nghiệp (xưng 'Em', gọi 'Thầy/Cô').
                Tuyệt đối không để lộ đoạn JSON hoặc cấu trúc dữ liệu thô. Nếu số liệu cho thấy lớp đang yếu, hãy đề xuất giao bài tập vá lỗi.";

                string finalPrompt = $"[CÂU HỎI CỦA GIẢNG VIÊN]: {message}\n\n[DỮ LIỆU TỪ HỆ THỐNG]:\n{rawDataFromDb}";

                var chatPayload = new {
                    system_instruction = new { parts = new[] { new { text = systemInstruction } } },
                    contents = new[] { new { role = "user", parts = new[] { new { text = finalPrompt } } } },
                    generationConfig = new { temperature = 0.5 }
                };

                try
                {
                    var chatRoot = await CallGeminiApiAsync(apiKey, chatPayload);
                    return chatRoot.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString() ?? "";
                }
                catch (Exception ex)
                {
                    return $"⚠️ Lỗi khi AI tổng hợp câu trả lời: {ex.Message}";
                }
            }
            catch (Exception ex)
            {
                return $"Đã xảy ra lỗi hệ thống AI Agent: {ex.Message}";
            }
        }

        // =================================================================
        // GIAI ĐOẠN 3: CÁC KỸ NĂNG (TOOLS) 
        // =================================================================

        private async Task<string> Tool_CheckClassProgress(int classId, string targetStudent)
        {
            var students = await (from cs in _context.ClassStudents
                                  join u in _context.Users on cs.StudentId equals u.Id
                                  where cs.ClassId == classId
                                  select new { u.Email, u.FullName }).ToListAsync();
            
            if (!students.Any()) return "Lớp này chưa có sinh viên nào tham gia.";

            // 🌟 ĐÃ FIX LỖI "WITH" CỦA SQL BẰNG CÁCH JOIN TRỰC TIẾP TRÊN DATABASE
            var allSubmissions = await (from cs in _context.ClassStudents
                                        join u in _context.Users on cs.StudentId equals u.Id
                                        join s in _context.Submissions on u.Email equals s.UserEmail
                                        where cs.ClassId == classId
                                        select s).ToListAsync();

            if (!string.IsNullOrWhiteSpace(targetStudent))
            {
                var target = students.FirstOrDefault(s => s.FullName.ToLower().Contains(targetStudent.ToLower()) || s.Email.ToLower().Contains(targetStudent.ToLower()));
                if (target == null) return $"Không tìm thấy sinh viên nào tên '{targetStudent}' trong lớp.";
                
                var stdSubs = allSubmissions.Where(s => s.UserEmail == target.Email).ToList();
                int passed = stdSubs.Count(s => s.Status == "Accepted");
                int failed = stdSubs.Count(s => s.Status != "Accepted");
                return $"Tiến độ của {target.FullName} ({target.Email}): Đã nộp {stdSubs.Count} lần. Pass: {passed}. Bị lỗi: {failed}.";
            }

            int totalStudents = students.Count;
            int activeStudents = allSubmissions.Select(s => s.UserEmail).Distinct().Count();
            int inactiveStudents = totalStudents - activeStudents;
            int totalAccepted = allSubmissions.Count(s => s.Status == "Accepted");

            return $"Sĩ số: {totalStudents}. Số sinh viên ĐÃ LÀM BÀI: {activeStudents}. Số sinh viên LƯỜI (chưa làm gì): {inactiveStudents}. Tổng lượt Pass: {totalAccepted}.";
        }

        private async Task<string> Tool_AnalyzeClassErrors(int classId)
        {
            var recentFails = await (from cs in _context.ClassStudents
                                     join u in _context.Users on cs.StudentId equals u.Id
                                     join s in _context.Submissions on u.Email equals s.UserEmail
                                     where cs.ClassId == classId && s.Status != "Accepted"
                                     select s).ToListAsync();

            if (!recentFails.Any()) return "Lớp học rất xuất sắc, 100% bài nộp gần đây đều Pass!";

            var stats = recentFails.GroupBy(s => s.ExerciseId).Select(g => new { ExId = g.Key, Fails = g.Count() }).OrderByDescending(x => x.Fails).Take(3).ToList();
            
            string report = "Phân tích Lỗ hổng:\n";
            foreach (var s in stats)
            {
                var title = await _context.Exercises.Where(e => e.Id == s.ExId).Select(e => e.Title).FirstOrDefaultAsync();
                report += $"- Bài tập '{title}': Bị nộp sai {s.Fails} lần.\n";
            }
            return report;
        }

        private async Task<string> Tool_IdentifyAtRiskStudents(int classId)
        {
            var failSubmissions = await (from cs in _context.ClassStudents
                                         join u in _context.Users on cs.StudentId equals u.Id
                                         join s in _context.Submissions on u.Email equals s.UserEmail
                                         where cs.ClassId == classId && s.Status != "Accepted"
                                         select s).ToListAsync();

            var riskStudents = failSubmissions
                .GroupBy(s => s.UserEmail)
                .Where(g => g.Count() >= 5)
                .Select(g => new { Email = g.Key, Fails = g.Count() })
                .ToList();

            if (!riskStudents.Any()) return "Không phát hiện sinh viên nào có dấu hiệu nộp sai quá nhiều.";

            string report = "Danh sách sinh viên CÓ NGUY CƠ ĐUỐI SỨC:\n";
            foreach (var s in riskStudents) report += $"- Email: {s.Email} (Đã nộp sai {s.Fails} lần).\n";
            return report;
        }

        private async Task<string> Tool_CreateExercises(int classId, int lessonId, int quantity, string topic, string difficulty)
        {
            if (quantity <= 0) quantity = 1;
            if (quantity > 3) quantity = 3; 

            string apiKey = GetRandomApiKey();
            if (string.IsNullOrEmpty(apiKey)) return "Lỗi: Không tìm thấy API Key.";

            string prompt = $@"
            Tạo {quantity} bài tập lập trình khác biệt nhau về chủ đề '{topic}', độ khó '{difficulty}'.
            Trả về đúng định dạng MẢNG JSON chuẩn: 
            [
              {{ ""Title"": """", ""Description"": """", ""Difficulty"": ""{difficulty}"", ""StarterCode"": """", ""TestCases"": [ {{ ""Input"": """", ""ExpectedOutput"": """" }} ] }}
            ]";

            var payload = new { 
                system_instruction = new { parts = new[] { new { text = prompt } } }, 
                contents = new[] { new { role = "user", parts = new[] { new { text = "Tạo JSON bài tập" } } } }, 
                generationConfig = new { responseMimeType = "application/json" } 
            };

            try
            {
                var root = await CallGeminiApiAsync(apiKey, payload);
                string jsonOutput = root.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString() ?? "[]";

                string cleanJson = jsonOutput.Trim();
                if (cleanJson.StartsWith("```json", StringComparison.OrdinalIgnoreCase)) cleanJson = cleanJson.Substring(7);
                else if (cleanJson.StartsWith("```")) cleanJson = cleanJson.Substring(3);
                if (cleanJson.EndsWith("```")) cleanJson = cleanJson.Substring(0, cleanJson.Length - 3);

                var generatedExs = JsonSerializer.Deserialize<List<GeneratedExerciseResponse>>(cleanJson.Trim(), new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                
                if (generatedExs == null || !generatedExs.Any()) return "Lỗi: AI không sinh được dữ liệu JSON hợp lệ.";

                List<string> titles = new();
                foreach (var ex in generatedExs)
                {
                    var newEx = new Exercise {
                        LessonId = lessonId, ClassId = classId, Title = $"[AI] {ex.Title}", Description = ex.Description,
                        Difficulty = ex.Difficulty, StarterCode = ex.StarterCode, TestCases = JsonSerializer.Serialize(ex.TestCases)
                    };
                    _context.Exercises.Add(newEx);
                    titles.Add(newEx.Title);
                }
                await _context.SaveChangesAsync();

                return $"Tuyệt vời! Em đã TẠO VÀ LƯU VÀO DATABASE THÀNH CÔNG {titles.Count} bài tập: {string.Join(" | ", titles)}.";
            }
            catch (Exception ex)
            { 
                return $"Đã có lỗi xảy ra khi yêu cầu AI tạo {quantity} bài tập: {ex.Message}"; 
            }
        }

        public class GeneratedExerciseResponse { public string Title { get; set; } = ""; public string Description { get; set; } = ""; public string Difficulty { get; set; } = ""; public string StarterCode { get; set; } = ""; public List<GeneratedTestCase> TestCases { get; set; } = new(); }
        public class GeneratedTestCase { public string Input { get; set; } = ""; public string ExpectedOutput { get; set; } = ""; }
    }
}