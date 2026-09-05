using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintingIoT.Infrastructure.Migrations
{
    /// <summary>
    /// S7:新增 RefreshTokens 資料表 —— 權杖刷新憑證。
    ///
    /// 目的:解決 S6 遺留的 E2。存取權杖 2 小時到期後,下一次 API 呼叫回 401,
    /// 現場**未存檔的表單資料會直接遺失**。刷新憑證效期涵蓋一個班
    /// (Auth:RefreshTokenHours,預設 12 小時),前端在 401 當下換發並重送原請求。
    ///
    /// 只存 SHA-256 雜湊,明文只在登入 / 刷新的回應中出現一次。憑證一次性且輪替:
    /// 每次換發都作廢舊的,已作廢的憑證再度出現即視為外洩並作廢該使用者全部憑證。
    ///
    /// 部署注意:
    /// - 純新增資料表,**沒有 DBA 前置條件**。
    /// - 套用後既有的登入階段仍然有效(存取權杖不受影響),但**它們沒有刷新憑證** ——
    ///   舊階段仍會在 2 小時後被登出一次,下一次登入起才享有刷新。
    /// - 本 migration 於開發機**無法實際套用**(該機無 Docker、不連 PostgreSQL),僅完成產生與編譯。
    /// </summary>
    public partial class AddRefreshTokens : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RefreshTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedByIp = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RefreshTokens_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_TokenHash",
                table: "RefreshTokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_UserId",
                table: "RefreshTokens",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RefreshTokens");
        }
    }
}
