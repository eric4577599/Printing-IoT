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

    // S3 / F1:完工實績(主表 + 不良明細 + 停機明細)
    public DbSet<ProductionCompletion> ProductionCompletions { get; set; }
    public DbSet<ProductionDefect> ProductionDefects { get; set; }
    public DbSet<ProductionStop> ProductionStops { get; set; }

    // S3 / F5:停機 / 不良原因主檔
    public DbSet<ReasonCode> ReasonCodes { get; set; }

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

        // S1 / ERP-02:產品碼唯一索引(ERP 推單自動建立佔位產品時,靠它擋掉同碼重複列)
        modelBuilder.Entity<Product>()
            .HasIndex(p => p.ProductCode)
            .IsUnique();

        // S3 / F1:ClientRecordId 唯一索引 —— 冪等的落地保證(同一筆完工重送不會長第二列)
        modelBuilder.Entity<ProductionCompletion>()
            .HasIndex(c => c.ClientRecordId)
            .IsUnique();

        // S3 / F1:報表以工廠日查詢,加索引
        modelBuilder.Entity<ProductionCompletion>()
            .HasIndex(c => c.ProductionDate);

        // S3 / F1:兩張子表對 CompletionId 的 FK,主表刪除時連帶刪除明細。
        // 刻意不對 Order 建立導覽屬性(只留 OrderId)——實績必須比工單活得久。
        modelBuilder.Entity<ProductionCompletion>()
            .HasMany(c => c.Defects)
            .WithOne()
            .HasForeignKey(d => d.CompletionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProductionCompletion>()
            .HasMany(c => c.Stops)
            .WithOne()
            .HasForeignKey(s => s.CompletionId)
            .OnDelete(DeleteBehavior.Cascade);

        // S3 / F5:(Type, Code) 複合唯一索引
        modelBuilder.Entity<ReasonCode>()
            .HasIndex(r => new { r.Type, r.Code })
            .IsUnique();

        // Auth — Unique Username(保留:較寬鬆但無害的既有索引,移除只是多餘的變動)
        modelBuilder.Entity<PrintingIoT.Core.Entities.Auth.User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        // S6 / Auth — 帳號不分大小寫唯一:唯一索引建在正規化欄位上,
        // 讓資料庫層與應用層(AppUsernames.Normalize)採用同一個相等語意,
        // 併發時無法繞過 CreateUser 的重複檢查。
        modelBuilder.Entity<PrintingIoT.Core.Entities.Auth.User>()
            .HasIndex(u => u.UsernameNormalized)
            .IsUnique()
            .HasDatabaseName("IX_Users_UsernameNormalized");

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
