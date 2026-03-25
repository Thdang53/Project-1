import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";

export default function ExerciseModal({ open, setOpen, isEdit, ex, setEx, courses, lessons, user, effectiveUserId, selectedCourseId, setSelectedCourseId, testCases, addTestCase, updateTestCase, removeTestCase, onSave, isSubmitting }: any) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa bài tập" : "Tạo bài tập mới"}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border border-border">
            <div>
              <label className="text-xs font-semibold mb-1 block">Thuộc Khóa học:</label>
              <Select value={selectedCourseId} onValueChange={(v) => { setSelectedCourseId(v); setEx({...ex, lessonId: ""}); }}>
                <SelectTrigger><SelectValue placeholder="Chọn Khóa học..." /></SelectTrigger>
                <SelectContent>
                  {courses.length === 0 && <SelectItem value="empty" disabled>Bạn chưa có khóa học nào</SelectItem>}
                  {courses.filter((c: any) => user?.role === "Admin" || c.lecturerId === effectiveUserId).map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-xs font-semibold mb-1 block">Thuộc Bài học (Lesson):</label>
              <Select value={ex.lessonId} onValueChange={v => setEx({ ...ex, lessonId: v })} disabled={!selectedCourseId}>
                <SelectTrigger><SelectValue placeholder="Chọn Bài học..." /></SelectTrigger>
                <SelectContent>
                  {lessons.filter((l: any) => l.courseId.toString() === selectedCourseId).length === 0 
                    ? <SelectItem value="empty" disabled>Khóa này chưa có bài học</SelectItem>
                    : lessons.filter((l: any) => l.courseId.toString() === selectedCourseId).map((l: any) => (
                        <SelectItem key={l.id} value={l.id.toString()}>Bài {l.orderNum}: {l.title}</SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>

          <Input 
            placeholder="Tiêu đề bài tập (VD: Tính tổng 2 số)" 
            value={ex.title} 
            onChange={e => setEx({ ...ex, title: e.target.value })} 
          />
          <Textarea 
            placeholder="Mô tả chi tiết yêu cầu đề bài..." 
            rows={4} 
            value={ex.description} 
            onChange={e => setEx({ ...ex, description: e.target.value })} 
          />
          
          <div className="grid grid-cols-2 gap-3">
            <Select value={ex.difficulty} onValueChange={v => setEx({ ...ex, difficulty: v })}>
              <SelectTrigger><SelectValue placeholder="Độ khó" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy">Dễ (Easy)</SelectItem>
                <SelectItem value="Medium">Trung bình (Medium)</SelectItem>
                <SelectItem value="Hard">Khó (Hard)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4 border-t border-border mt-4">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-foreground">Dữ liệu chấm điểm (Test Cases)</label>
              <Button type="button" variant="secondary" size="sm" onClick={addTestCase}>
                <Plus className="h-3 w-3 mr-1" /> Thêm Test Case
              </Button>
            </div>
            <div className="space-y-3">
              {testCases.map((tc: any, idx: number) => (
                <div key={idx} className="flex gap-2 items-start bg-muted/30 p-2 rounded-lg border border-border">
                  <Input 
                    placeholder="Input (VD: 1 2)" 
                    value={tc.input} 
                    onChange={e => updateTestCase(idx, 'input', e.target.value)} 
                    className="font-mono text-sm" 
                  />
                  <Input 
                    placeholder="Expected Output (VD: 3)" 
                    value={tc.expectedOutput} 
                    onChange={e => updateTestCase(idx, 'expectedOutput', e.target.value)} 
                    className="font-mono text-sm border-success/50" 
                  />
                  {testCases.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTestCase(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button onClick={onSave} disabled={isSubmitting} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEdit ? "Cập nhật bài tập" : "Lưu vào hệ thống")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}