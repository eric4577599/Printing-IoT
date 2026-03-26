using Microsoft.EntityFrameworkCore;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.Entities.Maintenance;

namespace PrintingIoT.Infrastructure.Data;

public class PrintingContext : DbContext
{
    public PrintingContext(DbContextOptions<PrintingContext> options) : base(options)
    {
    }

    public DbSet<ProductionLog> ProductionLogs { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<MachineSection> MachineSections { get; set; }
    public DbSet<Product> Products { get; set; }

    // Maintenance
    public DbSet<MaintenanceSchedule> MaintenanceSchedules { get; set; }
    public DbSet<SparePart> SpareParts { get; set; }
    public DbSet<MaintenanceRecord> MaintenanceRecords { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.Entity<ProductionLog>()
            .HasIndex(p => p.Timestamp)
            .IsDescending();
    }
}
