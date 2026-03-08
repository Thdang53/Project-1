namespace backend.Models
{
    public class SubmitCodeRequest
    {
        public string Language { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public int ExerciseId { get; set; }
        
        // DÒNG MỚI THÊM: Để nhận diện sinh viên nào đang nộp bài
        public string UserEmail { get; set; } = string.Empty; 
    }
}