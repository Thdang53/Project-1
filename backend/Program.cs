using Microsoft.EntityFrameworkCore;
using backend.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

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

// 💡 CẬP NHẬT: Khóa chương trình ngay lập tức nếu quên cấu hình Key bảo mật
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

// code editor này để Backend có thể đi gọi các API khác (Piston, Gemini...)
builder.Services.AddHttpClient();

// 3. Cấu hình Swagger (Giao diện test API)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 4. Mở khóa CORS cho phép Frontend (React/Vite) gọi API
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173", "http://localhost:8080") // Các cổng chạy Frontend
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

var app = builder.Build();

// 5. Bật Swagger UI khi ở môi trường Code (Development)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Kích hoạt CORS (Phải đặt trước UseAuthorization)
app.UseCors("AllowReactApp");
app.UseAuthentication(); //Kích hoạt hệ thống xác thực JWT

app.UseAuthorization();
app.MapControllers();

app.Run();
