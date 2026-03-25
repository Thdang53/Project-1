import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Plus, Edit, Trash2, Lock } from "lucide-react";

interface LessonsTabProps {
  lessons: any[];
  courses: any[];
  currentUser: any;
  effectiveUserId: number | null;
  onOpenDialog: (lesson?: any) => void;
  onDelete: (id: number, title: string) => void;
}

const LessonsTab = ({ lessons, courses, currentUser, effectiveUserId, onOpenDialog, onDelete }: LessonsTabProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Quản lý Bài học</CardTitle><CardDescription>Các bài học bên trong Khóa học</CardDescription></div>
        <Button size="sm" onClick={() => onOpenDialog()} className="bg-gradient-primary text-primary-foreground"><Plus className="mr-1.5 h-4 w-4" /> Thêm bài học</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead className="w-16">ID</TableHead><TableHead>Thuộc Khóa</TableHead><TableHead>Tên bài học</TableHead><TableHead className="text-right">Hành động</TableHead></TableRow></TableHeader>
          <TableBody>
            {lessons.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8">Chưa có dữ liệu.</TableCell></TableRow> : 
             lessons.map(l => {
              const parentCourse = courses.find(c => c.id === l.courseId);
              const isOwner = effectiveUserId ? parentCourse?.lecturerId === effectiveUserId : false;
              const canEdit = currentUser?.role === "Admin" || isOwner || !effectiveUserId;
              return (
                <TableRow key={l.id}>
                  <TableCell>#{l.id}</TableCell><TableCell><Badge variant="outline">{parentCourse?.title}</Badge></TableCell><TableCell className="font-semibold">Bài {l.orderNum}: {l.title}</TableCell>
                  <TableCell className="text-right">
                    {canEdit ? (
                      <><Button variant="ghost" size="icon" onClick={() => onOpenDialog(l)}><Edit className="h-4 w-4 text-primary" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(l.id, l.title)}><Trash2 className="h-4 w-4 text-destructive" /></Button></>
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

export default LessonsTab;