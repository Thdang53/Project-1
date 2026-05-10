import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Globe2, Languages, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

export default function AIVariantGenerator() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [progress, setProgress] = useState(0);
    const [step, setStep] = useState(0);
    const [isDone, setIsDone] = useState(false);

    // Mock Data phục vụ demo báo cáo
    const originalProblem = "Write a C++ program to calculate the monthly parking fee for luxury cars in a New York City garage during the Christmas season.";
    const localizedProblem = "Viết chương trình C++ tính tiền gửi xe máy theo tháng tại Aeon Mall trong dịp Tết Nguyên Đán.";

    // Giả lập quá trình AI suy nghĩ (Rất ăn tiền để viết báo)
    useEffect(() => {
        const timer1 = setTimeout(() => { setProgress(30); setStep(1); }, 1000);
        const timer2 = setTimeout(() => { setProgress(60); setStep(2); }, 2500);
        const timer3 = setTimeout(() => { setProgress(90); setStep(3); }, 4000);
        const timer4 = setTimeout(() => { setProgress(100); setStep(4); setIsDone(true); }, 5000);

        return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); clearTimeout(timer4); };
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <Card className="max-w-3xl w-full shadow-2xl border-none rounded-3xl overflow-hidden bg-white">
                <div className="h-2 bg-gradient-to-r from-orange-400 via-rose-400 to-purple-500" />
                <CardContent className="p-10">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 text-purple-600 mb-4">
                            {isDone ? <CheckCircle2 className="w-8 h-8" /> : <BrainCircuit className="w-8 h-8 animate-pulse" />}
                        </div>
                        <h1 className="text-3xl font-black text-slate-800">
                            {isDone ? "Hoàn tất tạo Biến thể Ôn tập!" : "AI đang xử lý bài toán..."}
                        </h1>
                        <p className="text-slate-500 mt-2">ID Bài gốc: #{id}</p>
                    </div>

                    {/* Progress Bar & Status */}
                    {!isDone && (
                        <div className="space-y-6 mb-8">
                            <Progress value={progress} className="h-3 bg-slate-100" />
                            <div className="space-y-3 font-medium text-sm">
                                <p className={`flex items-center gap-2 ${step >= 1 ? 'text-green-600' : 'text-slate-400'}`}>
                                    {step >= 1 ? <CheckCircle2 className="w-4 h-4"/> : <Loader2 className="w-4 h-4 animate-spin"/>} 
                                    Đọc đề bài từ Sách giáo khoa phương Tây...
                                </p>
                                <p className={`flex items-center gap-2 ${step >= 2 ? 'text-green-600' : 'text-slate-400'}`}>
                                    {step >= 2 ? <CheckCircle2 className="w-4 h-4"/> : step === 1 ? <Loader2 className="w-4 h-4 animate-spin text-orange-500"/> : <div className="w-4 h-4"/>} 
                                    Phát hiện thiên kiến văn hóa (Cultural Bias: New York, Christmas)
                                </p>
                                <p className={`flex items-center gap-2 ${step >= 3 ? 'text-green-600' : 'text-slate-400'}`}>
                                    {step >= 3 ? <CheckCircle2 className="w-4 h-4"/> : step === 2 ? <Loader2 className="w-4 h-4 animate-spin text-purple-500"/> : <div className="w-4 h-4"/>} 
                                    Bản địa hóa ngữ cảnh sang Việt Nam & Trích xuất từ vựng...
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Hiển thị kết quả sau khi AI xử lý xong */}
                    {isDone && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 opacity-60">
                                    <Badge variant="outline" className="mb-3">Đề bài gốc</Badge>
                                    <p className="text-sm text-slate-600 line-through decoration-slate-300">{originalProblem}</p>
                                </div>
                                <div className="bg-purple-50 p-5 rounded-2xl border border-purple-200 shadow-sm relative">
                                    <Badge className="bg-purple-600 mb-3"><Globe2 className="w-3 h-3 mr-1"/> Đã Bản địa hóa</Badge>
                                    <p className="text-sm text-purple-900 font-medium leading-relaxed">{localizedProblem}</p>
                                </div>
                            </div>

                            <div className="bg-indigo-50 p-4 rounded-2xl flex items-center justify-between border border-indigo-100">
                                <div className="flex items-center gap-2">
                                    <Languages className="w-5 h-5 text-indigo-500" />
                                    <span className="font-bold text-sm text-indigo-900">Từ vựng bắt buộc dùng:</span>
                                </div>
                                <div className="flex gap-2">
                                    <Badge variant="secondary" className="bg-white">Array (Mảng)</Badge>
                                    <Badge variant="secondary" className="bg-white">Iteration (Vòng lặp)</Badge>
                                </div>
                            </div>

                            <Button 
                                onClick={() => navigate(`/review-workspace/${id}`)} 
                                className="w-full h-14 text-lg font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xl mt-4 transition-all hover:-translate-y-1"
                            >
                                Vào Không Gian Làm Bài <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}