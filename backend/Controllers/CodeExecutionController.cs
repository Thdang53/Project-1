using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Text;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CodeExecutionController : ControllerBase
    {
        public class CodeRequest
        {
            public string Language { get; set; } = "python";
            public string Code { get; set; } = string.Empty;
            public string Input { get; set; } = string.Empty; // Chấp nhận dữ liệu nhập từ bàn phím
        }

        [HttpPost("run")]
        public IActionResult RunCode([FromBody] CodeRequest request)
        {
            string dockerImage = "";
            string dockerCommand = "";

            // KỸ THUẬT: Mã hóa Code thành Base64 để truyền an toàn qua CommandLine của Docker
            // Giúp tránh mọi lỗi liên quan đến ký tự đặc biệt (" ", ', \n) trong code
            string base64Code = Convert.ToBase64String(Encoding.UTF8.GetBytes(request.Code));

            // Phân loại ngôn ngữ
            switch (request.Language.ToLower())
            {
                case "python":
                case "py":
                    dockerImage = "python:3.10-alpine";
                    dockerCommand = $"sh -c \"echo {base64Code} | base64 -d > main.py && python main.py\"";
                    break;
                case "javascript":
                case "js":
                    dockerImage = "node:alpine";
                    dockerCommand = $"sh -c \"echo {base64Code} | base64 -d > main.js && node main.js\"";
                    break;
                case "cpp":
                case "c++":
                    dockerImage = "gcc:latest";
                    dockerCommand = $"sh -c \"echo {base64Code} | base64 -d > main.cpp && g++ main.cpp -o main && ./main\"";
                    break;
                case "java":
                    dockerImage = "eclipse-temurin:17-alpine";
                    dockerCommand = $"sh -c \"echo {base64Code} | base64 -d > Main.java && javac Main.java && java Main\"";
                    break;
                default:
                    return BadRequest(new { output = $"Hệ thống chưa hỗ trợ ngôn ngữ: {request.Language}" });
            }

            try
            {
                // THIẾT LẬP SANDBOX
                var processStartInfo = new ProcessStartInfo
                {
                    FileName = "docker",
                    Arguments = $"run --rm -i --net none --memory=\"256m\" {dockerImage} {dockerCommand}",
                    RedirectStandardInput = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = new Process { StartInfo = processStartInfo };
                process.Start();

                // TRUYỀN INPUT VÀO BÀN PHÍM ẢO CỦA DOCKER
                if (!string.IsNullOrEmpty(request.Input))
                {
                    using (var streamWriter = process.StandardInput)
                    {
                        streamWriter.Write(request.Input);
                    }
                }
                else
                {
                    process.StandardInput.Close(); // Đóng luồng nếu không có Input để tránh treo máy
                }

                // C++ và Java cần thời gian biên dịch nên để giới hạn 10 giây
                process.WaitForExit(10000);

                if (!process.HasExited)
                {
                    process.Kill();
                    return Ok(new { output = "LỖI: Thời gian chạy quá lâu (vượt quá 10s) hoặc lặp vô hạn. Sandbox đã tiêu hủy." });
                }

                // Đọc kết quả màn hình đen
                string output = process.StandardOutput.ReadToEnd();
                string error = process.StandardError.ReadToEnd();

                string finalOutput = string.IsNullOrEmpty(error) ? output : output + "\n[LỖI]:\n" + error;

                return Ok(new { output = finalOutput.Trim() });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { output = "Lỗi hệ thống Sandbox: " + ex.Message });
            }
        }
    }
}