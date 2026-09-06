using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintingIoT.Infrastructure.Migrations
{
    /// <summary>
    /// S2 / COMM-04:為 ProductionLogs 新增 Source 欄位(TelemetrySource,存 int)。
    /// 預設 0 = Unknown,讓升級前既有的資料列誠實標示為「來源不明」,不會被誤認成真機資料。
    /// 不改動任何既有欄位、不刪資料。
    /// </summary>
    public partial class AddProductionLogSource : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Source",
                table: "ProductionLogs",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Source",
                table: "ProductionLogs");
        }
    }
}
