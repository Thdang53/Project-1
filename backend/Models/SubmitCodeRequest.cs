namespace backend.Models
{
    public class SubmitCodeRequest
    {
        public string Language { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public int ExerciseId { get; set; }
    }
}