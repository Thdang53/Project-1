using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization; // 💡 ĐÃ THÊM: Thư viện bảo mật phân quyền
using Microsoft.AspNetCore.RateLimiting;
using System.Diagnostics;
using System.Text.Json;
using backend.Models;
using backend.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CodeExecutionController : ControllerBase
    {
        private readonly string _tempFolder;
        private readonly AppDbContext _context;

        public CodeExecutionController(AppDbContext context)
        {
            _context = context;
            _tempFolder = Path.Combine(Path.GetTempPath(), "AISandbox");
            if (!Directory.Exists(_tempFolder))
            {
                Directory.CreateDirectory(_tempFolder);
            }
        }

        // ==========================================
        // 1. HÀM CHẠY CODE (KHÔNG LƯU DATABASE)
        // ==========================================
        [HttpPost("run")]
        public async Task<IActionResult> RunCode([FromBody] CodeRequest request)
        {
            string fileExtension = request.Language switch
            {
                "python" => "py",
                "cpp" => "cpp",
                "java" => "java",
                "javascript" => "js",
                _ => "txt"
            };

            if (fileExtension == "txt")
            {
                return BadRequest(new { output = "Ngôn ngữ không được hỗ trợ." });
            }

            // 💡 TỐI ƯU 1: TẠO THƯ MỤC CÁCH LY CHO MỖI LẦN CHẠY
            string executionId = Guid.NewGuid().ToString();
            string executionFolder = Path.Combine(_tempFolder, executionId);
            Directory.CreateDirectory(executionFolder);

            string fileName = $"main.{fileExtension}"; 
            string filePath = Path.Combine(executionFolder, fileName);
            await System.IO.File.WriteAllTextAsync(filePath, request.Code);

            string inputFileName = "input.txt";
            string inputFilePath = Path.Combine(executionFolder, inputFileName);
            await System.IO.File.WriteAllTextAsync(inputFilePath, request.Input ?? "");

            string dockerImage = request.Language switch
            {
                "python" => "python:3.9-slim",
                "cpp" => "gcc:latest",
                "java" => "openjdk:17-slim",
                "javascript" => "node:18-slim",
                _ => ""
            };

            string command = request.Language switch
            {
                "python" => $"python /app/{fileName} < /app/{inputFileName}",
                "cpp" => $"g++ /app/{fileName} -o /app/out && /app/out < /app/{inputFileName}",
                "java" => $"java /app/{fileName} < /app/{inputFileName}",
                "javascript" => $"node /app/{fileName} < /app/{inputFileName}",
                _ => ""
            };

            try
            {
                var processStartInfo = new ProcessStartInfo
                {
                    FileName = "docker",
                    // 💡 TỐI ƯU 2: GIỚI HẠN RAM (256MB) VÀ CPU (0.5) ĐỂ CHỐNG "BOM RAM" + CHẶN MẠNG
                    Arguments = $"run --rm --network none --memory=\"256m\" --cpus=\"0.5\" -v \"{executionFolder}:/app\" -w /app {dockerImage} sh -c \"{command}\"",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = Process.Start(processStartInfo);
                if (process == null)
                {
                    return StatusCode(500, new { output = "Không thể khởi động Sandbox." });
                }

                if (!process.WaitForExit(15000))
                {
                    process.Kill();
                    return Ok(new { output = "LỖI: Time Limit Exceeded (Chạy quá 15 giây).\nNguyên nhân có thể do:\n1. Server Docker đang khởi động chậm.\n2. Code của bạn bị vòng lặp vô hạn (Infinite Loop)." });
                }

                string output = await process.StandardOutput.ReadToEndAsync();
                string error = await process.StandardError.ReadToEndAsync();

                if (error.Contains("EOFError: EOF when reading a line") || error.Contains("std::bad_alloc"))
                {
                     return Ok(new { output = "⚠️ LỖI CHỜ NHẬP LIỆU (EOFError):\n\nCode của bạn có chứa lệnh yêu cầu nhập dữ liệu (như input() trong Python). Vì đây là môi trường đám mây nên máy chủ không thể dừng lại giữa chừng để chờ bạn gõ phím được.\n\n👉 CÁCH GIẢI QUYẾT:\nHãy kéo xuống ô 'Dữ liệu đầu vào (Custom Input)' ở bên phải, gõ SẴN dữ liệu vào đó rồi bấm 'Chạy code' lại nhé!" });
                }

                if (!string.IsNullOrEmpty(error))
                {
                    return Ok(new { output = $"LỖI BIÊN DỊCH/THỰC THI:\n{error}" });
                }

                return Ok(new { output });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { output = $"LỖI MÁY CHỦ: {ex.Message}" });
            }
            finally
            {
                // 💡 TỐI ƯU 3: DỌN RÁC
                if (Directory.Exists(executionFolder))
                {
                    Directory.Delete(executionFolder, true);
                }
            }
        }

        // ==========================================
        // 2. HÀM NỘP BÀI VÀ CHẤM ĐIỂM (CÓ LƯU VÀO DATABASE)
        // ==========================================
        [HttpPost("submit")]
        [Authorize] // 💡 ĐÃ THÊM: Chỉ có sinh viên đăng nhập mới được phép gọi API nộp bài (tránh spam)
        [EnableRateLimiting("ChongSpamCode")] // 💡 Gắn khiên chống Spam vào đây
        public async Task<IActionResult> SubmitCode([FromBody] SubmitCodeRequest request)
        {
            var exercise = await _context.Exercises.FindAsync(request.ExerciseId);
            if (exercise == null) return NotFound(new { message = "Không tìm thấy bài tập." });

            if (string.IsNullOrEmpty(exercise.TestCases))
                return BadRequest(new { message = "Bài tập này chưa được cấu hình Test Case." });

            List<TestCase>? testCases;
            try
            {
                testCases = JsonSerializer.Deserialize<List<TestCase>>(exercise.TestCases!, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch
            {
                return StatusCode(500, new { message = "Dữ liệu Test Case trong DB bị lỗi định dạng." });
            }

            if (testCases == null) return BadRequest(new { message = "Lỗi khi đọc Test Cases." });

            // 💡 TỐI ƯU 4: CHẠY TEST CASE SONG SONG (PARALLEL)
            var tasks = testCases.Select(async (tc, index) =>
            {
                var execResult = await RunCodeInDockerAsync(request.Language, request.Code, tc.Input);

                bool passed = false;
                if (!execResult.IsError)
                {
                    passed = execResult.Output.Trim() == tc.ExpectedOutput.Trim();
                }

                return new TestCaseResult
                {
                    Id = index + 1,
                    Passed = passed,
                    Input = tc.Input,
                    ExpectedOutput = tc.ExpectedOutput,
                    ActualOutput = execResult.IsError ? execResult.Error : execResult.Output.Trim()
                };
            });

            var resultsArray = await Task.WhenAll(tasks);
            var results = resultsArray.OrderBy(r => r.Id).ToList();

            bool allPassed = results.All(r => r.Passed);
            int passedCount = results.Count(r => r.Passed);
            string finalStatus = allPassed ? "Accepted" : "Wrong Answer";

            // LƯU KẾT QUẢ VÀO SQL SERVER
            if (!string.IsNullOrEmpty(request.UserEmail))
            {
                var submission = new Submission
                {
                    UserEmail = request.UserEmail,
                    ExerciseId = request.ExerciseId,
                    Language = request.Language,
                    Code = request.Code,
                    Status = finalStatus,
                    PassedTests = passedCount,
                    TotalTests = testCases.Count,
                    SubmittedAt = DateTime.UtcNow
                };

                _context.Submissions.Add(submission);
                await _context.SaveChangesAsync();
            }

            return Ok(new
            {
                status = finalStatus,
                totalTests = testCases.Count,
                passedTests = passedCount,
                results = results
            });
        }

        // ==========================================
        // 3. API LẤY LỊCH SỬ LÀM BÀI CỦA SINH VIÊN
        // ==========================================
        [HttpGet("submissions/{email}")]
        public async Task<IActionResult> GetUserSubmissions(string email)
        {
            if (string.IsNullOrEmpty(email))
            {
                return BadRequest("Email không hợp lệ.");
            }

            var submissions = await _context.Submissions
                .Where(s => s.UserEmail == email)
                .OrderByDescending(s => s.SubmittedAt)
                .ToListAsync();

            return Ok(submissions);
        }

        // ==========================================
        // HÀM CHẠY NGẦM CHO TEST CASES
        // ==========================================
        private async Task<(string Output, string Error, bool IsError)> RunCodeInDockerAsync(string language, string code, string input)
        {
             string fileExtension = language switch
            {
                "python" => "py",
                "cpp" => "cpp",
                "java" => "java",
                "javascript" => "js",
                _ => "txt"
            };

            string executionId = Guid.NewGuid().ToString();
            string executionFolder = Path.Combine(_tempFolder, executionId);
            Directory.CreateDirectory(executionFolder);

            string fileName = $"main.{fileExtension}";
            string filePath = Path.Combine(executionFolder, fileName);
            await System.IO.File.WriteAllTextAsync(filePath, code);

            string inputFileName = "input.txt";
            string inputFilePath = Path.Combine(executionFolder, inputFileName);
            await System.IO.File.WriteAllTextAsync(inputFilePath, input ?? "");

            string dockerImage = language switch
            {
                "python" => "python:3.9-slim",
                "cpp" => "gcc:latest",
                "java" => "openjdk:17-slim",
                "javascript" => "node:18-slim",
                _ => ""
            };

            string command = language switch
            {
                "python" => $"python /app/{fileName} < /app/{inputFileName}",
                "cpp" => $"g++ /app/{fileName} -o /app/out && /app/out < /app/{inputFileName}",
                "java" => $"java /app/{fileName} < /app/{inputFileName}",
                "javascript" => $"node /app/{fileName} < /app/{inputFileName}",
                _ => ""
            };

            try
            {
                var processStartInfo = new ProcessStartInfo
                {
                    FileName = "docker",
                    // 💡 TỐI ƯU 2: GIỚI HẠN RAM/CPU Ở TRONG TIẾN TRÌNH TEST CASE NGẦM NÀY NỮA
                    Arguments = $"run --rm --network none --memory=\"256m\" --cpus=\"0.5\" -v \"{executionFolder}:/app\" -w /app {dockerImage} sh -c \"{command}\"",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = Process.Start(processStartInfo);
                if (process == null) return ("", "Không thể khởi động Sandbox.", true);

                if (!process.WaitForExit(15000))
                {
                    process.Kill();
                    return ("", "Time Limit Exceeded", true);
                }

                string output = await process.StandardOutput.ReadToEndAsync();
                string error = await process.StandardError.ReadToEndAsync();

                if (!string.IsNullOrEmpty(error)) return ("", error, true);

                return (output, "", false);
            }
            catch (Exception ex)
            {
                return ("", ex.Message, true);
            }
            finally
            {
                if (Directory.Exists(executionFolder))
                {
                    Directory.Delete(executionFolder, true);
                }
            }
        }
    }

    // Các class chứa dữ liệu
    public class CodeRequest
    {
        public string Language { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Input { get; set; } = string.Empty;
    }

    public class TestCase
    {
        public string Input { get; set; } = string.Empty;
        public string ExpectedOutput { get; set; } = string.Empty;
    }

    public class TestCaseResult
    {
        public int Id { get; set; }
        public bool Passed { get; set; }
        public string Input { get; set; } = string.Empty;
        public string ExpectedOutput { get; set; } = string.Empty;
        public string ActualOutput { get; set; } = string.Empty;
    }
}