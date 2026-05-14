import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
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
      <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
        <div><CardTitle>Danh sách bài tập lập trình</CardTitle><CardDescription>Các bài tập giao cho sinh viên</CardDescription></div>
        <Button size="sm" onClick={() => onOpenDialog()} className="bg-gradient-primary text-primary-foreground">
            <Plus className="mr-1.5 h-4 w-4" /> Thêm bài tập
        </Button>
      </CardHeader>
      <CardContent>
        {exercises.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border border-dashed rounded-2xl bg-muted/20">
                <Code2 className="h-12 w-12 mx-auto mb-4 opacity-20"/>
                <p className="text-lg font-medium text-foreground">Chưa có dữ liệu bài tập.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {exercises.map(ex => {
                  const parentLesson = lessons.find(l => l.id === ex.lessonId);
                  const parentCourse = courses.find(c => c.id === parentLesson?.courseId);
                  const isOwner = effectiveUserId ? parentCourse?.lecturerId === effectiveUserId : false;
                  const canEdit = currentUser?.role === "Admin" || isOwner || !effectiveUserId;
                  
                  let tcCount = 0;
                  try { if (ex.testCases) tcCount = JSON.parse(ex.testCases).length; } catch(e){}

                  return (
                     <Card key={ex.id} className="p-5 flex flex-col justify-between hover:shadow-md hover:border-primary/50 transition-all bg-card group h-full">
                       <div>
                         <div className="flex justify-between items-center mb-3">
                           <div className="flex flex-wrap gap-2">
                             {getDifficultyBadge(ex.difficulty)}
                             <Badge variant="outline" className="uppercase text-[10px] font-bold tracking-wider font-mono">
                                <Code2 className="h-3 w-3 mr-1" /> {tcCount} TEST
                             </Badge>
                           </div>
                           {canEdit ? (
                             <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => onOpenDialog(ex)}><Edit className="h-4 w-4" /></Button>
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => onDelete(ex.id, ex.title)}><Trash2 className="h-4 w-4" /></Button>
                             </div>
                           ) : (
                             <Lock className="h-4 w-4 text-muted-foreground opacity-50" />
                           )}
                         </div>
                         
                         <h3 className="font-bold text-lg leading-tight mb-2 text-foreground line-clamp-2">{ex.title}</h3>
                         <div className="text-sm text-muted-foreground line-clamp-2 mb-6">
                           Thuộc bài: <span className="font-medium text-foreground">{parentLesson?.title || "Không xác định"}</span>
                         </div>
                       </div>
                       
                       <Button 
                         variant="secondary" 
                         className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-sm" 
                         onClick={() => canEdit && onOpenDialog(ex)}
                       >
                          <Edit className="h-4 w-4 mr-2" /> Chỉnh sửa
                       </Button>
                     </Card>
                  );
               })}
            </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExercisesTab;