using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintingIoT.Infrastructure.Migrations
{
    /// <summary>
    /// S3 / F5:建立停機 / 不良原因主檔(ReasonCodes)與 (Type, Code) 複合唯一索引,
    /// 並種入現行寫死在前端彈窗內的清單 —— 升級後現場看到的內容與今天完全一致。
    ///
    /// 種子列的 Id 一律為寫死的固定 GUID(不可用 Guid.NewGuid()),否則 migration 不可重現。
    /// 只新增資料表,不改既有欄位、不刪既有資料。
    /// </summary>
    public partial class AddReasonCodes : Migration
    {
        /// <summary>種子資料的建立時間(固定值,保持 migration 可重現)。</summary>
        private static readonly DateTime SeedCreatedAt = new DateTime(2026, 9, 4, 0, 0, 0, DateTimeKind.Utc);

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ReasonCodes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReasonCodes", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReasonCodes_Type_Code",
                table: "ReasonCodes",
                columns: new[] { "Type", "Code" },
                unique: true);

            // 停機原因(Type = 0):與 StopReasonModal 原本寫死的六筆一致
            migrationBuilder.InsertData(
                table: "ReasonCodes",
                columns: new[] { "Id", "Type", "Code", "Name", "Category", "DisplayOrder", "IsActive", "CreatedAt" },
                values: new object[,]
                {
                    { new Guid("a1000000-0000-4000-8000-000000000001"), 0, "001", "送紙歪斜", "General", 1, true, SeedCreatedAt },
                    { new Guid("a1000000-0000-4000-8000-000000000002"), 0, "002", "印刷不清", "General", 2, true, SeedCreatedAt },
                    { new Guid("a1000000-0000-4000-8000-000000000003"), 0, "003", "紙張破裂", "General", 3, true, SeedCreatedAt },
                    { new Guid("a1000000-0000-4000-8000-000000000004"), 0, "004", "油墨不足", "General", 4, true, SeedCreatedAt },
                    { new Guid("a1000000-0000-4000-8000-000000000005"), 0, "005", "機械故障", "General", 5, true, SeedCreatedAt },
                    { new Guid("a1000000-0000-4000-8000-000000000006"), 0, "006", "其他", "General", 6, true, SeedCreatedAt },
                });

            // 不良原因(Type = 1):與 FinishOrderModal 原本寫死的四筆一致
            migrationBuilder.InsertData(
                table: "ReasonCodes",
                columns: new[] { "Id", "Type", "Code", "Name", "Category", "DisplayOrder", "IsActive", "CreatedAt" },
                values: new object[,]
                {
                    { new Guid("a2000000-0000-4000-8000-000000000001"), 1, "A01", "壓扁", "General", 1, true, SeedCreatedAt },
                    { new Guid("a2000000-0000-4000-8000-000000000002"), 1, "A02", "印刷不良", "General", 2, true, SeedCreatedAt },
                    { new Guid("a2000000-0000-4000-8000-000000000003"), 1, "A03", "自檢不良", "General", 3, true, SeedCreatedAt },
                    { new Guid("a2000000-0000-4000-8000-000000000004"), 1, "A04", "超量", "General", 4, true, SeedCreatedAt },
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // 整張表刪除即連同種子列一併消失,不需逐列 DeleteData
            migrationBuilder.DropTable(
                name: "ReasonCodes");
        }
    }
}
