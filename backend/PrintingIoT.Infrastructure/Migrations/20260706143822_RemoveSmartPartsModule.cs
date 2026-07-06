using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintingIoT.Infrastructure.Migrations
{
    /// <summary>
    /// RemoveSmartPartsModule — 零件管理(採購主檔)模組移出主系統(C′ 遷移 P4,2026-07-06)。
    /// 資料已於回2 搬入 MmsDB(MM 外掛),並有備份留存於 MM/backups/flexodb-backup-*.sql。
    /// </summary>
    public partial class RemoveSmartPartsModule : Migration
    {
        /// <summary>
        /// Up:自 FlexoDB 移除零件管理三表。
        /// 輸入:套用前資料庫(含 Parts/Suppliers/SupplierParts)。輸出:三表已 drop 的資料庫。
        /// 邏輯:先刪子表 SupplierParts(持有兩組 FK),再刪父表 Parts、Suppliers,避免 FK 阻擋。
        /// </summary>
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SupplierParts");

            migrationBuilder.DropTable(
                name: "Parts");

            migrationBuilder.DropTable(
                name: "Suppliers");
        }

        /// <summary>
        /// Down:重建零件管理三表「結構」。
        /// 輸入:三表已 drop 的資料庫。輸出:三表結構還原的資料庫(欄位/型別/Guid PK/
        /// IX_Parts_InternalPN 唯一索引/兩組 Restrict FK/Price precision(18,2) 與移除前逐項一致)。
        /// 注意:Down 僅還原「結構」,不還原資料 — 資料還原須另自 MM/backups/ 的
        /// flexodb-backup-*.sql 匯入,或自 MmsDB 反向搬移。
        /// </summary>
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Parts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    InternalPN = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SafeStockLevel = table.Column<int>(type: "integer", nullable: false),
                    Specification = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Unit = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Parts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Suppliers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContactPerson = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Email = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Suppliers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SupplierParts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PartId = table.Column<Guid>(type: "uuid", nullable: false),
                    SupplierId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsPreferred = table.Column<bool>(type: "boolean", nullable: false),
                    LeadTimeDays = table.Column<int>(type: "integer", nullable: true),
                    ManufacturerPN = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupplierParts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupplierParts_Parts_PartId",
                        column: x => x.PartId,
                        principalTable: "Parts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SupplierParts_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Parts_InternalPN",
                table: "Parts",
                column: "InternalPN",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SupplierParts_PartId",
                table: "SupplierParts",
                column: "PartId");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierParts_SupplierId",
                table: "SupplierParts",
                column: "SupplierId");
        }
    }
}
