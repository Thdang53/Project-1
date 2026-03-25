import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Users, CheckCircle2, BookOpen, Terminal, Trophy } from "lucide-react";

interface StatsTabProps {
  studentStats: any[];
  coursesCount: number;
  exercises: any[];
}

const StatsTab = ({ studentStats, coursesCount, exercises }: StatsTabProps) => {
  return (
    <div className="space-y-6 focus:outline-none">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-border shadow-sm"><CardContent className="p-6 flex items-center gap-4"><div className="p-4 bg-primary/10 text-primary rounded-2xl"><Users className="h-8 w-8" /></div><div><p className="text-sm font-medium text-muted-foreground">Tổng Học Viên</p><h3 className="text-3xl font-bold text-foreground">{studentStats.filter(s => s.role === 'Student').length}</h3></div></CardContent></Card>
        <Card className="border-border shadow-sm"><CardContent className="p-6 flex items-center gap-4"><div className="p-4 bg-success/10 text-success rounded-2xl"><CheckCircle2 className="h-8 w-8" /></div><div><p className="text-sm font-medium text-muted-foreground">Tổng Lượt Nộp Bài</p><h3 className="text-3xl font-bold text-foreground">{studentStats.reduce((sum, s) => sum + (s.totalSubmissions || 0), 0)}</h3></div></CardContent></Card>
        <Card className="border-border shadow-sm"><CardContent className="p-6 flex items-center gap-4"><div className="p-4 bg-warning/10 text-warning rounded-2xl"><BookOpen className="h-8 w-8" /></div><div><p className="text-sm font-medium text-muted-foreground">Tổng Khóa Học</p><h3 className="text-3xl font-bold text-foreground">{coursesCount}</h3></div></CardContent></Card>
        <Card className="border-border shadow-sm"><CardContent className="p-6 flex items-center gap-4"><div className="p-4 bg-destructive/10 text-destructive rounded-2xl"><Terminal className="h-8 w-8" /></div><div><p className="text-sm font-medium text-muted-foreground">Tổng Bài Tập</p><h3 className="text-3xl font-bold text-foreground">{exercises.length}</h3></div></CardContent></Card>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="border-border shadow-card overflow-hidden lg:col-span-2">
          <div className="p-6 border-b border-border bg-card">
            <h3 className="text-xl font-bold flex items-center gap-2"><Trophy className="h-5 w-5 text-warning" /> Bảng Xếp Hạng & Tiến Độ Học Viên</h3>
          </div>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50"><TableRow><TableHead className="w-16 text-center py-4">Top</TableHead><TableHead>Học viên</TableHead><TableHead className="text-center">Tổng lượt nộp</TableHead><TableHead className="text-center">Bài đã giải (PASS)</TableHead><TableHead className="text-right pr-6">Hoạt động gần nhất</TableHead></TableRow></TableHeader>
              <TableBody>
                {studentStats.filter(s => s.role === 'Student' || s.totalSubmissions > 0).map((stat, index) => (
                  <TableRow key={stat.email} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-center font-bold">{index === 0 ? <span className="text-warning text-lg">🥇 1</span> : index === 1 ? <span className="text-muted-foreground text-lg">🥈 2</span> : index === 2 ? <span className="text-orange-400 text-lg">🥉 3</span> : `#${index + 1}`}</TableCell>
                    <TableCell><div className="font-bold text-foreground">{stat.fullName || "Chưa cập nhật tên"}</div><div className="text-sm text-muted-foreground">{stat.email}</div></TableCell>
                    <TableCell className="text-center font-mono">{stat.totalSubmissions || 0}</TableCell>
                    <TableCell className="text-center"><span className="font-bold text-success text-lg">{stat.completedExercises || 0}</span><span className="text-muted-foreground text-xs ml-1">bài</span></TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm pr-6">{stat.lastActive ? new Date(stat.lastActive).toLocaleString('vi-VN') : "Chưa từng nộp bài"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="border-border shadow-card h-fit">
          <CardHeader><CardTitle className="text-lg">Phân bố bài tập</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-5">
              {["Easy", "Medium", "Hard"].map(level => {
                const count = exercises.filter(c => c.difficulty?.toLowerCase() === level.toLowerCase()).length;
                const pct = exercises.length > 0 ? (count / exercises.length) * 100 : 0;
                const labels: Record<string, string> = { Easy: "Dễ", Medium: "Trung bình", Hard: "Khó" };
                const colors: Record<string, string> = { Easy: "bg-success", Medium: "bg-warning", Hard: "bg-destructive" };
                return (
                  <div key={level}>
                    <div className="flex justify-between text-sm mb-1.5"><span className="text-foreground font-semibold">{labels[level]}</span><span className="text-muted-foreground font-mono">{count} bài</span></div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${colors[level]} transition-all`} style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StatsTab;