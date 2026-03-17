using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backend.Data;
using backend.Models;
using BCrypt.Net;
// 💡 THÊM THƯ VIỆN GOOGLE
using Google.Apis.Auth; 

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // ==========================================
        // 1. API ĐĂNG KÝ (REGISTER)
        // ==========================================
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            // 1. Kiểm tra xem Email đã tồn tại trong hệ thống chưa
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (existingUser != null)
            {
                return BadRequest(new { message = "Email này đã được sử dụng." });
            }

            // 2. Mã hóa mật khẩu trước khi lưu vào DB (Rất quan trọng)
            string hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password);

            // 3. Tạo khuôn User mới để lưu vào DB
            var newUser = new User
            {
                Email = request.Email,
                FullName = request.FullName,
                PasswordHash = hashedPassword,
                Role = "Student" // Mặc định ai đăng ký cũng là sinh viên
            };

            _context.Users.Add(newUser);

            // Cùng lúc tạo luôn một Hồ sơ (Profile) trống cho người này
            var newProfile = new UserProfile
            {
                Email = request.Email,
                FullName = request.FullName
            };
            _context.UserProfiles.Add(newProfile);

            await _context.SaveChangesAsync();

            return Ok(new { message = "Đăng ký tài khoản thành công!" });
        }

        // ==========================================
        // 2. API ĐĂNG NHẬP (LOGIN BẰNG MẬT KHẨU)
        // ==========================================
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            // 1. Tìm user theo Email
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (user == null)
            {
                return Unauthorized(new { message = "Email hoặc mật khẩu không chính xác." });
            }

            // 2. So sánh mật khẩu người dùng nhập với cục PasswordHash trong CSDL
            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
            if (!isPasswordValid)
            {
                return Unauthorized(new { message = "Email hoặc mật khẩu không chính xác." });
            }

            // 3. Nếu đúng hết, tiến hành tạo Thẻ thông hành JWT
            var token = GenerateJwtToken(user);

            return Ok(new 
            { 
                message = "Đăng nhập thành công!",
                token = token,
                user = new {
                    email = user.Email,
                    fullName = user.FullName,
                    role = user.Role
                }
            });
        }

        // ==========================================
        // 3. API ĐĂNG NHẬP BẰNG GOOGLE (OAUTH 2.0)
        // ==========================================
        [HttpPost("google-login")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginDto request)
        {
            try
            {
                // 1. Xác thực thẻ của Google (Check với Client ID của bạn)
                var settings = new GoogleJsonWebSignature.ValidationSettings()
                {
                    Audience = new List<string>() { "920755384852-deu0vgnrhbs4ql97hdgb5pk8966sa990.apps.googleusercontent.com" }
                };

                // Lấy thông tin (Email, Tên) từ thẻ của Google
                var payload = await GoogleJsonWebSignature.ValidateAsync(request.Credential, settings);

                // 2. Tìm xem user có trong Database của mình chưa
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == payload.Email);

                // Nếu chưa có -> Tạo tài khoản mới tự động
                if (user == null)
                {
                    user = new User
                    {
                        Email = payload.Email,
                        FullName = payload.Name,
                        PasswordHash = "GOOGLE_OAUTH_ACCOUNT", // Người dùng Google không cần mật khẩu hệ thống
                        Role = "Student" // Mặc định là sinh viên
                    };
                    _context.Users.Add(user);

                    // Cùng lúc tạo luôn một Hồ sơ (Profile) trống
                    var newProfile = new UserProfile
                    {
                        Email = payload.Email,
                        FullName = payload.Name
                    };
                    _context.UserProfiles.Add(newProfile);

                    await _context.SaveChangesAsync();
                }

                // 3. Cấp Token hệ thống của mình (Giống y hệt đăng nhập thường)
                var token = GenerateJwtToken(user);

                return Ok(new
                {
                    token,
                    user = new { email = user.Email, fullName = user.FullName, role = user.Role }
                });
            }
            catch (InvalidJwtException)
            {
                return Unauthorized(new { message = "Thẻ Google không hợp lệ hoặc đã hết hạn." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi máy chủ C#: " + ex.Message });
            }
        }

        // ==========================================
        // HÀM BÍ MẬT: TẠO THẺ JWT
        // ==========================================
        private string GenerateJwtToken(User user)
        {
            // 1. Lấy mã bí mật từ file cấu hình (appsettings.json)
            var jwtKey = _configuration["JwtSettings:SecretKey"];
            if (string.IsNullOrEmpty(jwtKey))
            {
                throw new Exception("Lỗi hệ thống: Thiếu Secret Key để tạo Token.");
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // 2. Nhét thông tin (Claims) vào trong thẻ
            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Email),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim("FullName", user.FullName),
                new Claim(ClaimTypes.Role, user.Role) // 💡 SỬA: Phải dùng thư viện ClaimTypes chuẩn của Microsoft
            };

            // 3. Đóng gói thẻ (Thời hạn 1 ngày)
            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.Now.AddDays(1),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    // 💡 DTO ĐỂ NHẬN DỮ LIỆU TỪ FE
    public class GoogleLoginDto
    {
        public string Credential { get; set; } = string.Empty;
    }
}