using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
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
        // 3. API LẤY THỐNG KÊ TIẾN ĐỘ TẤT CẢ NGƯỜI DÙNG (DÀNH CHO ADMIN)
        // ==========================================
        [HttpGet("stats")]
        public async Task<IActionResult> GetStudentStats()
        {
            // 💡 CẬP NHẬT 1: Lấy TẤT CẢ người dùng (cả Admin và Student) để hiện lên bảng Dashboard quản lý
            var users = await _context.Users.ToListAsync();
            
            // Lấy toàn bộ lịch sử nộp bài trong hệ thống
            var submissions = await _context.Submissions.ToListAsync();

            // Tính toán thống kê cho từng người dùng
            var stats = users.Select(u => {
                var userSubs = submissions.Where(s => s.UserEmail == u.Email).ToList();
                
                // Đếm số bài tập "khác nhau" mà người dùng đã giải đúng (Accepted)
                var completedExercises = userSubs
                    .Where(s => s.Status == "Accepted")
                    .Select(s => s.ExerciseId)
                    .Distinct()
                    .Count();

                return new {
                    email = u.Email,
                    fullName = u.FullName,
                    role = u.Role, // 💡 CẬP NHẬT 2: Trả về thêm Role để React vẽ giao diện phân quyền
                    totalSubmissions = userSubs.Count,
                    completedExercises = completedExercises,
                    lastActive = userSubs.OrderByDescending(s => s.SubmittedAt).FirstOrDefault()?.SubmittedAt
                };
            }).OrderByDescending(s => s.completedExercises).ToList(); // Xếp ai giải được nhiều bài lên đầu

            return Ok(stats);
        }

        // ==========================================
        // 4. API MỚI: CẤP HOẶC HẠ QUYỀN ADMIN CHO NGƯỜI DÙNG
        // ==========================================
        [HttpPut("role")]
        [Authorize(Roles = "Admin")] // 💡 Nên mở cờ này lên khi bảo vệ ứng dụng ở môi trường thật
        public async Task<IActionResult> ChangeUserRole([FromBody] ChangeRoleRequest request)
        {
            if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Role))
            {
                return BadRequest(new { message = "Email hoặc Role không hợp lệ." });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (user == null)
            {
                return NotFound(new { message = "Không tìm thấy người dùng này trong hệ thống." });
            }

            // Chỉ cho phép đổi thành "Admin" hoặc "Student"
            if (request.Role != "Admin" && request.Role != "Student")
            {
                return BadRequest(new { message = "Role chỉ có thể là 'Admin' hoặc 'Student'." });
            }

            user.Role = request.Role;
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Đã cấp quyền {request.Role} cho tài khoản {request.Email} thành công!" });
        }
    }

    // 💡 LỚP MODEL MỚI: Hứng dữ liệu đổi quyền từ Frontend gửi lên
    public class ChangeRoleRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }
}