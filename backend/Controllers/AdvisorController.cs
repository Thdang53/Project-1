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

            // Bước 3: Gọi Bộ não AI xử lý yêu cầu (Tạm thời vẫn dùng hàm cũ)
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
    }
}