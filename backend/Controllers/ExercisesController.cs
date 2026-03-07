using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

        // GET: api/Exercises
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Exercise>>> GetExercises()
        {
            if (_context.Exercises == null)
            {
                return NotFound("Không tìm thấy bảng Exercises trong CSDL.");
            }
            return await _context.Exercises.ToListAsync();
        }

        // GET: api/Exercises/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Exercise>> GetExercise(int id)
        {
            if (_context.Exercises == null)
            {
                return NotFound();
            }
            var exercise = await _context.Exercises.FindAsync(id);

            if (exercise == null)
            {
                return NotFound();
            }

            return exercise;
        }
        
        // Cứ giữ lại cái GET "first" để trang Workspace mặc định có bài nếu không chọn từ list
        [HttpGet("first")]
        public async Task<ActionResult<Exercise>> GetFirstExercise()
        {
            if (_context.Exercises == null)
            {
                return NotFound(new { message = "Chưa có kết nối Database" });
            }

            var exercise = await _context.Exercises.FirstOrDefaultAsync();

            if (exercise == null)
            {
                return NotFound(new { message = "Không có bài tập nào trong DB" });
            }

            return Ok(exercise);
        }
    }
}