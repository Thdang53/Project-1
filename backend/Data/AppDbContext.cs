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
        public DbSet<UserProfile> UserProfiles { get; set; }
        public DbSet<Submission> Submissions { get; set; }
        public DbSet<AICorrection> AICorrections { get; set; }
        public DbSet<GeminiSession> GeminiSessions { get; set; }
        public DbSet<GeminiMessage> GeminiMessages { get; set; }

        // --- BỘ 3 BẢNG MỚI CHO GIAI ĐOẠN 1 ---
        public DbSet<SpacedRepetition> SpacedRepetitions { get; set; }
        public DbSet<Class> Classes { get; set; }
        public DbSet<ClassStudent> ClassStudents { get; set; }

        public DbSet<Redemption> Redemptions { get; set; }
        public DbSet<AdvisorChat> AdvisorChats { get; set; }
        public DbSet<AdvisorSession> AdvisorSessions { get; set; }
        

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // Đảm bảo Mã tham gia lớp (JoinCode) là độc nhất
            modelBuilder.Entity<Class>()
                .HasIndex(c => c.JoinCode)
                .IsUnique();

            // 🌟 FIX LỖI: Ngăn chặn vòng lặp xóa dây chuyền (Multiple Cascade Paths)
            modelBuilder.Entity<ClassStudent>()
                .HasOne(cs => cs.Student)
                .WithMany() 
                .HasForeignKey(cs => cs.StudentId)
                .OnDelete(DeleteBehavior.Restrict); // Cấm xóa tự động để tránh xung đột
        }
    }
}