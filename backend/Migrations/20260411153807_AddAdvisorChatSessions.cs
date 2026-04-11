using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAdvisorChatSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClassId",
                table: "AdvisorChats");

            migrationBuilder.RenameColumn(
                name: "LecturerId",
                table: "AdvisorChats",
                newName: "SessionId");

            migrationBuilder.CreateTable(
                name: "AdvisorSessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClassId = table.Column<int>(type: "int", nullable: false),
                    LecturerId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdvisorSessions", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AdvisorSessions");

            migrationBuilder.RenameColumn(
                name: "SessionId",
                table: "AdvisorChats",
                newName: "LecturerId");

            migrationBuilder.AddColumn<int>(
                name: "ClassId",
                table: "AdvisorChats",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }
    }
}
