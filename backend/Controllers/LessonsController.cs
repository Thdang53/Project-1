using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using backend.Data;
using backend.Models;

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

        // 1. LẤY DANH SÁCH BÀI HỌC
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Lesson>>> GetLessons()
        {
            return await _context.Lessons.ToListAsync();
        }

        // 2. THÊM BÀI HỌC (CHỈ ADMIN)
        [HttpPost]
        [Authorize]
        public async Task<ActionResult<Lesson>> PostLesson(Lesson lesson)
        {
            if (User.FindFirst("Role")?.Value != "Admin") return StatusCode(403);

            var courseExists = await _context.Courses.AnyAsync(c => c.Id == lesson.CourseId);
            if (!courseExists) return BadRequest(new { message = "Khóa học không tồn tại." });

            _context.Lessons.Add(lesson);
            await _context.SaveChangesAsync();
            return CreatedAtAction("GetLessons", new { id = lesson.Id }, lesson);
        }

        // 3. SỬA BÀI HỌC (CHỈ ADMIN)
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> PutLesson(int id, Lesson lesson)
        {
            if (User.FindFirst("Role")?.Value != "Admin") return StatusCode(403);
            if (id != lesson.Id) return BadRequest(new { message = "ID không khớp." });

            var courseExists = await _context.Courses.AnyAsync(c => c.Id == lesson.CourseId);
            if (!courseExists) return BadRequest(new { message = "Khóa học không tồn tại." });

            _context.Entry(lesson).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // 4. XÓA BÀI HỌC (CHỈ ADMIN)
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteLesson(int id)
        {
            if (User.FindFirst("Role")?.Value != "Admin") return StatusCode(403);
            
            var lesson = await _context.Lessons.FindAsync(id);
            if (lesson == null) return NotFound();

            _context.Lessons.Remove(lesson);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}