using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintingIoT.Infrastructure.Migrations
{
    /// <summary>
    /// S7:新增 ApiKeys 資料表 —— ERP 等外部系統的機器對機器憑證。
    ///
    /// 目的:S5 讓 /api/erp/push-orders 需要身分之後,ERP 因為沒有互動式登入而完全推不了單。
    /// 本表提供獨立於人員名冊的憑證,自帶撤銷、到期與最後使用時間。
    ///
    /// 只存 SHA-256 雜湊與明文前綴,**明文金鑰不入庫**;前綴唯一索引讓驗證能以單列查找取代全表比對。
    ///
    /// 部署注意:
    /// - 純新增資料表,**沒有 DBA 前置條件**,不像 AddProductCodeUniqueIndex /
    ///   AddUsernameNormalizedUniqueIndex 需要先查既有重複列。
    /// - 套用後資料表是空的,ERP 仍推不了單,必須由 ADMIN 呼叫
    ///   POST /api/v1/apikeys 建立第一支金鑰,並把回應中的明文交給 ERP 端設定(只回傳這一次)。
    /// - 本 migration 於開發機**無法實際套用**(該機無 Docker、不連 PostgreSQL),僅完成產生與編譯。
    /// </summary>
    public partial class AddApiKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ApiKeys",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Prefix = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    KeyHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Role = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastUsedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApiKeys", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ApiKeys_Prefix",
                table: "ApiKeys",
                column: "Prefix",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApiKeys");
        }
    }
}
