using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Course> Courses { get; set; }
        public DbSet<Lesson> Lessons { get; set; }
        public DbSet<Exercise> Exercises { get; set; }
        
        // THÊM DÒNG NÀY VÀO ĐỂ EF BIẾT TẠO BẢNG USERPROFILES
        public DbSet<UserProfile> UserProfiles { get; set; }

        // BẢNG MỚI: LƯU TRỮ LỊCH SỬ NỘP BÀI CỦA SINH VIÊN
        public DbSet<Submission> Submissions { get; set; }

        // Hàm này giữ lại nhưng để trống, dành cho các cấu hình nâng cao sau này nếu cần
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // ĐÃ XÓA TOÀN BỘ SEED DATA. 
            // Từ nay Khóa học và Bài học sẽ do Admin tự quản lý động trên Giao diện Web!
        }
    }
}