using Microsoft.EntityFrameworkCore;
using backend.Data;

var builder = WebApplication.CreateBuilder(args);

// 1. Cấu hình SQL Server
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

// 2. Thêm Controllers
builder.Services.AddControllers();

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

app.UseAuthorization();
app.MapControllers();

app.Run();