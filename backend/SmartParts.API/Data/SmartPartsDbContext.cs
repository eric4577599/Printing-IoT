using Microsoft.EntityFrameworkCore;
using SmartParts.API.Entities;

namespace SmartParts.API.Data;

public class SmartPartsDbContext : DbContext
{
    public SmartPartsDbContext(DbContextOptions<SmartPartsDbContext> options) : base(options)
    {
    }

    public DbSet<Part> Parts { get; set; }
    public DbSet<Supplier> Suppliers { get; set; }
    public DbSet<SupplierPart> SupplierParts { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Unique Index for InternalPN
        modelBuilder.Entity<Part>()
            .HasIndex(p => p.InternalPN)
            .IsUnique();

        // One-to-Many: Part -> SupplierParts
        modelBuilder.Entity<Part>()
            .HasMany(p => p.SupplierParts)
            .WithOne(sp => sp.Part)
            .HasForeignKey(sp => sp.PartId)
            .OnDelete(DeleteBehavior.Restrict);

        // One-to-Many: Supplier -> SupplierParts
        modelBuilder.Entity<Supplier>()
            .HasMany(s => s.SupplierParts)
            .WithOne(sp => sp.Supplier)
            .HasForeignKey(sp => sp.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        // Precision for Price
        modelBuilder.Entity<SupplierPart>()
            .Property(sp => sp.Price)
            .HasPrecision(18, 2);
    }
}
