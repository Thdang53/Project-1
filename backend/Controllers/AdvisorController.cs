using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using backend.Services;
using backend.Data;
using backend.Models;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using System;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,Lecturer")]
    public class AdvisorController : ControllerBase
    {
        private readonly AcademicAdvisorService _advisorService;
        private readonly AppDbContext _context;

        public AdvisorController(AcademicAdvisorService advisorService, AppDbContext context)
        {
            _advisorService = advisorService;
            _context = context;
        }

        // 💡 ĐÃ FIX: Hàm lấy ID Giảng viên an toàn tuyệt đối từ DB
        private async Task<int> GetLecturerIdAsync()
        {
            var email = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("Email")?.Value;
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            return user?.Id ?? 0;
        }

        // ==========================================
        // 🌟 LẤY DANH SÁCH CÁC CUỘC TRÒ CHUYỆN (SESSIONS) 
        // ==========================================
        [HttpGet("sessions/{classId}")]
        public async Task<IActionResult> GetSessions(int classId)
        {
            int lecturerId = await GetLecturerIdAsync();

            var sessions = await _context.AdvisorSessions
                .Where(s => s.ClassId == classId && s.LecturerId == lecturerId)
                .OrderByDescending(s => s.CreatedAt)
                .Select(s => new { s.Id, s.Title, s.CreatedAt })
                .ToListAsync();

            return Ok(new { success = true, data = sessions });
        }

        // ==========================================
        // 🌟 LẤY LỊCH SỬ CHAT THEO ID CỦA CUỘC TRÒ CHUYỆN 
        // ==========================================
        [HttpGet("history/{sessionId}")]
        public async Task<IActionResult> GetChatHistory(int sessionId)
        {
            var history = await _context.AdvisorChats
                .Where(c => c.SessionId == sessionId)
                .OrderBy(c => c.CreatedAt)
                .Select(c => new { role = c.Role, content = c.Content })
                .ToListAsync();
                
            return Ok(new { success = true, data = history });
        }

        public class AdvisorChatRequest
        {
            public int ClassId { get; set; }
            public int? SessionId { get; set; } // 💡 Có thể Null nếu là Chat mới
            public string Message { get; set; } = string.Empty;
        }

        // ==========================================
        // CHAT VỚI AI VÀ LƯU VÀO DATABASE
        // ==========================================
        [HttpPost("chat")]
        public async Task<IActionResult> ChatWithAdvisor([FromBody] AdvisorChatRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Message)) 
                return BadRequest(new { success = false, message = "Tin nhắn trống." });

            int lecturerId = await GetLecturerIdAsync();
            AdvisorSession? session = null;

            if (request.SessionId.HasValue && request.SessionId.Value > 0)
            {
                session = await _context.AdvisorSessions.FindAsync(request.SessionId.Value);
            }

            if (session == null)
            {
                string title = request.Message.Length > 30 ? request.Message.Substring(0, 30) + "..." : request.Message;
                session = new AdvisorSession 
                { 
                    ClassId = request.ClassId, 
                    LecturerId = lecturerId, 
                    Title = title 
                };
                _context.AdvisorSessions.Add(session);
                await _context.SaveChangesAsync();
            }

            _context.AdvisorChats.Add(new AdvisorChat { SessionId = session.Id, Role = "user", Content = request.Message });
            await _context.SaveChangesAsync();

            string reply = await _advisorService.ProcessAdvisorChatAsync(lecturerId, request.ClassId, request.Message);

            _context.AdvisorChats.Add(new AdvisorChat { SessionId = session.Id, Role = "ai", Content = reply });
            await _context.SaveChangesAsync();

            return Ok(new { success = true, reply = reply, sessionId = session.Id });
        }

        public class RadarRequest
        {
            public int ClassId { get; set; }
            public int? SessionId { get; set; } 
        }

        // ==========================================
        // RADAR CẢNH BÁO
        // ==========================================
        [HttpPost("radar-scan")]
        public async Task<IActionResult> ScanAtRiskStudents([FromBody] RadarRequest request)
        {
            int lecturerId = await GetLecturerIdAsync();

            var atRiskStudents = await _context.StudentActivities
                .Include(a => a.Exercise)
                .Where(a => a.Exercise.ClassId == request.ClassId && a.ConsecutiveErrors >= 3 && !a.IsResolved)
                .ToListAsync();

            if (!atRiskStudents.Any())
            {
                return Ok(new { success = true, reply = "✅ **Radar báo cáo:** Lớp học hiện tại rất an toàn. Không có sinh viên nào nộp sai quá 3 lần liên tiếp mà chưa giải quyết được." });
            }

            string prompt = "[LỆNH HỆ THỐNG - KÍCH HOẠT RADAR CẢNH BÁO]\n";
            prompt += "Dưới đây là danh sách các sinh viên đang nộp sai liên tục và có nguy cơ chán nản. Hãy đóng vai trò Cố vấn Học thuật, đọc code sai gần nhất của các em và tóm tắt ngắn gọn thành Bullet Point: Các em đang bị hổng kiến thức gì? Tôi (Giảng viên) nên can thiệp thế nào?\n\n";

            foreach (var activity in atRiskStudents)
            {
                var latestSub = await _context.Submissions
                    .Where(s => s.UserEmail == activity.UserEmail && s.ExerciseId == activity.ExerciseId)
                    .OrderByDescending(s => s.SubmittedAt)
                    .FirstOrDefaultAsync();

                int minutesStruggling = (int)(DateTime.UtcNow - activity.StartTime).TotalMinutes;

                prompt += $"🔴 Sinh viên: {activity.UserEmail}\n";
                prompt += $"- Bài đang làm: {activity.Exercise?.Title ?? "Không rõ"}\n";
                prompt += $"- Thời gian loay hoay: {minutesStruggling} phút\n";
                prompt += $"- Số lần nộp sai liên tiếp: {activity.ConsecutiveErrors}\n";
                prompt += $"- Mã nguồn lỗi gần nhất:\n```\n{latestSub?.Code ?? "Không có dữ liệu code"}\n```\n\n";
            }

            AdvisorSession? session = null;
            if (request.SessionId.HasValue && request.SessionId.Value > 0)
            {
                session = await _context.AdvisorSessions.FindAsync(request.SessionId.Value);
            }

            if (session == null)
            {
                session = new AdvisorSession { ClassId = request.ClassId, LecturerId = lecturerId, Title = "Báo cáo Radar Cảnh báo" };
                _context.AdvisorSessions.Add(session);
                await _context.SaveChangesAsync();
            }

            _context.AdvisorChats.Add(new AdvisorChat { SessionId = session.Id, Role = "user", Content = "📡 Hãy quét Radar và báo cáo tình hình sinh viên yếu kém hiện tại." });
            await _context.SaveChangesAsync();

            string reply = await _advisorService.ProcessAdvisorChatAsync(lecturerId, request.ClassId, prompt);

            _context.AdvisorChats.Add(new AdvisorChat { SessionId = session.Id, Role = "ai", Content = reply });
            await _context.SaveChangesAsync();

            return Ok(new { success = true, reply = reply, sessionId = session.Id });
        }
    }
}