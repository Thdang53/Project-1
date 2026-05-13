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
    public class ExercisesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ExercisesController(AppDbContext context)
        {
            _context = context;
        }

        // =======================================================
        // Hàm hỗ trợ: Lấy thông tin User đang đăng nhập từ Token
        // =======================================================
        private async Task<User?> GetCurrentUserAsync()
        {
            var email = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("Email")?.Value;
            if (string.IsNullOrEmpty(email)) return null;
            return await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        }

        // ==========================================
        // 1. LẤY DANH SÁCH BÀI TẬP CHUNG (GET)
        // ==========================================
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Exercise>>> GetExercises()
        {
            if (_context.Exercises == null)
            {
                return NotFound("Không tìm thấy bảng Exercises trong CSDL.");
            }
            
            // 🚀 SỬA ĐỔI: Chỉ lấy các bài tập KHÔNG thuộc về bất kỳ lớp học nào (Bài tập chung)
            return await _context.Exercises
                .Where(e => e.ClassId == null)
                .OrderByDescending(e => e.Id)
                .ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Exercise>> GetExercise(int id)
        {
            if (_context.Exercises == null) return NotFound();
            var exercise = await _context.Exercises.FindAsync(id);
            if (exercise == null) return NotFound();
            return exercise;
        }
        
        [HttpGet("first")]
        public async Task<ActionResult<Exercise>> GetFirstExercise()
        {
            if (_context.Exercises == null) return NotFound(new { message = "Chưa có kết nối Database" });
            
            // 🚀 SỬA ĐỔI: Đảm bảo bài đầu tiên load lên Workspace cũng phải là bài tập chung
            var exercise = await _context.Exercises
                .Where(e => e.ClassId == null)
                .FirstOrDefaultAsync();
                
            if (exercise == null) return NotFound(new { message = "Không có bài tập nào trong DB" });
            return Ok(exercise);
        }

        // ==========================================
        // 3. THÊM BÀI TẬP MỚI (POST) - ADMIN & LECTURER
        // ==========================================
        [HttpPost]
        [Authorize]
        public async Task<ActionResult<Exercise>> PostExercise(Exercise exercise)
        {
            var role = User.FindFirst("Role")?.Value ?? User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != "Admin" && role != "Lecturer")
            {
                return StatusCode(403, new { message = "Từ chối truy cập: Chỉ Admin hoặc Giảng viên mới có quyền thêm bài tập." });
            }

            if (exercise.LessonId <= 0)
                return BadRequest(new { message = "Vui lòng chọn một Bài học (Lesson) hợp lệ." });

            var lesson = await _context.Lessons.FirstOrDefaultAsync(l => l.Id == exercise.LessonId);
            if (lesson == null)
                return BadRequest(new { message = "Bài học này không tồn tại trong hệ thống." });

            // 💡 KIỂM TRA BẢO MẬT KÉP: Dò ngược từ Lesson -> Course -> Lecturer
            if (role == "Lecturer")
            {
                var course = await _context.Courses.FirstOrDefaultAsync(c => c.Id == lesson.CourseId);
                var currentUser = await GetCurrentUserAsync();

                if (course == null || currentUser == null || course.LecturerId != currentUser.Id)
                {
                    return StatusCode(403, new { message = "Bạn không có quyền thêm bài tập vào khóa học của giảng viên khác." });
                }
            }

            _context.Exercises.Add(exercise);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetExercise", new { id = exercise.Id }, exercise);
        }

        // ==========================================
        // 4. CẬP NHẬT BÀI TẬP (PUT) - ADMIN & LECTURER
        // ==========================================
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> PutExercise(int id, Exercise exercise)
        {
            if (id != exercise.Id) return BadRequest(new { message = "ID bài tập không khớp." });

            var role = User.FindFirst("Role")?.Value ?? User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != "Admin" && role != "Lecturer")
                return StatusCode(403, new { message = "Từ chối truy cập: Chỉ Admin hoặc Giảng viên mới có quyền sửa bài tập." });

            var existingExercise = await _context.Exercises.FindAsync(id);
            if (existingExercise == null) return NotFound(new { message = "Không tìm thấy bài tập để sửa." });

            var newLesson = await _context.Lessons.FirstOrDefaultAsync(l => l.Id == exercise.LessonId);
            if (newLesson == null) return BadRequest(new { message = "Bài học được chọn không tồn tại." });

            // 💡 KIỂM TRA BẢO MẬT: Kiểm tra khóa học cũ VÀ khóa học mới
            if (role == "Lecturer")
            {
                var currentUser = await GetCurrentUserAsync();

                // 1. Kiểm tra xem Giảng viên có sở hữu Khóa học CŨ (nơi bài tập đang đứng) không
                var oldLesson = await _context.Lessons.FirstOrDefaultAsync(l => l.Id == existingExercise.LessonId);
                var oldCourse = oldLesson != null ? await _context.Courses.FirstOrDefaultAsync(c => c.Id == oldLesson.CourseId) : null;

                if (oldCourse == null || currentUser == null || oldCourse.LecturerId != currentUser.Id)
                {
                    return StatusCode(403, new { message = "Bạn không có quyền sửa bài tập của giảng viên khác." });
                }

                // 2. Kiểm tra xem Giảng viên có sở hữu Khóa học MỚI (nơi muốn chuyển bài tập sang) không
                var newCourse = await _context.Courses.FirstOrDefaultAsync(c => c.Id == newLesson.CourseId);
                if (newCourse == null || newCourse.LecturerId != currentUser.Id)
                {
                    return StatusCode(403, new { message = "Bạn không có quyền chuyển bài tập sang khóa học của người khác." });
                }
            }

            _context.Entry(existingExercise).CurrentValues.SetValues(exercise);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // ==========================================
        // 5. XÓA BÀI TẬP (DELETE) - ADMIN & LECTURER
        // ==========================================
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteExercise(int id)
        {
            var role = User.FindFirst("Role")?.Value ?? User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != "Admin" && role != "Lecturer")
                return StatusCode(403, new { message = "Từ chối truy cập: Chỉ Admin hoặc Giảng viên mới có quyền xóa bài tập." });

            var exercise = await _context.Exercises.FindAsync(id);
            if (exercise == null) return NotFound();

            // 💡 KIỂM TRA BẢO MẬT: Dò ngược từ Bài tập bị xóa
            if (role == "Lecturer")
            {
                var lesson = await _context.Lessons.FirstOrDefaultAsync(l => l.Id == exercise.LessonId);
                var course = lesson != null ? await _context.Courses.FirstOrDefaultAsync(c => c.Id == lesson.CourseId) : null;
                var currentUser = await GetCurrentUserAsync();

                if (course == null || currentUser == null || course.LecturerId != currentUser.Id)
                {
                    return StatusCode(403, new { message = "Bạn không có quyền xóa bài tập của giảng viên khác." });
                }
            }

            _context.Exercises.Remove(exercise);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // =================================================================
        // 🌟 TÍNH NĂNG SRS: LẤY DANH SÁCH BÀI TẬP ĐẾN HẠN ÔN HÔM NAY
        // =================================================================
        [HttpGet("daily-reviews")]
        public async Task<IActionResult> GetDailyReviews([FromQuery] string email)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) return Unauthorized(new { success = false, message = "User not found" });

            var today = DateTime.UtcNow;

            // Truy vấn các bài tập mà NextReviewDate <= Hôm nay
            var dueReviews = await _context.SpacedRepetitions
                .Include(s => s.Exercise) // Join với bảng Exercise để lấy tên bài
                .Where(s => s.UserId == user.Id && s.NextReviewDate <= today)
                .Select(s => new {
                    s.ExerciseId,
                    ExerciseTitle = s.Exercise!.Title,
                    Difficulty = s.Exercise.Difficulty,
                    s.Language, // 💡 ĐÃ THÊM: Trả về Language đã lưu trong SpacedRepetition
                    s.Repetitions, // Số chuỗi thắng
                    s.NextReviewDate
                })
                .ToListAsync();

            return Ok(new { success = true, data = dueReviews });
        }
    }
}