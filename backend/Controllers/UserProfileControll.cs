using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserProfileController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UserProfileController(AppDbContext context)
        {
            _context = context;
        }

        // Lấy thông tin hồ sơ theo Email
        // GET: api/UserProfile/test@example.com
        [HttpGet("{email}")]
        public async Task<ActionResult<UserProfile>> GetProfile(string email)
        {
            if (string.IsNullOrEmpty(email))
            {
                return BadRequest(new { message = "Email không hợp lệ." });
            }

            var profile = await _context.UserProfiles.FindAsync(email);
            
            if (profile == null)
            {
                return NotFound(new { message = "Chưa có thông tin hồ sơ cho người dùng này." });
            }

            return Ok(profile);
        }

        // Lưu hoặc Cập nhật hồ sơ (Logic Upsert)
        // POST: api/UserProfile
        [HttpPost]
        public async Task<IActionResult> SaveProfile([FromBody] UserProfile profile)
        {
            if (profile == null || string.IsNullOrEmpty(profile.Email))
            {
                return BadRequest(new { message = "Dữ liệu hồ sơ không hợp lệ hoặc thiếu Email." });
            }

            try
            {
                var existingProfile = await _context.UserProfiles.FindAsync(profile.Email);

                if (existingProfile == null)
                {
                    // Nếu chưa có trong hệ thống thì thêm bản ghi mới
                    _context.UserProfiles.Add(profile);
                }
                else
                {
                    // Nếu đã có thì cập nhật các thông tin mới từ giao diện
                    existingProfile.FullName = profile.FullName;
                    existingProfile.Nickname = profile.Nickname;
                    existingProfile.AvatarUrl = profile.AvatarUrl;
                    existingProfile.Location = profile.Location;
                    existingProfile.GithubUrl = profile.GithubUrl;
                    existingProfile.Bio = profile.Bio;
                    existingProfile.ContactInfo = profile.ContactInfo;
                }

                await _context.SaveChangesAsync();
                return Ok(new { message = "Đã lưu vào SQL Server thành công!" });
            }
            catch (Exception ex)
            {
                // Trả về lỗi chi tiết nếu có sự cố xảy ra trong quá trình lưu
                return StatusCode(500, new { message = "Lỗi khi lưu dữ liệu vào SQL Server.", details = ex.Message });
            }
        }

        // ==========================================
        // 3. API MỚI: LẤY THỐNG KÊ TIẾN ĐỘ SINH VIÊN (DÀNH CHO ADMIN)
        // ==========================================
        [HttpGet("stats")]
        public async Task<IActionResult> GetStudentStats()
        {
            // Lấy danh sách tất cả những người dùng có Role là "Student"
            var users = await _context.Users.Where(u => u.Role == "Student").ToListAsync();
            
            // Lấy toàn bộ lịch sử nộp bài trong hệ thống
            var submissions = await _context.Submissions.ToListAsync();

            // Tính toán thống kê cho từng sinh viên
            var stats = users.Select(u => {
                var userSubs = submissions.Where(s => s.UserEmail == u.Email).ToList();
                
                // Đếm số bài tập "khác nhau" mà sinh viên đã giải đúng (Accepted)
                var completedExercises = userSubs
                    .Where(s => s.Status == "Accepted")
                    .Select(s => s.ExerciseId)
                    .Distinct()
                    .Count();

                return new {
                    email = u.Email,
                    fullName = u.FullName,
                    totalSubmissions = userSubs.Count,
                    completedExercises = completedExercises,
                    lastActive = userSubs.OrderByDescending(s => s.SubmittedAt).FirstOrDefault()?.SubmittedAt
                };
            }).OrderByDescending(s => s.completedExercises).ToList(); // Xếp ai giải được nhiều bài lên đầu

            return Ok(stats);
        }
    }
}