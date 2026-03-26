using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using backend.Data; // Thêm thư viện gọi Database
using backend.Models; // Thêm thư viện Models
using System.Linq;
using Microsoft.EntityFrameworkCore;

namespace backend.Services
{
    public class GeminiAssistantService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<GeminiAssistantService> _logger;
        private readonly AppDbContext _context; // Vũ khí kết nối Database
        
        private readonly List<string> _apiKeys;
        private static int _currentKeyIndex = 0;
        private static readonly object _lockObj = new object();

        // Cập nhật Constructor: Bơm thêm AppDbContext
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

            // 1. ĐỊNH NGHĨA "ĐỒ NGHỀ" (TOOLS) CHO GEMINI
            var tools = new[]
            {
                new {
                    function_declarations = new object[]
                    {
                        new {
                            name = "GetSystemStats",
                            description = "Lấy thống kê tổng quan của hệ thống (số lượng khóa học, bài học, bài tập, người dùng)."
                        },
                        new {
                            name = "CreateCourse",
                            description = "Tạo một khóa học mới.",
                            parameters = new {
                                type = "OBJECT",
                                properties = new { title = new { type = "STRING", description = "Tên khóa học" } },
                                required = new[] { "title" }
                            }
                        },
                        new {
                            name = "GetCourses",
                            description = "Lấy danh sách khóa học (gồm ID và Tên). Luôn gọi hàm này để biết CourseId trước khi tạo Bài học."
                        },
                        new {
                            name = "CreateLesson",
                            description = "Soạn thảo bài học mới thuộc về một khóa học.",
                            parameters = new {
                                type = "OBJECT",
                                properties = new {
                                    courseId = new { type = "INTEGER", description = "ID khóa học" },
                                    title = new { type = "STRING", description = "Tiêu đề bài học" },
                                    content = new { type = "STRING", description = "Nội dung bài giảng (Markdown)" }
                                },
                                required = new[] { "courseId", "title", "content" }
                            }
                        },
                        // 🌟 KỸ NĂNG MỚI: LẤY DANH SÁCH BÀI HỌC
                        new {
                            name = "GetLessons",
                            description = "Lấy danh sách các bài học hiện có (gồm ID, Tiêu đề và CourseId). Luôn gọi hàm này để biết LessonId trước khi tạo Bài tập."
                        },
                        // 🌟 KỸ NĂNG MỚI: TẠO BÀI TẬP (EXERCISE)
                        new {
                            name = "CreateExercise",
                            description = "Tạo một bài tập thực hành lập trình cho một bài học cụ thể.",
                            parameters = new {
                                type = "OBJECT",
                                properties = new {
                                    lessonId = new { type = "INTEGER", description = "ID của bài học chứa bài tập này" },
                                    title = new { type = "STRING", description = "Tên bài tập" },
                                    description = new { type = "STRING", description = "Mô tả yêu cầu bài toán (Markdown)" },
                                    difficulty = new { type = "STRING", description = "Độ khó: Easy, Medium, hoặc Hard" },
                                    testCases = new { type = "STRING", description = "Chuỗi JSON chứa mảng các test case. Ví dụ: [{\"input\":\"2\",\"expectedOutput\":\"4\"}]" }
                                },
                                required = new[] { "lessonId", "title", "description", "difficulty", "testCases" }
                            }
                        }
                    }
                }
            };

            // 2. TẠO REQUEST GỬI LÊN GEMINI LẦN 1
            var requestBody = new
            {
                system_instruction = new { parts = new[] { new { text = systemInstruction } } },
                contents = new[] { new { role = "user", parts = new[] { new { text = userMessage } } } },
                tools = tools, // Truyền bộ công cụ vào đây
                generationConfig = new { maxOutputTokens = 8192, temperature = 0.7 } // 🚀 BƠM OXY TẠI ĐÂY LẦN 1
            };

            var contentObj = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(apiUrl, contentObj);

            if (!response.IsSuccessStatusCode)
                throw new Exception("Lỗi kết nối API Gemini lần 1.");

            var responseString = await response.Content.ReadAsStringAsync();
            using var jsonDocument = JsonDocument.Parse(responseString);
            var firstCandidate = jsonDocument.RootElement.GetProperty("candidates")[0];
            var parts = firstCandidate.GetProperty("content").GetProperty("parts")[0];

