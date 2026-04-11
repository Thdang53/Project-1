using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    public class Class
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string ClassName { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string JoinCode { get; set; } = string.Empty; // Mã để sinh viên nhập vào (VD: INNOX2026)

        [Required]
        public int LecturerId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("LecturerId")]
        public User? Lecturer { get; set; }

        public ICollection<ClassStudent> ClassStudents { get; set; } = new List<ClassStudent>();
    }
}