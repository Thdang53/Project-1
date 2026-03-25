import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Plus, Edit, Trash2, Lock, Code2 } from "lucide-react";

interface ExercisesTabProps {
  exercises: any[];
  lessons: any[];
  courses: any[];
  currentUser: any;
  effectiveUserId: number | null;
  onOpenDialog: (exercise?: any) => void;
  onDelete: (id: number, title: string) => void;
  getDifficultyBadge: (diff: string) => JSX.Element;
}

const ExercisesTab = ({ exercises, lessons, courses, currentUser, effectiveUserId, onOpenDialog, onDelete, getDifficultyBadge }: ExercisesTabProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Danh sách bài tập lập trình</CardTitle><CardDescription>Các bài tập giao cho sinh viên</CardDescription></div>
        <Button size="sm" onClick={() => onOpenDialog()} className="bg-gradient-primary text-primary-foreground"><Plus className="mr-1.5 h-4 w-4" /> Thêm bài tập</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Thuộc Bài</TableHead><TableHead>Tên bài tập</TableHead><TableHead>Độ khó</TableHead><TableHead>Test Cases</TableHead><TableHead className="text-right">Hành động</TableHead></TableRow></TableHeader>
          <TableBody>
            {exercises.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8">Chưa có dữ liệu.</TableCell></TableRow> : 
             exercises.map(ex => {
              const parentLesson = lessons.find(l => l.id === ex.lessonId);
              const parentCourse = courses.find(c => c.id === parentLesson?.courseId);
              const isOwner = effectiveUserId ? parentCourse?.lecturerId === effectiveUserId : false;
              const canEdit = currentUser?.role === "Admin" || isOwner || !effectiveUserId;

              let tcCount = 0;
              try { if (ex.testCases) tcCount = JSON.parse(ex.testCases).length; } catch(e){}

              return (
                <TableRow key={ex.id}>
                  <TableCell className="font-medium text-muted-foreground">#{ex.id}</TableCell>
                  <TableCell><Badge variant="secondary">{parentLesson?.title}</Badge></TableCell>
                  <TableCell><p className="font-semibold line-clamp-1">{ex.title}</p></TableCell>
                  <TableCell>{getDifficultyBadge(ex.difficulty)}</TableCell>
                  <TableCell><Badge variant="outline" className="font-mono"><Code2 className="h-3 w-3 mr-1" /> {tcCount}</Badge></TableCell>
                  <TableCell className="text-right">
                    {canEdit ? (
                      <><Button variant="ghost" size="icon" onClick={() => onOpenDialog(ex)}><Edit className="h-4 w-4 text-primary" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(ex.id, ex.title)}><Trash2 className="h-4 w-4 text-destructive" /></Button></>
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

export default ExercisesTab;