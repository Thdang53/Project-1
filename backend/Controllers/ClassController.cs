using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using backend.Data;
using backend.Models;
using System.Security.Claims;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Bắt buộc phải đăng nhập mới được dùng các API này
    public class ClassController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ClassController(AppDbContext context)
        {
            _context = context;
        }

        // ==========================================
        // HÀM HỖ TRỢ: Lấy ID người dùng từ Token
        // ==========================================
        private async Task<User?> GetCurrentUserAsync()
        {
            var email = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("Email")?.Value;
            if (string.IsNullOrEmpty(email)) return null;
            return await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        }

        // ==========================================
        // HÀM HỖ TRỢ: Sinh mã JoinCode ngẫu nhiên 6 ký tự
        // ==========================================
        private string GenerateJoinCode()
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            var random = new Random();
            return new string(Enumerable.Repeat(chars, 6).Select(s => s[random.Next(s.Length)]).ToArray());
        }

        public class CreateClassRequest { public string ClassName { get; set; } = string.Empty; }
        public class JoinClassRequest { public string JoinCode { get; set; } = string.Empty; }

        // ==========================================
        // 1. GIẢNG VIÊN TẠO LỚP MỚI
        // ==========================================
        [HttpPost("create")]
        [Authorize(Roles = "Admin,Lecturer")]
        public async Task<IActionResult> CreateClass([FromBody] CreateClassRequest request)
        {
            var currentUser = await GetCurrentUserAsync();
            if (currentUser == null) return Unauthorized(new { success = false, message = "Không xác định được danh tính." });

            if (string.IsNullOrWhiteSpace(request.ClassName))
                return BadRequest(new { success = false, message = "Tên lớp không được để trống." });

            // Sinh mã JoinCode độc nhất
            string newCode;
            do { newCode = GenerateJoinCode(); } 
            while (await _context.Classes.AnyAsync(c => c.JoinCode == newCode));

            var newClass = new Class
            {
                ClassName = request.ClassName,
                LecturerId = currentUser.Id,
                JoinCode = newCode,
                CreatedAt = DateTime.UtcNow
            };

            _context.Classes.Add(newClass);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Tạo lớp thành công!", data = newClass });
        }

        // ==========================================
        // 2. SINH VIÊN THAM GIA LỚP BẰNG JOIN CODE
        // ==========================================
        [HttpPost("join")]
        public async Task<IActionResult> JoinClass([FromBody] JoinClassRequest request)
        {
            var currentUser = await GetCurrentUserAsync();
            if (currentUser == null) return Unauthorized(new { success = false, message = "Không xác định được danh tính." });

            var targetClass = await _context.Classes.FirstOrDefaultAsync(c => c.JoinCode == request.JoinCode.ToUpper());
            if (targetClass == null) 
                return NotFound(new { success = false, message = "Mã lớp không tồn tại hoặc đã hết hạn." });

            // Kiểm tra xem sinh viên đã ở trong lớp này chưa
            bool isAlreadyJoined = await _context.ClassStudents.AnyAsync(cs => cs.ClassId == targetClass.Id && cs.StudentId == currentUser.Id);
            if (isAlreadyJoined) 
                return BadRequest(new { success = false, message = "Bạn đã tham gia lớp học này rồi." });

            var classStudent = new ClassStudent
            {
                ClassId = targetClass.Id,
                StudentId = currentUser.Id,
                JoinedAt = DateTime.UtcNow
            };

            _context.ClassStudents.Add(classStudent);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = $"Chào mừng bạn đến với lớp {targetClass.ClassName}!" });
        }

        // ==========================================
        // 3. LẤY DANH SÁCH LỚP (Dùng chung cho cả GV và SV)
        // ==========================================
        [HttpGet("my-classes")]
        public async Task<IActionResult> GetMyClasses()
        {
            var currentUser = await GetCurrentUserAsync();
            if (currentUser == null) return Unauthorized(new { success = false, message = "Không xác định được danh tính." });

            var role = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("Role")?.Value;

            if (role == "Lecturer" || role == "Admin")
            {
                // Trả về các lớp do Giảng viên này quản lý kèm theo số lượng SV
                var lecturerClasses = await _context.Classes
                    .Where(c => c.LecturerId == currentUser.Id)
                    .OrderByDescending(c => c.CreatedAt)
                    .Select(c => new {
                        c.Id,
                        c.ClassName,
                        c.JoinCode,
                        c.CreatedAt,
                        StudentCount = _context.ClassStudents.Count(cs => cs.ClassId == c.Id)
                    })
                    .ToListAsync();
                return Ok(new { success = true, data = lecturerClasses });
            }
            else
            {
                // Trả về các lớp mà Sinh viên này đang theo học
                var studentClasses = await _context.ClassStudents
                    .Where(cs => cs.StudentId == currentUser.Id)
                    .Include(cs => cs.Class)
                    .ThenInclude(c => c.Lecturer)
                    .OrderByDescending(cs => cs.JoinedAt)
                    .Select(cs => new {
                        Id = cs.ClassId,
                        ClassName = cs.Class!.ClassName,
                        LecturerName = cs.Class.Lecturer!.FullName,
                        cs.JoinedAt
                    })
                    .ToListAsync();
                return Ok(new { success = true, data = studentClasses });
            }
        }

        // ==========================================
        // 4. LẤY CHI TIẾT LỚP & DANH SÁCH BÀI TẬP
        // ==========================================
        [HttpGet("{id}")]
        public async Task<IActionResult> GetClassDetail(int id)
        {
            var currentUser = await GetCurrentUserAsync(); // Lấy user hiện tại

            var classInfo = await _context.Classes.Include(c => c.Lecturer).FirstOrDefaultAsync(c => c.Id == id);
            if (classInfo == null) return NotFound(new { success = false, message = "Không tìm thấy lớp học." });

            var exercises = await _context.Exercises
                .Where(e => e.ClassId == id)
                .OrderByDescending(e => e.Id)
                .Select(e => new { 
                    e.Id, 
                    e.Title, 
                    e.Difficulty, 
                    e.Description,
                    // 🌟 FIX LỖI Ở ĐÂY: Sử dụng UserEmail thay vì UserId để so khớp với bảng Submission
                    IsCompleted = currentUser != null && _context.Submissions.Any(s => s.ExerciseId == e.Id && s.UserEmail == currentUser.Email && s.Status == "Accepted")
                })
                .ToListAsync();

            return Ok(new { 
                success = true, 
                classInfo = new { classInfo.ClassName, LecturerName = classInfo.Lecturer?.FullName, classInfo.JoinCode }, 
                exercises 
            });
        }

        // 🌟 ĐÃ CẬP NHẬT: Thêm Model TestCase và StarterCode
        public class TestCaseDto {
            public string Input { get; set; } = string.Empty;
            public string ExpectedOutput { get; set; } = string.Empty;
        }

        public class CreateClassExerciseRequest { 
            public string Title { get; set; } = string.Empty; 
            public string Description { get; set; } = string.Empty; 
            public string Difficulty { get; set; } = "Cơ bản"; 
            public string StarterCode { get; set; } = string.Empty;
            public List<TestCaseDto> TestCases { get; set; } = new();
        }

        // ==========================================
        // 5. GIẢNG VIÊN TẠO BÀI TẬP CHI TIẾT CHO LỚP
        // ==========================================
        [HttpPost("{id}/exercises")]
        [Authorize(Roles = "Admin,Lecturer")]
        public async Task<IActionResult> CreateClassExercise(int id, [FromBody] CreateClassExerciseRequest req)
        {
            try 
            {
                var newEx = new Exercise {
                    ClassId = id,
                    LessonId = 1, // Tạm định Lesson 1
                    Title = req.Title,
                    Description = req.Description,
                    Difficulty = req.Difficulty,
                    StarterCode = req.StarterCode, // Lấy Code mẫu từ giao diện
                    TestCases = System.Text.Json.JsonSerializer.Serialize(req.TestCases) // Lấy danh sách Test Case
                };
                _context.Exercises.Add(newEx);
                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Tạo bài tập thành công!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}