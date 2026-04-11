import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface ReviewItem {
    exerciseId: number;
    exerciseTitle: string;
    difficulty: string;
    repetitions: number;
    nextReviewDate: string;
}

export default function DailyReviewsTab() {
    const { user, token } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [reviews, setReviews] = useState<ReviewItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.email) {
            fetchReviews();
        }
    }, [user]);

    const fetchReviews = async () => {
        try {
            const res = await fetch(`/api/exercises/daily-reviews?email=${user?.email}`, {
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

    const handleCreateVariant = (exerciseId: number, title: string) => {
        toast({
            title: "🧠 Đang kích hoạt AI...",
            description: `Hệ thống đang tạo biến thể mới cho bài "${title}" để bạn ôn tập.`,
        });
        
        // Chuyển hướng sang màn hình Workspace kèm theo ID bài cũ để AI biết đường "chế" lại đề
        setTimeout(() => {
            navigate(`/workspace?reviewId=${exerciseId}&mode=adaptive-review`);
        }, 1500);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64 text-muted-foreground animate-pulse">Đang đồng bộ trí nhớ của bạn...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Brain className="h-6 w-6 text-purple-500" />
                        Góc Ôn Tập (Spaced Repetition)
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Thuật toán AI SM-2 đã tính toán chính xác điểm rơi quên lãng của bạn. Hãy hoàn thành các nhiệm vụ dưới đây để đưa kiến thức vào trí nhớ dài hạn!
                    </p>
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
                                <div className="flex justify-between items-start">
                                    <Badge variant={
                                        review.difficulty === 'Dễ' || review.difficulty === 'Cơ bản' ? 'secondary' :
                                        review.difficulty === 'Khó' || review.difficulty === 'Nâng cao' ? 'destructive' : 'default'
                                    }>
                                        {review.difficulty}
                                    </Badge>
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> Quá hạn ôn tập
                                    </Badge>
                                </div>
                                <CardTitle className="text-lg mt-2 line-clamp-2">{review.exerciseTitle}</CardTitle>
                                <CardDescription>
                                    Chuỗi trí nhớ: <strong className="text-foreground">{review.repetitions} lần</strong> liên tiếp
                                </CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <Button 
                                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg"
                                    onClick={() => handleCreateVariant(review.exerciseId, review.exerciseTitle)}
                                >
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    AI Tạo biến thể & Ôn ngay
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}