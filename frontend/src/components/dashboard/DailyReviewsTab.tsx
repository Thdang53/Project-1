import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, CheckCircle2, Clock, Loader2, ArrowRight, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReviewItem {
    exerciseId: number;
    exerciseTitle: string;
    difficulty: string;
    language: string; 
    repetitions: number;
    nextReviewDate: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function DailyReviewsTab() {
    const { user, token } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [reviews, setReviews] = useState<ReviewItem[]>([]);
    const [loading, setLoading] = useState(true);

    // STATE CHO POPUP
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isAIGenerating, setIsAIGenerating] = useState(false);
    // Lưu trữ trọn bộ dữ liệu bài tập AI đã tạo
    const [aiGeneratedData, setAiGeneratedData] = useState<any>(null);

    useEffect(() => {
        if (user?.email) {
            fetchReviews();
        }
    }, [user]);

    const fetchReviews = async () => {
        try {
            const res = await fetch(`${API_BASE_URL || ''}/api/exercises/daily-reviews?email=${user?.email}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setReviews(data.data);
            }
        } catch (error) {
            console.error("Lỗi khi tải dữ liệu ôn tập:", error);
        } finally {
            setLoading(false);
        }
    };

    // 🚀 HÀM GỌI AI CHẾ ĐỀ NGAY TẠI POPUP
    const handleGenerateAIReview = async (exerciseId: number, title: string, difficulty: string, lang: string) => {
        setIsPreviewOpen(true);
        setIsAIGenerating(true);
        setAiGeneratedData(null);

        try {
            const originalRes = await fetch(`${API_BASE_URL || ''}/api/Exercises/${exerciseId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const originalEx = await originalRes.json();

            const response = await fetch(`${API_BASE_URL || ''}/api/AIAssistant/generate-exercise`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json", 
                    "Authorization": `Bearer ${token}` 
                },
                body: JSON.stringify({
                    Language: lang || "python", 
                    Topic: `Ôn tập lại bài toán: ${title}. Yêu cầu: Giữ nguyên thuật toán cốt lõi, viết cốt truyện mới lạ.`,
                    Difficulty: difficulty,
                    StudentEmail: user?.email 
                })
            });

            const data = await response.json();
            if (data.success) {
                setAiGeneratedData({
                    ...data.data,
                    originalId: exerciseId,
                    originalTestCases: originalEx.testCases,
                    originalLessonId: originalEx.lessonId,
                    language: lang || "python" 
                });
            } else {
                toast({ title: "Lỗi AI", description: "AI không thể tạo đề bài lúc này.", variant: "destructive" });
                setIsPreviewOpen(false);
            }
        } catch (error) {
            console.error("Lỗi tạo bài tập AI:", error);
            setIsPreviewOpen(false);
        } finally {
            setIsAIGenerating(false);
        }
    };

    const handleProceedToWorkspace = () => {
        if (!aiGeneratedData) return;
        
        setIsPreviewOpen(false);
        
        navigate(`/workspace?reviewId=${aiGeneratedData.originalId}&mode=adaptive-review`, {
            state: {
                isAIGenerated: true,
                exerciseData: {
                    title: aiGeneratedData.title || aiGeneratedData.Title,
                    description: aiGeneratedData.description || aiGeneratedData.Description,
                    difficulty: aiGeneratedData.difficulty || aiGeneratedData.Difficulty,
                    testCases: aiGeneratedData.originalTestCases,
                    starterCode: aiGeneratedData.starterCode || aiGeneratedData.StarterCode,
                    id: aiGeneratedData.originalId,
                    lessonId: aiGeneratedData.originalLessonId,
                    language: aiGeneratedData.language 
                }
            }
        });
    };

    // 💡 HÀM ĐỒNG BỘ STYLE Y HỆT STUDENT DASHBOARD LỘ TRÌNH HỌC
    const getDifficultyColor = (diff: string) => {
        const d = diff?.toLowerCase() || "";
        if (d === 'easy' || d === 'cơ bản') return 'bg-success/10 text-success border-success/20';
        if (d === 'medium' || d === 'trung bình') return 'bg-warning/10 text-warning border-warning/20';
        if (d === 'hard' || d === 'nâng cao') return 'bg-destructive/10 text-destructive border-destructive/20';
        return 'bg-muted text-muted-foreground border-border';
    };

    const displayDifficulty = (diff: string) => {
        const d = diff?.toLowerCase() || "";
        if (d === 'easy' || d === 'cơ bản') return 'CƠ BẢN';
        if (d === 'medium' || d === 'trung bình') return 'TRUNG BÌNH';
        if (d === 'hard' || d === 'nâng cao') return 'NÂNG CAO';
        return 'CƠ BẢN';
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64 text-muted-foreground animate-pulse">Đang đồng bộ trí nhớ của bạn...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Brain className="h-6 w-6 text-purple-500" />
                        Góc Ôn Tập (SRS)
                    </h2>
                    <p className="text-muted-foreground mt-1">AI đã chuẩn bị sẵn bài tập dựa trên trí nhớ của bạn.</p>
                </div>
            </div>

            {reviews.length === 0 ? (
                <Card className="border-dashed rounded-3xl bg-card shadow-none">
                    <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                        <CheckCircle2 className="h-16 w-16 text-green-500 mb-4 opacity-80" />
                        <h3 className="text-xl font-bold mb-2">Trí nhớ của bạn đang ở trạng thái hoàn hảo!</h3>
                        <p className="text-muted-foreground max-w-md">
                            Hôm nay không có kiến thức nào đến hạn điểm rơi quên lãng. Bạn có thể nghỉ ngơi hoặc tiếp tục học bài mới nhé.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {reviews.map((review, index) => (
                        // 💡 ĐÃ FIX: Style vùng chứa Card giống y hệt phần Lộ trình học
                        <div key={review.exerciseId} className="group p-5 rounded-2xl border transition-all flex flex-col h-full bg-card hover:-translate-y-1">
                            <div className="flex justify-between items-start mb-3">
                                {/* 💡 ĐÃ FIX: Độ khó theo chuẩn */}
                                <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getDifficultyColor(review.difficulty)}`}>
                                    {displayDifficulty(review.difficulty)}
                                </div>
                                {/* 💡 ĐÃ FIX: Ngôn ngữ Badge góc bên phải */}
                                <div className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border font-mono bg-muted text-muted-foreground border-border flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-warning" /> {review.language?.toUpperCase() || "PYTHON"}
                                </div>
                            </div>
                            
                            {/* 💡 ĐÃ FIX: Tiêu đề có tiền tố giống Lộ trình học */}
                            <h3 className="text-lg font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors text-foreground">
                                <span className="text-muted-foreground mr-2 font-mono text-sm">Ôn tập</span> 
                                {review.exerciseTitle}
                            </h3>
                            
                            {/* 💡 ĐÃ FIX: Mô tả giới hạn 2 dòng mờ đi */}
                            <p className="text-sm mb-6 flex-1 line-clamp-2 text-muted-foreground">
                                Đã giải thành công {review.repetitions} lần liên tiếp. Thuật toán AI khuyên bạn nên ôn lại ngay bây giờ.
                            </p>
                            
                            {/* 💡 ĐÃ FIX: Bố cục 2 nút bấm y hệt Lộ trình học */}
                            <div className="flex items-center gap-2 mt-auto">
                                <button 
                                    className="flex-1 flex items-center justify-center font-bold rounded-xl h-10 text-sm bg-accent/10 text-accent hover:bg-accent hover:text-white border border-accent/20 transition-all"
                                    onClick={() => handleGenerateAIReview(review.exerciseId, review.exerciseTitle, review.difficulty, review.language)}
                                >
                                    <Sparkles className="h-4 w-4 mr-1.5" /> Chế đề
                                </button>
                                <button 
                                    className="flex-[2] flex items-center justify-center font-bold rounded-xl h-10 text-sm bg-muted hover:bg-primary hover:text-primary-foreground transition-all"
                                    onClick={() => handleGenerateAIReview(review.exerciseId, review.exerciseTitle, review.difficulty, review.language)}
                                >
                                    Ôn ngay <ChevronRight className="ml-1 h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="sm:max-w-[700px] border-border shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl text-primary">
                            <Sparkles className="h-5 w-5" />
                            {isAIGenerating ? "AI đang chế đề..." : `Biến thể ôn tập: ${aiGeneratedData?.title || aiGeneratedData?.Title || ""}`}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-4">
                        {isAIGenerating ? (
                            <div className="flex flex-col items-center justify-center h-40 space-y-4">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Đang xào nấu dữ liệu cho bạn...</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[350px] w-full rounded-2xl border p-5 bg-muted/30">
                                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/80 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: aiGeneratedData?.description || aiGeneratedData?.Description || "Không thể tải được mô tả bài toán." }}
                                />
                            </ScrollArea>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" className="rounded-xl" onClick={() => setIsPreviewOpen(false)}>Hủy</Button>
                        <Button 
                            onClick={handleProceedToWorkspace} 
                            disabled={isAIGenerating}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm"
                        >
                            Vào học ngay <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}