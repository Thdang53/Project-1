using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    // [Authorize(Roles = "Lecturer,Admin")] 
    public class LecturerController : ControllerBase
    {
        private readonly AppDbContext _context;

        public LecturerController(AppDbContext context)
        {
            _context = context;
        }

       // =================================================================
        // 1. LẤY DANH SÁCH BÁO CÁO (ĐÃ KÈM TÊN BÀI TẬP, MÔ TẢ, TÊN SINH VIÊN VÀ CODE)
        // =================================================================
        [HttpGet("pending-flags")]
        public async Task<IActionResult> GetPendingFlags()
        {
            try
            {
                var pendingList = await _context.AICorrections
                    .Where(x => x.IsResolved == false)
                    .OrderBy(x => x.CreatedAt)
                    .Select(x => new {
                        x.Id,
                        x.ExerciseId,
                        // 💡 Tự động lấy Tên bài tập
                        ExerciseTitle = _context.Exercises.Where(e => e.Id == x.ExerciseId).Select(e => e.Title).FirstOrDefault() ?? ("Bài tập #" + x.ExerciseId),
                        
                        // 💡 Lấy Mô tả bài tập (Đề bài)
                        ExerciseDescription = _context.Exercises.Where(e => e.Id == x.ExerciseId).Select(e => e.Description).FirstOrDefault() ?? "Không có dữ liệu đề bài.",
                        
                        x.StudentId,
                        StudentName = _context.Users.Where(u => u.Id == x.StudentId).Select(u => u.FullName ?? u.Email).FirstOrDefault() ?? ("Học viên #" + x.StudentId),
                        x.StudentIssue,
                        x.OriginalAIResponse,
                        x.StudentCode, // 💡 MỚI THÊM: Lấy đoạn code của sinh viên
                        x.CreatedAt
                    })
                    .ToListAsync();

                return Ok(new { success = true, data = pendingList });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        public class ResolveFlagRequest
        {
            public int CorrectionId { get; set; }
            public string LecturerEmail { get; set; } = string.Empty;
            public string LecturerHint { get; set; } = string.Empty;
        }

        // =================================================================
        // 2. GIẢNG VIÊN GỬI "BÍ KÍP" VÀ NHẬN ĐIỂM THƯỞNG
        // =================================================================
        [HttpPost("resolve-flag")]
        public async Task<IActionResult> ResolveFlag([FromBody] ResolveFlagRequest request)
        {
            try
            {
                var correction = await _context.AICorrections.FindAsync(request.CorrectionId);
                if (correction == null) return NotFound(new { message = "Không tìm thấy báo cáo này." });

                if (correction.IsResolved)
                    return BadRequest(new { success = false, message = "Báo cáo này đã được giải quyết rồi." });

                var lecturer = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.LecturerEmail);
                if (lecturer == null) return Unauthorized(new { message = "Không tìm thấy tài khoản Giảng viên." });

                // Cập nhật RAG (Bí kíp)
                correction.LecturerHint = request.LecturerHint;
                correction.LecturerId = lecturer.Id;
                correction.IsResolved = true;

                // Cộng điểm thưởng cho Giảng viên
                lecturer.RewardPoints += 10; 

                await _context.SaveChangesAsync();

                return Ok(new { 
                    success = true, 
                    message = "Cập nhật bộ não AI thành công!",
                    newRewardPoints = lecturer.RewardPoints 
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }
    }
}