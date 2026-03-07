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

            string fileName = $"code_{Guid.NewGuid()}.{fileExtension}";
            string filePath = Path.Combine(_tempFolder, fileName);
            await System.IO.File.WriteAllTextAsync(filePath, request.Code);

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
                "python" => $"python /app/{fileName}",
                "cpp" => $"g++ /app/{fileName} -o /app/out && /app/out",
                "java" => $"java /app/{fileName}",
                "javascript" => $"node /app/{fileName}",
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

                if (!string.IsNullOrEmpty(request.Input))
                {
                    using (var streamWriter = process.StandardInput)
                    {
                        await streamWriter.WriteAsync(request.Input);
                    }
                }

                if (!process.WaitForExit(5000))
                {
                    process.Kill();
                    return Ok(new { output = "LỖI: Time Limit Exceeded (Chạy quá 5 giây)." });
                }

                string output = await process.StandardOutput.ReadToEndAsync();
                string error = await process.StandardError.ReadToEndAsync();

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
                if (System.IO.File.Exists(filePath))
                {
                    System.IO.File.Delete(filePath);
                }
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

            string fileName = $"code_{Guid.NewGuid()}.{fileExtension}";
            string filePath = Path.Combine(_tempFolder, fileName);
            await System.IO.File.WriteAllTextAsync(filePath, code);

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
                "python" => $"python /app/{fileName}",
                "cpp" => $"g++ /app/{fileName} -o /app/out && /app/out",
                "java" => $"java /app/{fileName}",
                "javascript" => $"node /app/{fileName}",
                _ => ""
            };

            try
            {
                var processStartInfo = new ProcessStartInfo
                {
                    FileName = "docker",
                    Arguments = $"run -i --rm -v \"{_tempFolder}:/app\" -w /app {dockerImage} sh -c \"{command}\"",
                    RedirectStandardInput = true,
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

                if (!string.IsNullOrEmpty(input))
                {
                    using (var streamWriter = process.StandardInput)
                    {
                        await streamWriter.WriteAsync(input);
                    }
                }

                if (!process.WaitForExit(5000))
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
                if (System.IO.File.Exists(filePath))
                {
                    System.IO.File.Delete(filePath);
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