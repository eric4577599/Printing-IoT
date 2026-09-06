using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PrintingIoT.Infrastructure.Migrations
{
    /// <summary>
    /// S3 / F1:建立完工實績三張表 ——
    /// ProductionCompletions(主表)、ProductionDefects(不良明細)、ProductionStops(停機明細)。
    ///
    /// 索引:ClientRecordId 唯一(冪等的落地保證)、ProductionDate(報表查詢)。
    /// 兩張子表對 CompletionId 的 FK 為 Cascade;主表刻意不對 Orders 建外鍵 ——
    /// 實績必須比工單活得久,工單被刪除時實績不能跟著消失。
    /// 只新增資料表,不改既有欄位、不刪既有資料。
    /// </summary>
    public partial class AddProductionCompletion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProductionCompletions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientRecordId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: true),
                    OrderNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DeviceId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Operator = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Shift = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    TargetQty = table.Column<int>(type: "integer", nullable: false),
                    GoodQty = table.Column<int>(type: "integer", nullable: false),
                    DefectQty = table.Column<int>(type: "integer", nullable: false),
                    PrepTimeMinutes = table.Column<decimal>(type: "numeric", nullable: false),
                    RunTimeMinutes = table.Column<decimal>(type: "numeric", nullable: false),
                    StopTimeMinutes = table.Column<decimal>(type: "numeric", nullable: false),
                    StopCount = table.Column<int>(type: "integer", nullable: false),
                    AvgSpeed = table.Column<decimal>(type: "numeric", nullable: false),
                    AvailabilityRate = table.Column<decimal>(type: "numeric", nullable: false),
                    PerformanceRate = table.Column<decimal>(type: "numeric", nullable: false),
                    QualityRate = table.Column<decimal>(type: "numeric", nullable: false),
                    Oee = table.Column<decimal>(type: "numeric", nullable: false),
                    ShortageReason = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ProductionDate = table.Column<DateOnly>(type: "date", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductionCompletions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProductionDefects",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CompletionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Reason = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Qty = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductionDefects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductionDefects_ProductionCompletions_CompletionId",
                        column: x => x.CompletionId,
                        principalTable: "ProductionCompletions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductionStops",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CompletionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Reason = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DurationMinutes = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductionStops", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductionStops_ProductionCompletions_CompletionId",
                        column: x => x.CompletionId,
                        principalTable: "ProductionCompletions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProductionCompletions_ClientRecordId",
                table: "ProductionCompletions",
                column: "ClientRecordId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductionCompletions_ProductionDate",
                table: "ProductionCompletions",
                column: "ProductionDate");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionDefects_CompletionId",
                table: "ProductionDefects",
                column: "CompletionId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionStops_CompletionId",
                table: "ProductionStops",
                column: "CompletionId");

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProductionDefects");

            migrationBuilder.DropTable(
                name: "ProductionStops");

            migrationBuilder.DropTable(
                name: "ProductionCompletions");
        }
    }
}
