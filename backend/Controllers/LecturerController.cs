using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LecturerController : ControllerBase
    {
        private readonly AppDbContext _context;

        public LecturerController(AppDbContext context)
        {
            _context = context;
        }

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
                        ExerciseTitle = _context.Exercises.Where(e => e.Id == x.ExerciseId).Select(e => e.Title).FirstOrDefault() ?? ("Bài tập #" + x.ExerciseId),
                        ExerciseDescription = _context.Exercises.Where(e => e.Id == x.ExerciseId).Select(e => e.Description).FirstOrDefault() ?? "Không có dữ liệu đề bài.",
                        x.StudentId,
                        StudentName = _context.Users.Where(u => u.Id == x.StudentId).Select(u => u.FullName ?? u.Email).FirstOrDefault() ?? ("Học viên #" + x.StudentId),
                        x.StudentIssue,
                        x.OriginalAIResponse,
                        x.StudentCode,
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

                correction.LecturerHint = request.LecturerHint;
                correction.LecturerId = lecturer.Id;
                correction.IsResolved = true;

                lecturer.RewardPoints += 10; 
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Cập nhật bộ não AI thành công!", newRewardPoints = lecturer.RewardPoints });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        public class RedeemRewardRequest
        {
            public string Email { get; set; } = string.Empty;
            public int Cost { get; set; }
            public string RewardName { get; set; } = string.Empty;
        }

        [HttpPost("redeem-reward")]
        public async Task<IActionResult> RedeemReward([FromBody] RedeemRewardRequest request)
        {
            try
            {
                var lecturer = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
                if (lecturer == null) return Unauthorized(new { message = "Không tìm thấy người dùng." });

                if (lecturer.RewardPoints < request.Cost)
                    return BadRequest(new { success = false, message = "Số dư điểm không đủ để đổi món quà này." });

                // Trừ điểm
                lecturer.RewardPoints -= request.Cost;

                // 💡 LƯU VÀO DATABASE BẢNG LỊCH SỬ
                var redemption = new Redemption
                {
                    LecturerId = lecturer.Id,
                    ItemName = request.RewardName,
                    Cost = request.Cost,
                    Status = "Đang xử lý",
                    Code = "Chờ cấp mã",
                    RedeemedAt = DateTime.UtcNow
                };
                _context.Redemptions.Add(redemption);

                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Đổi quà thành công!", newBalance = lecturer.RewardPoints });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        [HttpGet("my-points")]
        public async Task<IActionResult> GetMyPoints([FromQuery] string email)
        {
            var lecturer = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (lecturer == null) return Unauthorized(new { message = "Không tìm thấy người dùng." });
            return Ok(new { success = true, points = lecturer.RewardPoints });
        }

        // =================================================================
        // 💡 API MỚI: LẤY LỊCH SỬ ĐỔI QUÀ TỪ DATABASE
        // =================================================================
        [HttpGet("my-redemptions")]
        public async Task<IActionResult> GetMyRedemptions([FromQuery] string email)
        {
            try
            {
                var lecturer = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
                if (lecturer == null) return Unauthorized();

                var history = await _context.Redemptions
                    .Where(r => r.LecturerId == lecturer.Id)
                    .OrderByDescending(r => r.RedeemedAt)
                    .ToListAsync();

                var formattedHistory = history.Select(r => new {
                    date = r.RedeemedAt.ToLocalTime().ToString("dd/MM/yyyy"),
                    item = r.ItemName,
                    status = r.Status,
                    code = r.Code,
                    statusColor = r.Status == "Đang xử lý" ? "bg-warning/10 text-warning border-warning/20" : "bg-success/10 text-success border-success/20"
                });

                return Ok(new { success = true, data = formattedHistory });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }
    }
}