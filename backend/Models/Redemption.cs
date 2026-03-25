using System;
using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class Redemption
    {
        [Key]
        public int Id { get; set; }
        public int LecturerId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public int Cost { get; set; }
        public string Status { get; set; } = "Đang xử lý";
        public string Code { get; set; } = "Chờ cấp mã";
        public DateTime RedeemedAt { get; set; } = DateTime.UtcNow;
    }
}