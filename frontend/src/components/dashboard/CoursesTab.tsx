import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Plus, Edit, Trash2, Lock } from "lucide-react";

interface CoursesTabProps {
  courses: any[];
  currentUser: any;
  effectiveUserId: number | null;
  getAuthorName: (id?: number) => string;
  onOpenDialog: (course?: any) => void;
  onDelete: (id: number, title: string) => void;
}

const CoursesTab = ({ courses, currentUser, effectiveUserId, getAuthorName, onOpenDialog, onDelete }: CoursesTabProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Quản lý Khóa học</CardTitle><CardDescription>Danh mục các môn học lớn</CardDescription></div>
        <Button size="sm" onClick={() => onOpenDialog()} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
          <Plus className="mr-1.5 h-4 w-4" /> Thêm khóa học
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead className="w-16">ID</TableHead><TableHead>Tên khóa học</TableHead><TableHead>Tác giả</TableHead><TableHead className="text-right">Hành động</TableHead></TableRow></TableHeader>
          <TableBody>
            {courses.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8">Chưa có dữ liệu.</TableCell></TableRow> : 
             courses.map(c => {
              const isOwner = effectiveUserId ? (c.lecturerId === effectiveUserId) : false;
              const canEdit = currentUser?.role === "Admin" || isOwner || !effectiveUserId;
              return (
                <TableRow key={c.id}>
                  <TableCell>#{c.id}</TableCell><TableCell className="font-semibold">{c.title}</TableCell>
                  <TableCell><Badge variant={c.lecturerId ? "outline" : "secondary"} className={isOwner ? "border-primary text-primary bg-primary/5" : ""}>{isOwner ? "Bạn" : getAuthorName(c.lecturerId)}</Badge></TableCell>
                  <TableCell className="text-right">
                    {canEdit ? (
                      <><Button variant="ghost" size="icon" onClick={() => onOpenDialog(c)}><Edit className="h-4 w-4 text-primary" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(c.id, c.title)}><Trash2 className="h-4 w-4 text-destructive" /></Button></>
                    ) : <Button variant="ghost" size="icon" className="opacity-50"><Lock className="h-4 w-4" /></Button>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CoursesTab;