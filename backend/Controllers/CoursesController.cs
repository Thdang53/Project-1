using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using backend.Data;
using backend.Models;

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

        // 1. LẤY DANH SÁCH KHÓA HỌC
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Course>>> GetCourses()
        {
            return await _context.Courses.ToListAsync();
        }

        // 2. THÊM KHÓA HỌC (CHỈ ADMIN)
        [HttpPost]
        [Authorize]
        public async Task<ActionResult<Course>> PostCourse(Course course)
        {
            if (User.FindFirst("Role")?.Value != "Admin") return StatusCode(403, new { message = "Từ chối truy cập." });

            _context.Courses.Add(course);
            await _context.SaveChangesAsync();
            return CreatedAtAction("GetCourses", new { id = course.Id }, course);
        }

        // 3. SỬA KHÓA HỌC (CHỈ ADMIN)
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> PutCourse(int id, Course course)
        {
            if (User.FindFirst("Role")?.Value != "Admin") return StatusCode(403);
            if (id != course.Id) return BadRequest(new { message = "ID không khớp." });

            _context.Entry(course).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // 4. XÓA KHÓA HỌC (CHỈ ADMIN)
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteCourse(int id)
        {
            if (User.FindFirst("Role")?.Value != "Admin") return StatusCode(403);
            
            var course = await _context.Courses.FindAsync(id);
            if (course == null) return NotFound();

            _context.Courses.Remove(course);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}