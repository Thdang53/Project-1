import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface DeleteConfirmDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  info: { title: string };
  onConfirm: () => void;
  isSubmitting: boolean;
}

export default function DeleteConfirmDialog({ open, setOpen, info, onConfirm, isSubmitting }: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px] overflow-hidden rounded-2xl border border-destructive/20 shadow-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex flex-col items-center p-2"
        >
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 border-4 border-destructive/20 mb-6">
            <AlertTriangle className="h-10 w-10 text-destructive-foreground animate-pulse" />
          </div>

          <DialogHeader className="items-center text-center">
            <DialogTitle className="text-2xl font-extrabold text-foreground tracking-tight">
              Xác nhận xóa vĩnh viễn?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed max-w-[80%]">
              Hành động này <strong className="text-destructive font-semibold">không thể hoàn tác</strong>.
              Bạn có chắc muốn xóa vĩnh viễn <strong className="text-foreground font-semibold">[ {info.title} ]</strong> không?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="w-full flex justify-center gap-3 mt-8">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="px-6 py-2.5 text-sm rounded-xl border-border hover:bg-muted"
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="px-6 py-2.5 text-sm rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                "Xóa ngay"
              )}
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}