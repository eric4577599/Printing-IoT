using Microsoft.EntityFrameworkCore;
using PrintingIoT.Core.Entities;

namespace PrintingIoT.Infrastructure.Data;

public class PrintingContext : DbContext
{
    public PrintingContext(DbContextOptions<PrintingContext> options) : base(options)
    {
    }

    // Production
    public DbSet<ProductionLog> ProductionLogs { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<MachineSection> MachineSections { get; set; }
    public DbSet<Product> Products { get; set; }

    // Auth (Phase 4.2)
    public DbSet<PrintingIoT.Core.Entities.Auth.User> Users { get; set; }
    public DbSet<PrintingIoT.Core.Entities.Auth.Role> Roles { get; set; }
    public DbSet<PrintingIoT.Core.Entities.Auth.UserRole> UserRoles { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ProductionLog>()
            .HasIndex(p => p.Timestamp)
            .IsDescending();

        // Auth — Unique Username
        modelBuilder.Entity<PrintingIoT.Core.Entities.Auth.User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        // Auth — Role Unique Name
        modelBuilder.Entity<PrintingIoT.Core.Entities.Auth.Role>()
            .HasIndex(r => r.Name)
            .IsUnique();

        // Auth — UserRole Relationships
        modelBuilder.Entity<PrintingIoT.Core.Entities.Auth.UserRole>()
            .HasOne(ur => ur.User)
            .WithMany(u => u.UserRoles)
            .HasForeignKey(ur => ur.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PrintingIoT.Core.Entities.Auth.UserRole>()
            .HasOne(ur => ur.Role)
            .WithMany(r => r.UserRoles)
            .HasForeignKey(ur => ur.RoleId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
