import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, CheckCircle2, Clock, BookOpen, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReviewItem {
    exerciseId: number;
    exerciseTitle: string;
    difficulty: string;
    language: string; // 💡 ĐÃ THÊM: Nhận diện ngôn ngữ từ Backend
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

    // 🚀 HÀM GỌI AI CHẾ ĐỀ NGAY TẠI POPUP (CẬP NHẬT NHẬN THÊM BIẾN LANG)
    const handleGenerateAIReview = async (exerciseId: number, title: string, difficulty: string, lang: string) => {
        setIsPreviewOpen(true);
        setIsAIGenerating(true);
        setAiGeneratedData(null);

        try {
            // 1. Lấy đề gốc để làm ngữ cảnh
            const originalRes = await fetch(`${API_BASE_URL || ''}/api/Exercises/${exerciseId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const originalEx = await originalRes.json();

            // 2. Gọi AI chế đề ngay lập tức
            const response = await fetch(`${API_BASE_URL || ''}/api/AIAssistant/generate-exercise`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json", 
                    "Authorization": `Bearer ${token}` 
                },
                body: JSON.stringify({
                    Language: lang || "python", // 💡 ĐÃ FIX: Truyền ngôn ngữ thực tế của sinh viên cho AI
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
                    language: lang || "python" // 💡 ĐÃ FIX: Lưu ngôn ngữ lại để lát truyền qua Workspace
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
                    language: aiGeneratedData.language // 💡 ĐÃ FIX: Bắn thẳng ngôn ngữ sang bên kia
                }
            }
        });
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
                <Card className="border-dashed bg-muted/30">
                    <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                        <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                        <h3 className="text-xl font-bold mb-2">Trí nhớ của bạn đang ở trạng thái hoàn hảo!</h3>
                        <p className="text-muted-foreground max-w-md">
                            Hôm nay không có kiến thức nào đến hạn điểm rơi quên lãng. Bạn có thể nghỉ ngơi hoặc tiếp tục học bài mới nhé.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reviews.map((review) => (
                        <Card key={review.exerciseId} className="border-l-4 border-l-purple-500 hover:shadow-md transition-all">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-center mb-2">
                                    <Badge className="w-fit" variant="secondary">{review.difficulty}</Badge>
                                    <Badge className="w-fit" variant="outline">{review.language?.toUpperCase() || "PYTHON"}</Badge>
                                </div>
                                <CardTitle className="text-lg line-clamp-2">{review.exerciseTitle}</CardTitle>
                                <CardDescription>Trí nhớ: {review.repetitions} lần thành công</CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <Button 
                                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                                    // 💡 ĐÃ FIX: Truyền biến review.language vào hàm khi bấm nút
                                    onClick={() => handleGenerateAIReview(review.exerciseId, review.exerciseTitle, review.difficulty, review.language)}
                                >
                                    <Sparkles className="mr-2 h-4 w-4" /> Ôn ngay với AI
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl text-purple-700">
                            <Sparkles className="h-5 w-5" />
                            {isAIGenerating ? "AI đang chế đề..." : `Biến thể ôn tập: ${aiGeneratedData?.title || aiGeneratedData?.Title || ""}`}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-4">
                        {isAIGenerating ? (
                            <div className="flex flex-col items-center justify-center h-40 space-y-4">
                                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                                <p className="text-sm text-muted-foreground">Đang xào nấu dữ liệu cho bạn...</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[350px] w-full rounded-md border p-4 bg-muted/30">
                                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/80 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: aiGeneratedData?.description || aiGeneratedData?.Description || "Không thể tải được mô tả bài toán." }}
                                />
                            </ScrollArea>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Hủy</Button>
                        <Button 
                            onClick={handleProceedToWorkspace} 
                            disabled={isAIGenerating}
                            className="bg-purple-600 text-white"
                        >
                            Vào học ngay <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}