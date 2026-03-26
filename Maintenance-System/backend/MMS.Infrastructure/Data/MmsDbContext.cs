using Microsoft.EntityFrameworkCore;
using MMS.Core.Entities;

namespace MMS.Infrastructure.Data;

public class MmsDbContext : DbContext
{
    public MmsDbContext(DbContextOptions<MmsDbContext> options) : base(options)
    {
    }

    public DbSet<MaintenanceSchedule> MaintenanceSchedules { get; set; }
    public DbSet<SparePart> SpareParts { get; set; }
    public DbSet<MaintenanceRecord> MaintenanceRecords { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Configuration if needed
        modelBuilder.Entity<MaintenanceRecord>()
            .HasOne<MaintenanceSchedule>()
            .WithMany()
            .HasForeignKey(r => r.ScheduleId);
            
        modelBuilder.Entity<MaintenanceRecord>()
            .HasOne<SparePart>()
            .WithMany()
            .HasForeignKey(r => r.PartId);
    }
}
