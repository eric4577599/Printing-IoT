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
    public DbSet<MaintenanceSetting> MaintenanceSettings { get; set; }

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

        // 設定項以 Key + MachineCode 為查詢索引(ERP 同步用 Key 對應)
        modelBuilder.Entity<MaintenanceSetting>()
            .HasIndex(s => new { s.Key, s.MachineCode });
    }
}
