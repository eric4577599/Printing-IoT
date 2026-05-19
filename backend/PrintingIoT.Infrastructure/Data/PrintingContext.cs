using Microsoft.EntityFrameworkCore;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.Entities.Maintenance;
using PrintingIoT.Core.Entities.Parts;

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

    // Maintenance
    public DbSet<MaintenanceSchedule> MaintenanceSchedules { get; set; }
    public DbSet<SparePart> SpareParts { get; set; }
    public DbSet<MaintenanceRecord> MaintenanceRecords { get; set; }

    // Parts (Migrated from SmartParts.API — Phase 3.5)
    public DbSet<Part> Parts { get; set; }
    public DbSet<Supplier> Suppliers { get; set; }
    public DbSet<SupplierPart> SupplierParts { get; set; }

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

        // Parts — Unique Index for InternalPN
        modelBuilder.Entity<Part>()
            .HasIndex(p => p.InternalPN)
            .IsUnique();

        // Parts — One-to-Many: Part -> SupplierParts
        modelBuilder.Entity<Part>()
            .HasMany(p => p.SupplierParts)
            .WithOne(sp => sp.Part)
            .HasForeignKey(sp => sp.PartId)
            .OnDelete(DeleteBehavior.Restrict);

        // Parts — One-to-Many: Supplier -> SupplierParts
        modelBuilder.Entity<Supplier>()
            .HasMany(s => s.SupplierParts)
            .WithOne(sp => sp.Supplier)
            .HasForeignKey(sp => sp.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        // Parts — Precision for Price
        modelBuilder.Entity<SupplierPart>()
            .Property(sp => sp.Price)
            .HasPrecision(18, 2);

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
