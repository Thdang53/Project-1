import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Loader2 } from "lucide-react";

export default function CourseModal({ open, setOpen, isEdit, course, setCourse, onSave, isSubmitting }: any) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa khóa học" : "Tạo khóa học mới"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <Input 
            placeholder="Tên khóa học (VD: Lập trình Python)" 
            value={course.title} 
            onChange={e => setCourse({ ...course, title: e.target.value })} 
          />
          <Button onClick={onSave} disabled={isSubmitting} className="w-full bg-gradient-primary">
            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Lưu Khóa học"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}