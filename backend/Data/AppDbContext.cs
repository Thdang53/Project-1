using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // Các DbSet này sẽ tương ứng với các bảng trong MySQL
    public DbSet<User> Users { get; set; }
    public DbSet<Course> Courses { get; set; }
}