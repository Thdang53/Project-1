using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using backend.Data;
using backend.Models;
using System.Security.Claims;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LessonsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public LessonsController(AppDbContext context)
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

        // 1. LẤY DANH SÁCH BÀI HỌC
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Lesson>>> GetLessons()
        {
            return await _context.Lessons.ToListAsync();
        }

        // 2. THÊM BÀI HỌC (ADMIN HOẶC LECTURER SỞ HỮU KHÓA HỌC)
        [HttpPost]
        [Authorize]
        public async Task<ActionResult<Lesson>> PostLesson(Lesson lesson)
        {
            var role = User.FindFirst("Role")?.Value ?? User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != "Admin" && role != "Lecturer") return StatusCode(403, new { message = "Từ chối truy cập." });

            var course = await _context.Courses.FirstOrDefaultAsync(c => c.Id == lesson.CourseId);
            if (course == null) return BadRequest(new { message = "Khóa học không tồn tại." });

            // 💡 KIỂM TRA BẢO MẬT: Giảng viên chỉ được thêm bài vào Khóa học của mình
            if (role == "Lecturer")
            {
                var currentUser = await GetCurrentUserAsync();
                if (currentUser == null || course.LecturerId != currentUser.Id)
                {
                    return StatusCode(403, new { message = "Bạn không có quyền thêm bài học vào khóa học của người khác." });
                }
            }

            _context.Lessons.Add(lesson);
            await _context.SaveChangesAsync();
            return CreatedAtAction("GetLessons", new { id = lesson.Id }, lesson);
        }

        // 3. SỬA BÀI HỌC (ADMIN HOẶC LECTURER SỞ HỮU KHÓA HỌC)
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> PutLesson(int id, Lesson lesson)
        {
            if (id != lesson.Id) return BadRequest(new { message = "ID không khớp." });

            var role = User.FindFirst("Role")?.Value ?? User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != "Admin" && role != "Lecturer") return StatusCode(403, new { message = "Từ chối truy cập." });

            var course = await _context.Courses.FirstOrDefaultAsync(c => c.Id == lesson.CourseId);
            if (course == null) return BadRequest(new { message = "Khóa học không tồn tại." });

            // 💡 KIỂM TRA BẢO MẬT: Giảng viên chỉ được sửa bài trong Khóa học của mình
            if (role == "Lecturer")
            {
                var currentUser = await GetCurrentUserAsync();
                if (currentUser == null || course.LecturerId != currentUser.Id)
                {
                    return StatusCode(403, new { message = "Bạn không có quyền sửa bài học trong khóa học của người khác." });
                }
            }

            _context.Entry(lesson).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // 4. XÓA BÀI HỌC (ADMIN HOẶC LECTURER SỞ HỮU KHÓA HỌC)
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteLesson(int id)
        {
            var role = User.FindFirst("Role")?.Value ?? User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != "Admin" && role != "Lecturer") return StatusCode(403, new { message = "Từ chối truy cập." });

            var lesson = await _context.Lessons.FindAsync(id);
            if (lesson == null) return NotFound();

            // 💡 KIỂM TRA BẢO MẬT: Giảng viên chỉ được xóa bài trong Khóa học của mình
            if (role == "Lecturer")
            {
                var course = await _context.Courses.FirstOrDefaultAsync(c => c.Id == lesson.CourseId);
                var currentUser = await GetCurrentUserAsync();
                
                if (course != null && (currentUser == null || course.LecturerId != currentUser.Id))
                {
                    return StatusCode(403, new { message = "Bạn không có quyền xóa bài học trong khóa học của người khác." });
                }
            }

            _context.Lessons.Remove(lesson);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}