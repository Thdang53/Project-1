using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
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
        // HÀM LÕI CỦA AGENT: NHẬN CHAT -> PHÂN TÍCH Ý ĐỊNH -> GỌI TOOL C# -> TRẢ LỜI
        // =================================================================================
        public async Task<string> ProcessAdvisorChatAsync(int lecturerId, int classId, string message)
        {
            try
            {
                string msgLower = message.ToLower();
                string rawDataFromDb = "";
                string actionTaken = "GeneralChat";

                // 1. Quét Radar (Ưu tiên cao nhất)
                if (message.StartsWith("[LỆNH HỆ THỐNG"))
                {
                    actionTaken = "SystemRadarScan";
                    rawDataFromDb = "Dữ liệu đã được Controller đính kèm vào message.";
                }
                // 2. 🌟 SỬA LỖI TỪ KHÓA: Đưa lệnh "Tạo bài / Giao bài / Vá lỗi" lên xét trước
                else if (msgLower.Contains("tạo bài") || msgLower.Contains("giao bài") || msgLower.Contains("vá lỗi"))
                {
                    actionTaken = "CreateExercise";
                    int defaultLessonId = await _context.Lessons.OrderByDescending(l => l.Id).Select(l => l.Id).FirstOrDefaultAsync();
                    if (defaultLessonId == 0) defaultLessonId = 1;
                    
                    rawDataFromDb = await Tool_CreateExerciseForClass(classId, defaultLessonId, message);
                }
                // 3. Radar sinh viên cá biệt
                else if (msgLower.Contains("cá biệt") || msgLower.Contains("nguy cơ") || msgLower.Contains("bỏ cuộc") || msgLower.Contains("cảnh báo"))
                {
                    actionTaken = "IdentifyAtRiskStudents";
                    rawDataFromDb = await Tool_IdentifyAtRiskStudents(classId);
                }
                // 4. Bắt mạch lỗi lớp học (Phải để xuống cuối)
                else if (msgLower.Contains("lỗi") || msgLower.Contains("sai") || msgLower.Contains("yếu") || msgLower.Contains("phân tích"))
                {
                    actionTaken = "AnalyzeClassErrors";
                    rawDataFromDb = await Tool_AnalyzeClassErrors(classId);
                }
                // 5. Chat bình thường
                else
                {
                    rawDataFromDb = "Không có dữ liệu hệ thống nào được truy xuất. Hãy trả lời câu hỏi của giảng viên bằng chuyên môn sư phạm của bạn.";
                }

                string apiKey = GetRandomApiKey();
                string systemInstruction = @"Bạn là 'Trợ lý Cố vấn Học thuật AI' túc trực hỗ trợ Giảng viên. 
                Bạn sẽ nhận được 'DỮ LIỆU THÔ TỪ DATABASE CỦA HỆ THỐNG'. Nhiệm vụ của bạn là:
                1. Đóng vai một trợ lý ngoan ngoãn, chuyên nghiệp, gọi người dùng là 'Thầy/Cô'.
                2. Đọc hiểu dữ liệu thô và biến nó thành một báo cáo đẹp mắt, có gạch đầu dòng, icon sinh động.
                3. Đưa ra 1 lời khuyên sư phạm (VD: Thầy cô nên nhắc nhở lớp, hoặc để em soạn bài tập bù).
                Tuyệt đối không để lộ cấu trúc dữ liệu thô ra ngoài.";

                string finalPrompt = $"[CÂU HỎI CỦA GIẢNG VIÊN]: {message}\n\n[DỮ LIỆU THÔ TỪ HỆ THỐNG ({actionTaken})]:\n{rawDataFromDb}";

                var payload = new {
                    systemInstruction = new { parts = new[] { new { text = systemInstruction } } },
                    contents = new[] { new { parts = new[] { new { text = finalPrompt } } } },
                    generationConfig = new { temperature = 0.4 }
                };

                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.SendAsync(new HttpRequestMessage(HttpMethod.Post, $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}") { Content = content });
                
                if (!response.IsSuccessStatusCode) return "Xin lỗi Thầy/Cô, đường truyền đến não bộ AI đang bị gián đoạn. Thầy/Cô thử lại sau ít phút nhé.";

                var root = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
                return root.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString() ?? "";
            }
            catch (Exception ex)
            {
                return $"Đã xảy ra lỗi hệ thống: {ex.Message}";
            }
        }

        // =================================================================
        // CÁC TOOL (KỸ NĂNG) CỦA AI - CHUI VÀO DATABASE ĐỂ LẤY SỐ LIỆU
        // =================================================================

        private async Task<string> Tool_AnalyzeClassErrors(int classId)
        {
            // 🌟 SỬA LỖI SQL 'WITH': Dùng cú pháp JOIN trực tiếp thay vì .Contains()
            var recentFails = await (from cs in _context.ClassStudents
                                     join u in _context.Users on cs.StudentId equals u.Id
                                     join s in _context.Submissions on u.Email equals s.UserEmail
                                     where cs.ClassId == classId && s.Status != "Accepted"
                                     select s).ToListAsync();

            if (!recentFails.Any()) return "Tuyệt vời, 100% sinh viên lớp này nộp bài đều Pass xanh rờn trong thời gian qua!";

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
            // 🌟 SỬA LỖI SQL 'WITH': Dùng cú pháp JOIN trực tiếp
            var failSubmissions = await (from cs in _context.ClassStudents
                                         join u in _context.Users on cs.StudentId equals u.Id
                                         join s in _context.Submissions on u.Email equals s.UserEmail
                                         where cs.ClassId == classId && s.Status != "Accepted"
                                         select s).ToListAsync();

            var riskStudents = failSubmissions
                .GroupBy(s => s.UserEmail)
                .Where(g => g.Count() >= 5) // Ai nộp sai trên 5 lần là có nguy cơ
                .Select(g => new { Email = g.Key, Fails = g.Count() })
                .ToList();

            if (!riskStudents.Any()) return "Không phát hiện sinh viên nào nộp sai quá nhiều. Lớp đang ổn định.";

            string report = "Danh sách sinh viên CÓ NGUY CƠ ĐUỐI SỨC:\n";
            foreach (var s in riskStudents) report += $"- Sinh viên ({s.Email}): Đã nộp sai {s.Fails} lần.\n";
            return report;
        }

        private async Task<string> Tool_CreateExerciseForClass(int classId, int lessonId, string requestMessage)
        {
            string apiKey = GetRandomApiKey();
            string prompt = $@"
            Bạn là máy sinh bài tập JSON. Dựa vào yêu cầu này của Giảng viên: '{requestMessage}'.
            Hãy tạo 1 bài tập lập trình để giao cho lớp. 
            Trả về CHUẨN JSON: {{ ""Title"": """", ""Description"": """", ""Difficulty"": ""Cơ bản"", ""StarterCode"": """", ""TestCases"": [ {{ ""Input"": """", ""ExpectedOutput"": """" }} ] }}";

            var payload = new { systemInstruction = new { parts = new[] { new { text = prompt } } }, contents = new[] { new { parts = new[] { new { text = "Tạo JSON" } } } }, generationConfig = new { responseMimeType = "application/json" } };
            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            try
            {
                var response = await _httpClient.SendAsync(new HttpRequestMessage(HttpMethod.Post, $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}") { Content = content });
                var root = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
                string jsonOutput = root.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString() ?? "";

                string cleanJson = jsonOutput.Trim();
                if (cleanJson.StartsWith("```json", StringComparison.OrdinalIgnoreCase)) cleanJson = cleanJson.Substring(7);
                else if (cleanJson.StartsWith("```")) cleanJson = cleanJson.Substring(3);
                if (cleanJson.EndsWith("```")) cleanJson = cleanJson.Substring(0, cleanJson.Length - 3);

                var generatedEx = JsonSerializer.Deserialize<GeneratedExerciseResponse>(cleanJson.Trim(), new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                
                var newExercise = new Exercise {
                    LessonId = lessonId,ClassId = classId, Title = $"[BÀI TẬP BÙ] {generatedEx!.Title}", Description = generatedEx.Description,
                    Difficulty = generatedEx.Difficulty, StarterCode = generatedEx.StarterCode, TestCases = JsonSerializer.Serialize(generatedEx.TestCases)
                };

                _context.Exercises.Add(newExercise);
                await _context.SaveChangesAsync();

                return $"ĐÃ TẠO VÀ LƯU VÀO DATABASE THÀNH CÔNG bài tập tên là: '{newExercise.Title}'. Giảng viên có thể bảo sinh viên vào làm ngay.";
            }
            catch { return "Lỗi: AI không thể tạo định dạng JSON bài tập lúc này."; }
        }

        public class GeneratedExerciseResponse { public string Title { get; set; } = ""; public string Description { get; set; } = ""; public string Difficulty { get; set; } = ""; public string StarterCode { get; set; } = ""; public List<GeneratedTestCase> TestCases { get; set; } = new(); }
        public class GeneratedTestCase { public string Input { get; set; } = ""; public string ExpectedOutput { get; set; } = ""; }
    }
}