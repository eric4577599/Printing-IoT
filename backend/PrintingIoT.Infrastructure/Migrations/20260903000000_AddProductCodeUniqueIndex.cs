using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintingIoT.Infrastructure.Migrations
{
    /// <summary>
    /// S1 / ERP-02:為 Products.ProductCode 建立唯一索引 IX_Products_ProductCode。
    /// 只建索引,不改欄位型別、不刪任何資料。
    ///
    /// 部署注意:正式庫若已有重複 ProductCode,建立唯一索引會失敗。
    /// 上線前需先由 DBA 清理重複資料(本 migration 不執行任何資料清理)。
    /// </summary>
    public partial class AddProductCodeUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Products_ProductCode",
                table: "Products",
                column: "ProductCode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Products_ProductCode",
                table: "Products");
        }
    }
}
