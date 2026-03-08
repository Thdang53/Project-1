using Microsoft.AspNetCore.Mvc;
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

            // 1. Tạo file chứa Code
            string fileName = $"code_{Guid.NewGuid()}.{fileExtension}";
            string filePath = Path.Combine(_tempFolder, fileName);
            await System.IO.File.WriteAllTextAsync(filePath, request.Code);

            // 2. Tạo file chứa Dữ liệu đầu vào (Input)
            string inputFileName = $"input_{Guid.NewGuid()}.txt";
            string inputFilePath = Path.Combine(_tempFolder, inputFileName);
            await System.IO.File.WriteAllTextAsync(inputFilePath, request.Input ?? "");

            string dockerImage = request.Language switch
            {
                "python" => "python:3.9-slim",
                "cpp" => "gcc:latest",
                "java" => "openjdk:17-slim",
                "javascript" => "node:18-slim",
                _ => ""
            };

            // 3. Sử dụng điều hướng file (<) của Linux để nạp dữ liệu vào chương trình
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
                    Arguments = $"run --rm -v \"{_tempFolder}:/app\" -w /app {dockerImage} sh -c \"{command}\"",
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

                // Tăng thời gian chờ lên 15 giây để tránh lỗi Timeout giả do Docker khởi động chậm
                if (!process.WaitForExit(15000))
                {
                    process.Kill();
                    return Ok(new { output = "LỖI: Time Limit Exceeded (Chạy quá 15 giây).\nNguyên nhân có thể do:\n1. Server Docker đang khởi động chậm.\n2. Code của bạn bị vòng lặp vô hạn (Infinite Loop)." });
                }

                string output = await process.StandardOutput.ReadToEndAsync();
                string error = await process.StandardError.ReadToEndAsync();

                // Bắt lỗi khi người dùng quên nhập Custom Input cho hàm input()
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
                // Dọn dẹp cả file Code và file Input sau khi chạy xong
                if (System.IO.File.Exists(filePath)) System.IO.File.Delete(filePath);
                if (System.IO.File.Exists(inputFilePath)) System.IO.File.Delete(inputFilePath);
            }
        }

        [HttpPost("submit")]
        public async Task<IActionResult> SubmitCode([FromBody] SubmitCodeRequest request)
        {
            var exercise = await _context.Exercises.FindAsync(request.ExerciseId);
            if (exercise == null)
            {
                return NotFound(new { message = "Không tìm thấy bài tập." });
            }

            if (string.IsNullOrEmpty(exercise.TestCases))
            {
                return BadRequest(new { message = "Bài tập này chưa được cấu hình Test Case." });
            }

            List<TestCase> testCases;
            try
            {
                testCases = JsonSerializer.Deserialize<List<TestCase>>(exercise.TestCases, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch
            {
                return StatusCode(500, new { message = "Dữ liệu Test Case trong DB bị lỗi định dạng." });
            }

            var results = new List<TestCaseResult>();
            bool allPassed = true;

            for (int i = 0; i < testCases.Count; i++)
            {
                var tc = testCases[i];
                var execResult = await RunCodeInDockerAsync(request.Language, request.Code, tc.Input);

                bool passed = false;
                if (!execResult.IsError)
                {
                    passed = execResult.Output.Trim() == tc.ExpectedOutput.Trim();
                }

                if (!passed) allPassed = false;

                results.Add(new TestCaseResult
                {
                    Id = i + 1,
                    Passed = passed,
                    Input = tc.Input,
                    ExpectedOutput = tc.ExpectedOutput,
                    ActualOutput = execResult.IsError ? execResult.Error : execResult.Output.Trim()
                });
            }

            return Ok(new
            {
                status = allPassed ? "Accepted" : "Wrong Answer",
                totalTests = testCases.Count,
                passedTests = results.Count(r => r.Passed),
                results = results
            });
        }

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

            // 1. Tạo file Code
            string fileName = $"code_{Guid.NewGuid()}.{fileExtension}";
            string filePath = Path.Combine(_tempFolder, fileName);
            await System.IO.File.WriteAllTextAsync(filePath, code);

            // 2. Tạo file Input cho Test Case hiện tại
            string inputFileName = $"input_{Guid.NewGuid()}.txt";
            string inputFilePath = Path.Combine(_tempFolder, inputFileName);
            await System.IO.File.WriteAllTextAsync(inputFilePath, input ?? "");

            string dockerImage = language switch
            {
                "python" => "python:3.9-slim",
                "cpp" => "gcc:latest",
                "java" => "openjdk:17-slim",
                "javascript" => "node:18-slim",
                _ => ""
            };

            // 3. Đọc dữ liệu đầu vào từ file input
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
                    Arguments = $"run --rm -v \"{_tempFolder}:/app\" -w /app {dockerImage} sh -c \"{command}\"",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = Process.Start(processStartInfo);
                if (process == null)
                {
                    return ("", "Không thể khởi động Sandbox.", true);
                }

                if (!process.WaitForExit(15000))
                {
                    process.Kill();
                    return ("", "Time Limit Exceeded", true);
                }

                string output = await process.StandardOutput.ReadToEndAsync();
                string error = await process.StandardError.ReadToEndAsync();

                if (!string.IsNullOrEmpty(error))
                {
                    return ("", error, true);
                }

                return (output, "", false);
            }
            catch (Exception ex)
            {
                return ("", ex.Message, true);
            }
            finally
            {
                // Dọn dẹp cả 2 file
                if (System.IO.File.Exists(filePath)) System.IO.File.Delete(filePath);
                if (System.IO.File.Exists(inputFilePath)) System.IO.File.Delete(inputFilePath);
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