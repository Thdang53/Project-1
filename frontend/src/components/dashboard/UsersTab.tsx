import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Search, GraduationCap } from "lucide-react";

interface UsersTabProps {
  studentStats: any[];
  exercisesCount: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  currentUser: any;
  onOpenRoleDialog: (email: string, role: string, fullName: string) => void;
}

const UsersTab = ({ studentStats, exercisesCount, searchTerm, setSearchTerm, currentUser, onOpenRoleDialog }: UsersTabProps) => {
  const filteredStudents = studentStats.filter((student) => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = student.fullName?.toLowerCase().includes(searchLower);
    const emailMatch = student.email?.toLowerCase().includes(searchLower);
    return nameMatch || emailMatch;
  });

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <CardTitle>Quản lý Người dùng & Tiến độ</CardTitle>
          <CardDescription>Theo dõi bài tập và phân quyền (Chỉ Admin)</CardDescription>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="text" placeholder="Tìm theo tên hoặc email..." className="pl-9 bg-muted/50 focus:bg-background transition-colors" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ và Tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Số bài đúng</TableHead>
              <TableHead className="text-right">Hoạt động gần nhất</TableHead>
              <TableHead className="text-center">Quyền hạn</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {studentStats.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12"><GraduationCap className="h-8 w-8 mx-auto mb-3 opacity-20" />Chưa có người dùng nào đăng ký.</TableCell></TableRow>
            ) : filteredStudents.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12"><Search className="h-8 w-8 mx-auto mb-3 opacity-20" />Không tìm thấy người dùng.</TableCell></TableRow>
            ) : filteredStudents.map((student, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-bold text-foreground">{student.fullName}</TableCell>
                <TableCell className="text-muted-foreground">{student.email}</TableCell>
                <TableCell className="text-center">
                  <span className={`font-bold ${student.completedExercises === exercisesCount && exercisesCount > 0 ? 'text-success' : 'text-primary'}`}>{student.completedExercises}</span>
                  <span className="text-muted-foreground text-sm"> / {exercisesCount}</span>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {student.lastActive ? new Date(student.lastActive).toLocaleString('vi-VN') : 'Chưa có hoạt động'}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    {student.role === "Admin" ? <Badge className="bg-destructive hover:bg-destructive">Admin</Badge> : student.role === "Lecturer" ? <Badge className="bg-amber-500 hover:bg-amber-500">Giảng viên</Badge> : <Badge variant="outline">Sinh viên</Badge>}
                    {currentUser?.role === "Admin" && currentUser?.email !== student.email && (
                      <Button onClick={() => onOpenRoleDialog(student.email, student.role, student.fullName)} variant="ghost" size="sm" className="h-7 text-xs border border-border ml-2">Đổi quyền</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default UsersTab;