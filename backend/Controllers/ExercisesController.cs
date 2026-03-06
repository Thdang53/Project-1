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

        // Lấy bài tập đầu tiên trong hệ thống để hiển thị lên Workspace
        // GET: api/Exercises/first
        [HttpGet("first")]
        public async Task<ActionResult<Exercise>> GetFirstExercise()
        {
            var exercise = await _context.Exercises.FirstOrDefaultAsync();
            
            if (exercise == null)
            {
                return NotFound(new { message = "Chưa có bài tập nào trong database." });
            }

            return Ok(exercise);
        }
    }
}