using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization; // THÊM THƯ VIỆN BẢO MẬT NÀY
using backend.Data;
using backend.Models;

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

        // ==========================================
        // 1. LẤY DANH SÁCH BÀI TẬP (GET) - AI CŨNG XEM ĐƯỢC
        // ==========================================
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Exercise>>> GetExercises()
        {
            if (_context.Exercises == null)
            {
                return NotFound("Không tìm thấy bảng Exercises trong CSDL.");
            }
            // Sắp xếp bài mới nhất lên đầu
            return await _context.Exercises.OrderByDescending(e => e.Id).ToListAsync();
        }

        // ==========================================
        // 2. LẤY 1 BÀI TẬP CỤ THỂ (GET) - AI CŨNG XEM ĐƯỢC
        // ==========================================
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
            var exercise = await _context.Exercises.FirstOrDefaultAsync();
            if (exercise == null) return NotFound(new { message = "Không có bài tập nào trong DB" });
            return Ok(exercise);
        }

        // ==========================================
        // 3. THÊM BÀI TẬP MỚI (POST) - CHỈ ADMIN
        // ==========================================
        [HttpPost]
        [Authorize] // Bắt buộc phải có token JWT (đã đăng nhập)
        public async Task<ActionResult<Exercise>> PostExercise(Exercise exercise)
        {
            // KIỂM TRA QUYỀN ADMIN TỪ TOKEN
            if (User.FindFirst("Role")?.Value != "Admin")
            {
                return StatusCode(403, new { message = "Từ chối truy cập: Chỉ Giảng viên mới có quyền thêm bài tập." });
            }

            if (_context.Exercises == null)
            {
                return Problem("Entity set 'AppDbContext.Exercises' is null.");
            }

            // Gán LessonId mặc định bằng 1 nếu chưa có hệ thống bài giảng
            if (exercise.LessonId <= 0) exercise.LessonId = 1;

            _context.Exercises.Add(exercise);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetExercise", new { id = exercise.Id }, exercise);
        }

        // ==========================================
        // 4. XÓA BÀI TẬP (DELETE) - CHỈ ADMIN
        // ==========================================
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteExercise(int id)
        {
            if (User.FindFirst("Role")?.Value != "Admin")
            {
                return StatusCode(403, new { message = "Từ chối truy cập: Chỉ Giảng viên mới có quyền xóa bài tập." });
            }

            if (_context.Exercises == null) return NotFound();
            
            var exercise = await _context.Exercises.FindAsync(id);
            if (exercise == null) return NotFound();

            // Lưu ý: Nếu bài tập này đã có sinh viên nộp bài (bảng Submissions),
            // SQL có thể chặn không cho xóa để bảo vệ dữ liệu, tùy theo cấu hình Cascade.
            _context.Exercises.Remove(exercise);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // ==========================================
        // 5. CẬP NHẬT BÀI TẬP (PUT) - CHỈ ADMIN
        // ==========================================
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> PutExercise(int id, Exercise exercise)
        {
            if (User.FindFirst("Role")?.Value != "Admin")
            {
                return StatusCode(403, new { message = "Từ chối truy cập: Chỉ Giảng viên mới có quyền sửa bài tập." });
            }

            // Kiểm tra xem ID truyền trên URL có khớp với ID trong thân JSON không
            if (id != exercise.Id)
            {
                return BadRequest(new { message = "ID bài tập không khớp." });
            }

            // Đánh dấu Object này là "Đã bị thay đổi" để Entity Framework lưu đè
            _context.Entry(exercise).State = EntityState.Modified;

            try
            {
                // Lưu xuống SQL Server
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                // Nếu trong quá trình lưu mà phát hiện bài tập này đã bị xóa bởi người khác
                if (!_context.Exercises.Any(e => e.Id == id))
                {
                    return NotFound(new { message = "Không tìm thấy bài tập để sửa." });
                }
                else
                {
                    throw;
                }
            }

            // Trả về mã 204 (No Content) báo hiệu thành công nhưng không cần gửi lại data
            return NoContent();
        }
    }
}