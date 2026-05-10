import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, CheckCircle2, Code2, MessageSquareWarning } from "lucide-react";

export default function ReviewWorkspace() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const { toast } = useToast();
    
    const [code, setCode] = useState("// Nhớ sử dụng comment Tiếng Anh nhé...\n");
    const [isRefined, setIsRefined] = useState(false);

    // Dữ liệu đã được AI bẻ lái (Lấy từ kết quả của trang trước)
    const localizedProblem = "Viết chương trình C++ tính tiền gửi xe máy theo tháng tại Aeon Mall trong dịp Tết Nguyên Đán.";

    const handleSubmit = async () => {
        if (!code.includes("//")) {
            toast({ title: "⚠️ AI Reminder", description: "Vui lòng thêm comment Tiếng Anh!", variant: "destructive" });
            return;
        }
        toast({ title: "✅ Nộp bài thành công!", description: "Đang gửi dữ liệu chấm điểm..." });
        // (Bạn có thể gọi API SubmitCodeRequest ở đây y như Workspace.tsx gốc)
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-screen bg-white">
            {/* CỘT 1: ĐỀ BÀI */}
            <div className="w-[300px] border-r border-slate-100 p-6 bg-slate-50/50 flex flex-col">
                <Button variant="ghost" onClick={() => navigate('/dashboard')} className="w-fit mb-6 -ml-4 text-slate-500">
                    ← Rời phòng
                </Button>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Nhiệm vụ (Đã chốt)</h2>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <p className="text-sm text-purple-900 font-medium leading-relaxed">{localizedProblem}</p>
                </div>
            </div>

            {/* CỘT 2: EDITOR */}
            <div className="flex-1 flex flex-col p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Code2 className="w-5 h-5 text-indigo-600" /> C++ Editor</h2>
                    <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 rounded-full px-8 shadow-lg">
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Nộp bài & Chấm ngữ pháp
                    </Button>
                </div>
                <textarea 
                    className="flex-1 w-full p-6 font-mono text-[15px] bg-[#1e1e1e] text-indigo-300 rounded-2xl outline-none shadow-2xl resize-none"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                />
            </div>

            {/* CỘT 3: CỘNG ĐỒNG */}
            <div className="w-[350px] border-l border-slate-100 p-6 bg-slate-50/50">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <MessageSquareWarning className="w-4 h-4"/> Peer-Review
                </h2>
                <Card className="border-none shadow-sm bg-white p-4">
                    <p className={`text-sm leading-relaxed mb-4 ${isRefined ? 'text-blue-700 font-medium' : 'text-rose-600 italic'}`}>
                        {isRefined 
                            ? "The current approach uses nested loops, resulting in O(n²) complexity. I suggest optimizing it." 
                            : "Viết code kiểu này chạy chậm như rùa bò, xài 2 vòng lặp lồng nhau ngu thật sự."}
                    </p>
                    {!isRefined && (
                        <Button variant="outline" size="sm" className="w-full text-indigo-600 border-indigo-200 py-4" onClick={() => setIsRefined(true)}>
                            <Sparkles className="w-4 h-4 mr-2" /> AI Dịch & Lịch sự hóa
                        </Button>
                    )}
                </Card>
            </div>
        </motion.div>
    );
}