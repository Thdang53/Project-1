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
    public class CoursesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CoursesController(AppDbContext context)
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

        // =======================================================
        // 1. LẤY DANH SÁCH KHÓA HỌC (Ai cũng xem được)
        // =======================================================
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Course>>> GetCourses()
        {
            return await _context.Courses.ToListAsync();
        }

        // =======================================================
        // 2. THÊM KHÓA HỌC (ADMIN & LECTURER)
        // =======================================================
        [HttpPost]
        [Authorize]
        public async Task<ActionResult<Course>> PostCourse(Course course)
        {
            var role = User.FindFirst("Role")?.Value ?? User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != "Admin" && role != "Lecturer") 
                return StatusCode(403, new { message = "Chỉ Admin hoặc Giảng viên mới được tạo khóa học." });

            var currentUser = await GetCurrentUserAsync();
            if (currentUser == null) 
                return Unauthorized(new { message = "Không xác định được danh tính người dùng." });

            // 💡 QUAN TRỌNG: Nếu là Giảng viên, ĐÓNG DẤU CHỦ SỞ HỮU
            if (role == "Lecturer")
            {
                course.LecturerId = currentUser.Id;
            }

            _context.Courses.Add(course);
            await _context.SaveChangesAsync();
            return CreatedAtAction("GetCourses", new { id = course.Id }, course);
        }

        // =======================================================
        // 3. SỬA KHÓA HỌC (ADMIN HOẶC LECTURER LÀ TÁC GIẢ)
        // =======================================================
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> PutCourse(int id, Course course)
        {
            if (id != course.Id) return BadRequest(new { message = "ID không khớp." });

            var role = User.FindFirst("Role")?.Value ?? User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != "Admin" && role != "Lecturer") 
                return StatusCode(403, new { message = "Từ chối truy cập." });

            var existingCourse = await _context.Courses.FindAsync(id);
            if (existingCourse == null) return NotFound(new { message = "Không tìm thấy khóa học." });

            var currentUser = await GetCurrentUserAsync();
            
            // 💡 KIỂM TRA QUYỀN SỞ HỮU
            if (role == "Lecturer")
            {
                if (currentUser == null || existingCourse.LecturerId != currentUser.Id)
                {
                    return StatusCode(403, new { message = "Bạn không có quyền sửa khóa học của giảng viên khác." });
                }
                // Khóa chết LecturerId, không cho phép giảng viên tự ý đổi chủ sở hữu
                course.LecturerId = currentUser.Id; 
            }

            // Cập nhật thông tin mới
            _context.Entry(existingCourse).CurrentValues.SetValues(course);
            await _context.SaveChangesAsync();
            
            return NoContent();
        }

        // =======================================================
        // 4. XÓA KHÓA HỌC (ADMIN HOẶC LECTURER LÀ TÁC GIẢ)
        // =======================================================
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteCourse(int id)
        {
            var role = User.FindFirst("Role")?.Value ?? User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != "Admin" && role != "Lecturer") 
                return StatusCode(403, new { message = "Từ chối truy cập." });

            var course = await _context.Courses.FindAsync(id);
            if (course == null) return NotFound(new { message = "Không tìm thấy khóa học." });

            var currentUser = await GetCurrentUserAsync();

            // 💡 KIỂM TRA QUYỀN SỞ HỮU
            if (role == "Lecturer")
            {
                if (currentUser == null || course.LecturerId != currentUser.Id)
                {
                    return StatusCode(403, new { message = "Bạn không có quyền xóa khóa học của giảng viên khác." });
                }
            }

            _context.Courses.Remove(course);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}