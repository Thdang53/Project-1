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

        // ==========================================
        // 1. LẤY LỊCH SỬ CHAT THEO LỚP HỌC (DỰA VÀO SESSION)
        // ==========================================
        [HttpGet("history/{classId}")]
        public async Task<IActionResult> GetChatHistory(int classId)
        {
            var claimNameId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int lecturerId = int.TryParse(claimNameId, out int parsedId) ? parsedId : 0;

            // Tìm Phiên trò chuyện (Session) của Giảng viên này trong Lớp này
            var session = await _context.AdvisorSessions
                .FirstOrDefaultAsync(s => s.ClassId == classId && s.LecturerId == lecturerId);

            if (session == null) 
                return Ok(new { success = true, data = new List<object>() }); // Chưa có chat nào

            var history = await _context.AdvisorChats
                .Where(c => c.SessionId == session.Id)
                .OrderBy(c => c.CreatedAt)
                .Select(c => new { role = c.Role, content = c.Content })
                .ToListAsync();
                
            return Ok(new { success = true, data = history });
        }

        public class AdvisorChatRequest
        {
            public int ClassId { get; set; }
            public string Message { get; set; } = string.Empty;
        }

        // ==========================================
        // 2. CHAT VỚI AI VÀ LƯU VÀO DATABASE
        // ==========================================
        [HttpPost("chat")]
        public async Task<IActionResult> ChatWithAdvisor([FromBody] AdvisorChatRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Message)) 
                return BadRequest(new { success = false, message = "Tin nhắn trống." });

            var claimNameId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int lecturerId = int.TryParse(claimNameId, out int parsedId) ? parsedId : 0;

            // Bước 1: Tìm hoặc Tạo Phiên trò chuyện (Session) mới
            var session = await _context.AdvisorSessions
                .FirstOrDefaultAsync(s => s.ClassId == request.ClassId && s.LecturerId == lecturerId);

            if (session == null)
            {
                session = new AdvisorSession 
                { 
                    ClassId = request.ClassId, 
                    LecturerId = lecturerId, 
                    Title = "Phiên tư vấn tự động" 
                };
                _context.AdvisorSessions.Add(session);
                await _context.SaveChangesAsync();
            }

            // Bước 2: Lưu tin nhắn của Giảng viên (user) vào Database (Gắn với SessionId)
            _context.AdvisorChats.Add(new AdvisorChat 
            { 
                SessionId = session.Id, 
                Role = "user", 
                Content = request.Message 
            });
            await _context.SaveChangesAsync();

            // Bước 3: Gọi Bộ não AI xử lý yêu cầu
            string reply = await _advisorService.ProcessAdvisorChatAsync(lecturerId, request.ClassId, request.Message);

            // Bước 4: Lưu câu trả lời của AI (ai) vào Database
            _context.AdvisorChats.Add(new AdvisorChat 
            { 
                SessionId = session.Id, 
                Role = "ai", 
                Content = reply 
            });
            await _context.SaveChangesAsync();

            return Ok(new { success = true, reply = reply });
        }

        public class RadarRequest
        {
            public int ClassId { get; set; }
        }

        // ==========================================
        // 3. 🌟 HỆ THỐNG MỚI: RADAR CẢNH BÁO (KỸ NĂNG 3)
        // ==========================================
        [HttpPost("radar-scan")]
        public async Task<IActionResult> ScanAtRiskStudents([FromBody] RadarRequest request)
        {
            var claimNameId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int lecturerId = int.TryParse(claimNameId, out int parsedId) ? parsedId : 0;

            // 💡 Lọc ra sinh viên nộp sai liên tục >= 3 lần và chưa giải được
            var atRiskStudents = await _context.StudentActivities
                .Include(a => a.Exercise)
                .Where(a => a.Exercise.ClassId == request.ClassId && a.ConsecutiveErrors >= 3 && !a.IsResolved)
                .ToListAsync();

            if (!atRiskStudents.Any())
            {
                return Ok(new { success = true, reply = "✅ **Radar báo cáo:** Lớp học hiện tại rất an toàn. Không có sinh viên nào nộp sai quá 3 lần liên tiếp mà chưa giải quyết được." });
            }

            // 💡 Gói dữ liệu thành Prompt gửi Gemini
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

            var session = await _context.AdvisorSessions
                .FirstOrDefaultAsync(s => s.ClassId == request.ClassId && s.LecturerId == lecturerId);

            if (session == null)
            {
                session = new AdvisorSession { ClassId = request.ClassId, LecturerId = lecturerId, Title = "Phiên tư vấn tự động" };
                _context.AdvisorSessions.Add(session);
                await _context.SaveChangesAsync();
            }

            // Lưu lệnh quét Radar vào DB
            _context.AdvisorChats.Add(new AdvisorChat { SessionId = session.Id, Role = "user", Content = "📡 Hãy quét Radar và báo cáo tình hình sinh viên yếu kém hiện tại." });
            await _context.SaveChangesAsync();

            // Gọi Gemini phân tích
            string reply = await _advisorService.ProcessAdvisorChatAsync(lecturerId, request.ClassId, prompt);

            // Lưu báo cáo AI vào DB
            _context.AdvisorChats.Add(new AdvisorChat { SessionId = session.Id, Role = "ai", Content = reply });
            await _context.SaveChangesAsync();

            return Ok(new { success = true, reply = reply });
        }
    }
}