            // 3. KIỂM TRA XEM GEMINI CÓ MUỐN GỌI HÀM C# KHÔNG?
            if (parts.TryGetProperty("functionCall", out var functionCall))
            {
                string functionName = functionCall.GetProperty("name").GetString()!;
                var args = functionCall.GetProperty("args");
                
                _logger.LogInformation($"[Gemini Agent] Yêu cầu gọi hàm C#: {functionName}");

                // 4. THỰC THI HÀM C# TƯƠNG ỨNG
                object executionResult = null;

                try 
                {
                    if (functionName == "GetSystemStats")
                    {
                        int totalCourses = await _context.Courses.CountAsync();
                        int totalLessons = await _context.Lessons.CountAsync();
                        int totalExercises = await _context.Exercises.CountAsync();
                        int totalUsers = await _context.Users.CountAsync();
                        executionResult = new { status = "success", courses = totalCourses, lessons = totalLessons, exercises = totalExercises, users = totalUsers };
                    }
                    else if (functionName == "CreateCourse")
                    {
                        string title = args.GetProperty("title").GetString()!;
                        
                        var newCourse = new Course { Title = title };
                        _context.Courses.Add(newCourse);
                        await _context.SaveChangesAsync();

                        executionResult = new { status = "success", message = $"Đã tạo khóa học '{title}' thành công với ID là {newCourse.Id}." };
                    }
                    else if (functionName == "GetCourses")
                    {
                        var coursesList = await _context.Courses.Select(c => new { c.Id, c.Title }).ToListAsync();
                        executionResult = new { status = "success", data = coursesList };
                    }
                    else if (functionName == "CreateLesson")
                    {
                        int courseId = args.GetProperty("courseId").GetInt32();
                        string title = args.GetProperty("title").GetString()!;
                        string lessonContent = args.GetProperty("content").GetString()!;

                        var newLesson = new Lesson 
                        { 
                            CourseId = courseId, 
                            Title = title, 
                            Content = lessonContent, 
                            OrderNum = 1 // Mặc định gán là 1
                        };

                        _context.Lessons.Add(newLesson);
                        await _context.SaveChangesAsync();

                        executionResult = new { status = "success", message = $"Đã tạo bài học '{title}' (ID: {newLesson.Id}) thành công vào khóa học ID {courseId}." };
                    }
                    else if (functionName == "GetLessons")
                    {
                        var lessonsList = await _context.Lessons.Select(l => new { l.Id, l.Title, l.CourseId }).ToListAsync();
                        executionResult = new { status = "success", data = lessonsList };
                    }
                    else if (functionName == "CreateExercise")
                    {
                        int lessonId = args.GetProperty("lessonId").GetInt32();
                        string title = args.GetProperty("title").GetString()!;
                        string description = args.GetProperty("description").GetString()!;
                        string difficulty = args.GetProperty("difficulty").GetString()!;
                        string testCases = args.TryGetProperty("testCases", out var tcProp) ? tcProp.GetString()! : "[{\"input\":\"\",\"expectedOutput\":\"\"}]";

                        // Khởi tạo Exercise an toàn
                        var newEx = new Exercise 
                        { 
                            LessonId = lessonId, 
                            Title = title, 
                            Description = description, 
                            Difficulty = difficulty, 
                            TestCases = testCases 
                        };
                        _context.Exercises.Add(newEx);
                        await _context.SaveChangesAsync();
                        
                        executionResult = new { status = "success", message = $"Đã tạo bài tập '{title}' (ID: {newEx.Id}) cho bài học ID {lessonId}." };
                    }
                    else
                    {
                        executionResult = new { status = "error", message = "Hàm không tồn tại." };
                    }
                }
                catch (Exception ex)
                {
                    executionResult = new { status = "error", message = ex.Message };
                }

                // 5. GỬI KẾT QUẢ TỪ C# TRẢ LẠI CHO GEMINI ĐỂ NÓ DỊCH RA TIẾNG NGƯỜI LẦN 2
                var followUpRequest = new
                {
                    contents = new object[]
                    {
                        new { role = "user", parts = new[] { new { text = userMessage } } },
                        new { role = "model", parts = new[] { new { functionCall = functionCall } } },
                        new { role = "function", parts = new[] { new { functionResponse = new { name = functionName, response = executionResult } } } }
                    },
                    generationConfig = new { maxOutputTokens = 8192, temperature = 0.7 } // 🚀 BƠM OXY TẠI ĐÂY LẦN 2 (khi AI tổng hợp trả lời)
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