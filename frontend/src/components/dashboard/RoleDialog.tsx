import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Loader2 } from "lucide-react";

export default function RoleDialog({ open, setOpen, targetUser, role, setRole, onSubmit, isSubmitting }: any) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Quản lý quyền</DialogTitle>
          <DialogDescription>Thay đổi vai trò cho <span className="font-bold">{targetUser?.fullName}</span></DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue placeholder="Chọn vai trò" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Student">Sinh viên</SelectItem>
              <SelectItem value="Lecturer">Giảng viên</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin mr-2" /> : "Cập nhật"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}