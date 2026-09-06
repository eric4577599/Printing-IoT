using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintingIoT.Infrastructure.Migrations
{
    /// <summary>
    /// S6:Users 新增 UsernameNormalized 欄位並建立不分大小寫的唯一索引。
    ///
    /// 目的:讓資料庫層與應用層(AppUsernames.Normalize)採用同一個帳號相等語意 ——
    /// 建立端早就是不分大小寫唯一,登入端卻是精確比對,現場管理者建 OP1、作業員打 op1 會 401(缺口 G-1)。
    ///
    /// Up 的四個步驟順序不可調換:先加可空欄位 → 回填既有列 → 改為 NOT NULL → 建唯一索引。
    /// 既有的 Username 唯一索引全程不動(較寬鬆、冗餘但無害)。
    ///
    /// 部署注意(必讀):
    /// - 本 migration 於開發機**無法實際套用**(該機無 Docker、不連 PostgreSQL),僅完成產生與編譯。
    /// - 套用前必須先確認沒有「只差大小寫」的重複帳號,否則第 4 步建唯一索引會失敗、整個 migration 回滾:
    ///     SELECT UPPER(TRIM("Username")) AS n, COUNT(*) FROM "Users" GROUP BY 1 HAVING COUNT(*) > 1;
    ///   回傳非空表示有重複,必須由 DBA 先合併或改名。
    /// - 本 migration **刻意不做任何自動合併** —— 自動挑一筆刪除會靜默毀掉某個人的帳號。
    /// </summary>
    public partial class AddUsernameNormalizedUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. 先以可空欄位加入,既有列才不會因為 NOT NULL 而立刻失敗
            migrationBuilder.AddColumn<string>(
                name: "UsernameNormalized",
                table: "Users",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            // 2. 回填既有列(與 AppUsernames.Normalize 同一規則:Trim 後轉大寫)
            migrationBuilder.Sql(@"UPDATE ""Users"" SET ""UsernameNormalized"" = UPPER(TRIM(""Username""));");

            // 3. 回填完成後才收緊為 NOT NULL
            migrationBuilder.AlterColumn<string>(
                name: "UsernameNormalized",
                table: "Users",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            // 4. 唯一索引:帳號不分大小寫唯一的最終保證(併發也無法繞過)
            migrationBuilder.CreateIndex(
                name: "IX_Users_UsernameNormalized",
                table: "Users",
                column: "UsernameNormalized",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_UsernameNormalized",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "UsernameNormalized",
                table: "Users");
        }
    }
}
