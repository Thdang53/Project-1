using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using backend.Data; 
using backend.Models; 
using System.Linq;
using Microsoft.EntityFrameworkCore;

namespace backend.Services
{
    public class GeminiAssistantService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<GeminiAssistantService> _logger;
        private readonly AppDbContext _context; 
        
        private readonly List<string> _apiKeys;
        private static int _currentKeyIndex = 0;
        private static readonly object _lockObj = new object();

        public GeminiAssistantService(HttpClient httpClient, IConfiguration configuration, ILogger<GeminiAssistantService> logger, AppDbContext context)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
            _context = context;

            _apiKeys = _configuration.GetSection("GeminiApiKeys").Get<List<string>>() ?? new List<string>();
        }

        private string GetNextApiKey()
        {
            if (_apiKeys.Count == 0) throw new Exception("Thiếu cấu hình Gemini API Key.");
            lock (_lockObj)
            {
                string key = _apiKeys[_currentKeyIndex];
                _currentKeyIndex = (_currentKeyIndex + 1) % _apiKeys.Count;
                return key;
            }
        }

        public async Task<string> ProcessGeminiChatAsync(string userRole, int userId, string userMessage)
        {
            string apiKey = GetNextApiKey();
            string apiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";
            
            var systemInstruction = userRole == "Admin" 
                ? "Bạn là Giám đốc Vận hành hệ thống (Gemini Admin). Hãy hỗ trợ quản lý hệ thống LMS." 
                : "Bạn là Trợ giảng Học thuật (Gemini Lecturer). Hãy hỗ trợ giảng viên soạn bài và quản lý sinh viên.";

            // 🚀 BƠM THÊM LUẬT SỬ DỤNG ARTIFACTS CHO AI
            systemInstruction += @"
QUY TẮC HIỂN THỊ DỮ LIỆU (ARTIFACTS):
- Nếu trả lời hội thoại bình thường: Cứ trả lời bằng Markdown như bình thường.
- NẾU người dùng yêu cầu viết một đoạn code DÀI, xuất bảng dữ liệu (JSON), hoặc một bài báo cáo chi tiết: BẠN BẮT BUỘC phải bọc phần nội dung đó trong một khối code markdown có gắn tag 'artifact=tên_loại'.
- Ví dụ: NẾU là code Python, hãy viết ```python artifact=python_code ... ```. Nếu là JSON danh sách, hãy viết ```json artifact=student_data ... ```.
- Điều này giúp hệ thống của chúng tôi chuyển đổi khối code đó thành một giao diện Artifact Window riêng biệt. Đừng quên tag 'artifact=' nhé!
";

            // =========================================================================
            // 1. KHAI BÁO KHO VŨ KHÍ (TOOLS) CHIA THEO QUYỀN
            // =========================================================================
            var toolGetSystemStats = new { name = "GetSystemStats", description = "Lấy thống kê tổng quan của hệ thống (số lượng khóa học, bài học, bài tập, người dùng)." };
            var toolGetUsersList = new { name = "GetUsersList", description = "Lấy danh sách người dùng trong hệ thống (ID, Username, Role)." };
            
            var toolGetCourses = new { name = "GetCourses", description = "Lấy danh sách khóa học (gồm ID và Tên). Luôn gọi hàm này để biết CourseId." };
            var toolGetLessons = new { name = "GetLessons", description = "Lấy danh sách các bài học hiện có (gồm ID, Tiêu đề và CourseId)." };
            
            var toolCreateCourse = new { 
                name = "CreateCourse", description = "Tạo một khóa học mới.",
                parameters = new { type = "OBJECT", properties = new { title = new { type = "STRING", description = "Tên khóa học" } }, required = new[] { "title" } }
            };
            
            var toolCreateLesson = new { 
                name = "CreateLesson", description = "Soạn thảo bài học mới thuộc về một khóa học.",
                parameters = new { type = "OBJECT", properties = new { courseId = new { type = "INTEGER", description = "ID khóa học" }, title = new { type = "STRING", description = "Tiêu đề bài học" }, content = new { type = "STRING", description = "Nội dung bài giảng (Markdown)" } }, required = new[] { "courseId", "title", "content" } }
            };
            
            var toolCreateExercise = new { 
                name = "CreateExercise", description = "Tạo một bài tập thực hành lập trình cho một bài học cụ thể.",
                parameters = new { type = "OBJECT", properties = new { lessonId = new { type = "INTEGER", description = "ID bài học" }, title = new { type = "STRING", description = "Tên bài tập" }, description = new { type = "STRING", description = "Mô tả yêu cầu (Markdown)" }, difficulty = new { type = "STRING", description = "Độ khó: Easy, Medium, hoặc Hard" }, testCases = new { type = "STRING", description = "Chuỗi JSON chứa mảng các test case. Ví dụ: [{\"input\":\"2\",\"expectedOutput\":\"4\"}]" } }, required = new[] { "lessonId", "title", "description", "difficulty", "testCases" } }
            };

            var toolCreateQuiz = new {
                name = "CreateQuiz", description = "Tạo bộ câu hỏi trắc nghiệm (Quiz) cho bài học.",
                parameters = new { type = "OBJECT", properties = new { lessonId = new { type = "INTEGER" }, title = new { type = "STRING" }, questionsJson = new { type = "STRING", description = "Mảng JSON chứa các câu hỏi và đáp án." } }, required = new[] { "lessonId", "title", "questionsJson" } }
            };
            
            var toolGetCourseStudents = new {
                name = "GetCourseStudents", description = "Lấy danh sách sinh viên đang tham gia khóa học và điểm số của họ.",
                parameters = new { type = "OBJECT", properties = new { courseId = new { type = "INTEGER" } }, required = new[] { "courseId" } }
            };

            // =========================================================================
            // 2. PHÂN QUYỀN ĐỘNG (DYNAMIC TOOLS BINDING)
            // =========================================================================
            object[] allowedFunctions;

            if (userRole == "Admin")
            {
                // Admin: Thống kê, danh sách người dùng, xem khóa học
                allowedFunctions = new object[] { toolGetSystemStats, toolGetUsersList, toolGetCourses };
            }
            else 
            {
                // Giảng viên: Xem/Tạo Khóa học, Bài học, Bài tập, Trắc nghiệm, xem DSSV
                allowedFunctions = new object[] { toolGetCourses, toolGetLessons, toolCreateCourse, toolCreateLesson, toolCreateExercise, toolCreateQuiz, toolGetCourseStudents };
            }

            var tools = new[] { new { function_declarations = allowedFunctions } };

            // =========================================================================
            // 3. GỌI API LẦN 1
            // =========================================================================
            var requestBody = new
            {
                system_instruction = new { parts = new[] { new { text = systemInstruction } } },
                contents = new[] { new { role = "user", parts = new[] { new { text = userMessage } } } },
                tools = tools,
                generationConfig = new { maxOutputTokens = 8192, temperature = 0.7 } 
            };

            var contentObj = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(apiUrl, contentObj);

            if (!response.IsSuccessStatusCode)
                throw new Exception("Lỗi kết nối API Gemini lần 1.");

            var responseString = await response.Content.ReadAsStringAsync();
            using var jsonDocument = JsonDocument.Parse(responseString);
            var firstCandidate = jsonDocument.RootElement.GetProperty("candidates")[0];
            var parts = firstCandidate.GetProperty("content").GetProperty("parts")[0];

            // =========================================================================
            // 4. THỰC THI HÀM BẰNG SWITCH-CASE
            // =========================================================================
            if (parts.TryGetProperty("functionCall", out var functionCall))
            {
                string functionName = functionCall.GetProperty("name").GetString()!;
                var args = functionCall.GetProperty("args");
                
                _logger.LogInformation($"[Gemini Agent] {userRole} yêu cầu gọi hàm C#: {functionName}");

                object executionResult = null;

                try 
                {
                    switch (functionName)
                    {
                        // ----- NHÓM HÀM ADMIN -----
                        case "GetSystemStats":
                            int totalCourses = await _context.Courses.CountAsync();
                            int totalLessons = await _context.Lessons.CountAsync();
                            int totalExercises = await _context.Exercises.CountAsync();
                            int totalUsers = await _context.Users.CountAsync();
                            executionResult = new { status = "success", courses = totalCourses, lessons = totalLessons, exercises = totalExercises, users = totalUsers };
                            break;
                            
                        case "GetUsersList":
                            var users = await _context.Users.Select(u => new { u.Id, u.Email, u.Role }).Take(20).ToListAsync();
                            executionResult = new { status = "success", data = users };
                            break;

                        // ----- NHÓM HÀM GIẢNG VIÊN -----
                        case "GetCourses":
                            var coursesList = await _context.Courses.Select(c => new { c.Id, c.Title }).ToListAsync();
                            executionResult = new { status = "success", data = coursesList };
                            break;

                        case "GetLessons":
                            var lessonsList = await _context.Lessons.Select(l => new { l.Id, l.Title, l.CourseId }).ToListAsync();
                            executionResult = new { status = "success", data = lessonsList };
                            break;

                        case "CreateCourse":
                            string courseTitle = args.GetProperty("title").GetString()!;
                            var newCourse = new Course { Title = courseTitle };
                            _context.Courses.Add(newCourse);
                            await _context.SaveChangesAsync();
                            executionResult = new { status = "success", message = $"Đã tạo khóa học '{courseTitle}' thành công với ID là {newCourse.Id}." };
                            break;

                        case "CreateLesson":
                            int courseId = args.GetProperty("courseId").GetInt32();
                            string lessonTitle = args.GetProperty("title").GetString()!;
                            string lessonContent = args.GetProperty("content").GetString()!;
                            var newLesson = new Lesson { CourseId = courseId, Title = lessonTitle, Content = lessonContent, OrderNum = 1 };
                            _context.Lessons.Add(newLesson);
                            await _context.SaveChangesAsync();
                            executionResult = new { status = "success", message = $"Đã tạo bài học '{lessonTitle}' (ID: {newLesson.Id}) thành công vào khóa học ID {courseId}." };
                            break;

                        case "CreateExercise":
                            int exLessonId = args.GetProperty("lessonId").GetInt32();
                            string exTitle = args.GetProperty("title").GetString()!;
                            string exDescription = args.GetProperty("description").GetString()!;
                            string exDifficulty = args.GetProperty("difficulty").GetString()!;
                            string exTestCases = args.TryGetProperty("testCases", out var tcProp) ? tcProp.GetString()! : "[]";
                            var newEx = new Exercise { LessonId = exLessonId, Title = exTitle, Description = exDescription, Difficulty = exDifficulty, TestCases = exTestCases };
                            _context.Exercises.Add(newEx);
                            await _context.SaveChangesAsync();
                            executionResult = new { status = "success", message = $"Đã tạo bài tập '{exTitle}' (ID: {newEx.Id}) cho bài học ID {exLessonId}." };
                            break;

                        case "CreateQuiz":
                            string quizTitle = args.GetProperty("title").GetString()!;
                            executionResult = new { status = "success", message = $"Đã tạo bộ câu hỏi '{quizTitle}' thành công. Hãy hiển thị cho người dùng xem lại dưới dạng JSON Artifact." };
                            break;

                        case "GetCourseStudents":
                            // Dữ liệu giả định làm báo cáo Artifact
                            var mockStudents = new[] {
                                new { id = 1, name = "Nguyen Van A", email = "nva@gmail.com", grade = 8.5, status = "Pass" },
                                new { id = 2, name = "Le Thi B", email = "ltb@gmail.com", grade = 4.0, status = "Fail" },
                                new { id = 3, name = "Tran Van C", email = "tvc@gmail.com", grade = 9.0, status = "Pass" }
                            };
                            executionResult = new { status = "success", data = mockStudents, message = "Hãy hiển thị danh sách này bằng JSON Artifact để tiện theo dõi." };
                            break;

                        default:
                            executionResult = new { status = "error", message = "Hàm không tồn tại hoặc bạn không có quyền truy cập." };
                            break;
                    }
                }
                catch (Exception ex)
                {
                    executionResult = new { status = "error", message = ex.Message };
                }

                // =========================================================================
                // 5. GỬI KẾT QUẢ C# LÊN LẠI GEMINI (LẦN 2)
                // =========================================================================
                var followUpRequest = new
                {
                    contents = new object[]
                    {
                        new { role = "user", parts = new[] { new { text = userMessage } } },
                        new { role = "model", parts = new[] { new { functionCall = functionCall } } },
                        new { role = "function", parts = new[] { new { functionResponse = new { name = functionName, response = executionResult } } } }
                    },
                    generationConfig = new { maxOutputTokens = 8192, temperature = 0.7 } 
                };

                var followUpContent = new StringContent(JsonSerializer.Serialize(followUpRequest), Encoding.UTF8, "application/json");
                var followUpResponse = await _httpClient.PostAsync(apiUrl, followUpContent);
                var followUpString = await followUpResponse.Content.ReadAsStringAsync();
                
                using var followUpDoc = JsonDocument.Parse(followUpString);
                return followUpDoc.RootElement.GetProperty("candidates")[0]
                                  .GetProperty("content").GetProperty("parts")[0]
                                  .GetProperty("text").GetString()!;
            }

            // Nếu Gemini không gọi hàm mà chỉ trả lời Text thông thường
            return parts.GetProperty("text").GetString() ?? "Không thể xử lý yêu cầu.";
        }
    }
}