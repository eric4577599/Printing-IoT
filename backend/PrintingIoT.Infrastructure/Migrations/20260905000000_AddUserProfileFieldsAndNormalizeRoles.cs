using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintingIoT.Infrastructure.Migrations
{
    /// <summary>
    /// S5:Users 新增 DisplayName / Shift 兩個可空欄位,並把既有 Roles.Name 正規化為大寫。
    ///
    /// 角色大寫是「兩道保險」的第二道 —— 第一道是 AuthController 簽發權杖時的
    /// AppRoles.Normalize;即使本 migration 尚未套用,授權仍會正確。
    ///
    /// 部署注意:本 migration 於開發機無法實際套用(該機無 Docker、不連 PostgreSQL),
    /// 僅完成產生與編譯,首次套用請先備份資料庫。
    /// Roles.Name 有唯一索引,若正式庫同時存在 "Admin" 與 "ADMIN" 兩列,UPPER 會撞唯一鍵而失敗,
    /// 需由 DBA 先合併重複列(本 migration 不做任何資料合併)。
    /// </summary>
    public partial class AddUserProfileFieldsAndNormalizeRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DisplayName",
                table: "Users",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Shift",
                table: "Users",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            // 正規化既有角色列(舊資料可能是 "Admin" / "Operator")
            migrationBuilder.Sql(@"UPDATE ""Roles"" SET ""Name"" = UPPER(""Name"");");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "DisplayName", table: "Users");
            migrationBuilder.DropColumn(name: "Shift", table: "Users");
            // 角色大小寫刻意不還原:還原無意義且可能破壞既有授權資料
        }
    }
}
