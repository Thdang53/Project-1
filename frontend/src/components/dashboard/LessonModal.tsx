import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Loader2 } from "lucide-react";

export default function LessonModal({ open, setOpen, isEdit, lesson, setLesson, courses, user, effectiveUserId, onSave, isSubmitting }: any) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa bài học" : "Tạo bài học mới"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-semibold mb-1 block">Thuộc Khóa học:</label>
            <Select value={lesson.courseId} onValueChange={v => setLesson({ ...lesson, courseId: v })}>
              <SelectTrigger><SelectValue placeholder="Chọn Khóa học" /></SelectTrigger>
              <SelectContent>
                {courses.length === 0 && <SelectItem value="empty" disabled>Chưa có khóa học nào</SelectItem>}
                {courses.map((c: any) => {
                  const isMyCourse = effectiveUserId && c.lecturerId === effectiveUserId;
                  return (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.title} {isMyCourse ? "(Của bạn)" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-semibold mb-1 block">Tên bài học:</label>
            <Input 
              placeholder="Tên bài học (VD: Vòng lặp For)" 
              value={lesson.title} 
              onChange={e => setLesson({ ...lesson, title: e.target.value })} 
            />
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">Thứ tự hiển thị:</label>
            <Input 
              type="number" 
              placeholder="Số thứ tự (VD: 1)" 
              value={lesson.orderNum} 
              onChange={e => setLesson({ ...lesson, orderNum: parseInt(e.target.value) || 1 })} 
            />
          </div>

          <Button onClick={onSave} disabled={isSubmitting} className="w-full bg-gradient-primary">
            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Lưu Bài học"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}