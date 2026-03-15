using Microsoft.EntityFrameworkCore;
using backend.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.AspNetCore.RateLimiting; // 💡 THÊM THƯ VIỆN NÀY
using System.Threading.RateLimiting;     // 💡 THÊM THƯ VIỆN NÀY

var builder = WebApplication.CreateBuilder(args);

// 1. Cấu hình SQL Server
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

// 2. Thêm Controllers
builder.Services.AddControllers();

// =====================================
// KÍCH HOẠT HỆ THỐNG BẢO MẬT BẰNG JWT
// =====================================
var jwtKey = builder.Configuration["JwtSettings:SecretKey"];

// Khóa chương trình ngay lập tức nếu quên cấu hình Key bảo mật
if (string.IsNullOrEmpty(jwtKey))
{
    throw new InvalidOperationException("⚠️ LỖI NGHIÊM TRỌNG: Chưa cấu hình JwtSettings:SecretKey trong file appsettings.json!");
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false; // Tắt bắt buộc HTTPS khi đang chạy dev
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey!)),
            ValidateIssuer = false,   // Không khắt khe nguồn phát lúc đang test
            ValidateAudience = false  // Không khắt khe nguồn nhận lúc đang test
        };
    });

// Code editor này để Backend có thể đi gọi các API khác (Piston, Gemini...)
builder.Services.AddHttpClient();

// 3. Cấu hình Swagger (Giao diện test API)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ==========================================
// 4. MỞ KHÓA CORS CHO FRONTEND (CẬP NHẬT)
// ==========================================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy =>
        {
            policy.WithOrigins(
                    "http://localhost:5173",  // Cổng chạy Vite
                    "http://localhost:8080", 
                    "https://ten-mien-frontend-cua-ban.com" // 💡 Sau này có tên miền thật thì thay vào đây
                  )
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials(); // 💡 Rất quan trọng khi dùng Token/Cookie trên host thật
        });
});

// ==========================================
// 💡 5. CẤU HÌNH RATE LIMITING (CHỐNG SPAM)
// ==========================================
builder.Services.AddRateLimiter(options =>
{
    // Giới hạn mỗi IP chỉ được gọi API 5 lần mỗi 10 giây
    options.AddFixedWindowLimiter("ChongSpamCode", opt =>
    {
        opt.PermitLimit = 5; 
        opt.Window = TimeSpan.FromSeconds(10); 
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0; // Vượt quá là chặn luôn
    });
    
    // Trả về JSON báo lỗi khi bị chặn (HTTP 429)
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = 429;
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync("{\"message\": \"Bạn thao tác quá nhanh! Vui lòng đợi vài giây rồi thử lại.\"}", cancellationToken: token);
    };
});

var app = builder.Build();

// 6. Bật Swagger UI khi ở môi trường Code (Development)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// ==========================================
// KÍCH HOẠT MIDDLEWARE (PHẢI ĐÚNG THỨ TỰ NÀY)
// ==========================================
app.UseCors("AllowReactApp");

app.UseRateLimiter(); // 💡 Kích hoạt khiên chống Spam ngay sau CORS

app.UseAuthentication(); // Kích hoạt hệ thống xác thực JWT
app.UseAuthorization();

app.MapControllers();

app.Run();