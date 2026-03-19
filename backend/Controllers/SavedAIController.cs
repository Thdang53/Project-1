using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SavedAIController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly string _connectionString;

        public SavedAIController(IConfiguration configuration)
        {
            _configuration = configuration;
            _connectionString = _configuration.GetConnectionString("DefaultConnection") ?? "";
        }

        public class SaveAIRequest
        {
            public string UserEmail { get; set; } = string.Empty;
            public string Title { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
            public string Difficulty { get; set; } = string.Empty;
            public string Language { get; set; } = string.Empty;
            public string StarterCode { get; set; } = string.Empty;
            public string TestCases { get; set; } = string.Empty;
            public string ContentType { get; set; } = string.Empty; // "Exercise" hoặc "Lesson"
        }

        // 1. API: Lưu bài giảng hoặc bài tập vào Thư viện của User
        [HttpPost("save")]
        public async Task<IActionResult> SaveContent([FromBody] SaveAIRequest request)
        {
            if (string.IsNullOrEmpty(request.UserEmail) || string.IsNullOrEmpty(request.Title))
            {
                return BadRequest(new { success = false, message = "Email và Tiêu đề không được để trống." });
            }

            try
            {
                using (SqlConnection conn = new SqlConnection(_connectionString))
                {
                    await conn.OpenAsync();
                    string query = @"
                        INSERT INTO SavedAIContents 
                        (UserEmail, Title, Description, Difficulty, Language, StarterCode, TestCases, ContentType, SavedAt) 
                        VALUES (@Email, @Title, @Desc, @Diff, @Lang, @Code, @Tests, @Type, GETDATE());";

                    using (SqlCommand cmd = new SqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@Email", request.UserEmail);
                        cmd.Parameters.AddWithValue("@Title", request.Title);
                        cmd.Parameters.AddWithValue("@Desc", request.Description);
                        cmd.Parameters.AddWithValue("@Diff", request.Difficulty ?? "");
                        cmd.Parameters.AddWithValue("@Lang", request.Language ?? "");
                        cmd.Parameters.AddWithValue("@Code", request.StarterCode ?? "");
                        cmd.Parameters.AddWithValue("@Tests", request.TestCases ?? "[]");
                        cmd.Parameters.AddWithValue("@Type", request.ContentType);

                        await cmd.ExecuteNonQueryAsync();
                    }
                }
                return Ok(new { success = true, message = "Đã lưu vào thư viện thành công!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi Database: " + ex.Message });
            }
        }

        // 2. API: Lấy danh sách Thư viện của 1 User
        [HttpGet("user/{email}")]
        public async Task<IActionResult> GetSavedContents(string email)
        {
            try
            {
                var list = new List<object>();
                using (SqlConnection conn = new SqlConnection(_connectionString))
                {
                    await conn.OpenAsync();
                    string query = "SELECT * FROM SavedAIContents WHERE UserEmail = @Email ORDER BY SavedAt DESC";

                    using (SqlCommand cmd = new SqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@Email", email);
                        using (SqlDataReader reader = await cmd.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                list.Add(new
                                {
                                    Id = reader["Id"],
                                    Title = reader["Title"].ToString(),
                                    Description = reader["Description"].ToString(),
                                    Difficulty = reader["Difficulty"].ToString(),
                                    Language = reader["Language"].ToString(),
                                    StarterCode = reader["StarterCode"].ToString(),
                                    TestCases = reader["TestCases"].ToString(),
                                    ContentType = reader["ContentType"].ToString(),
                                    SavedAt = reader["SavedAt"]
                                });
                            }
                        }
                    }
                }
                return Ok(list);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi Database: " + ex.Message });
            }
        }

        // 💡 3. API: Xóa bài khỏi Thư viện (Tính năng mới)
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSavedContent(int id)
        {
            try
            {
                using (SqlConnection conn = new SqlConnection(_connectionString))
                {
                    await conn.OpenAsync();
                    string query = "DELETE FROM SavedAIContents WHERE Id = @Id";

                    using (SqlCommand cmd = new SqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@Id", id);
                        int rowsAffected = await cmd.ExecuteNonQueryAsync();

                        if (rowsAffected > 0)
                        {
                            return Ok(new { success = true, message = "Đã xóa thành công khỏi thư viện." });
                        }
                        else
                        {
                            return NotFound(new { success = false, message = "Không tìm thấy dữ liệu để xóa." });
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi Database: " + ex.Message });
            }
        }
    }
}