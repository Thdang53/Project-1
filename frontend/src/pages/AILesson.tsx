import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles, Play, Loader2, BookOpen, Code2, AlertCircle, Terminal, Target, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth"; 

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// 💡 IMPORT COMPONENT KNOWLEDGE GRAPH MỚI TỪ LOVABLE
import KnowledgeGraph from "@/components/ui/KnowledgeGraph";

const MOCK_API_URL = "http://localhost:5043";
const SUPPORTED_LANGUAGES = ["C++", "Python", "Java", "JavaScript"]; 

const LoadingState = ({ language }: { language: string }) => (
  <div className="flex flex-col items-center justify-center min-h-[40vh] gap-6">
    <div className="relative">
      <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    </div>
    <div className="text-center space-y-2">
      <p className="text-lg font-semibold text-foreground">
        AI đang soạn bài học bằng <span className="text-primary">{language}</span>...
      </p>
      <p className="text-sm text-muted-foreground">
        Vui lòng đợi vài giây nhé
      </p>
    </div>
  </div>
);

const MarkdownComponents = {
  code({node, inline, className, children, ...props}: any) {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <div className="rounded-xl overflow-hidden my-6 border border-border shadow-elevated">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/90" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/90" />
            <div className="h-3 w-3 rounded-full bg-green-500/90" />
          </div>
          <span className="text-xs text-zinc-400 font-mono ml-2 uppercase tracking-wider font-bold">
            {match[1]}
          </span>
        </div>
        <SyntaxHighlighter
          {...props}
          children={String(children).replace(/\n$/, '')}
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          customStyle={{ margin: 0, padding: '1.5rem', backgroundColor: '#09090b', overflowX: 'auto', fontSize: '0.9em', lineHeight: '1.6' }}
        />
      </div>
    ) : (
      <code {...props} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-md text-[0.9em] font-mono break-words border border-primary/20 font-medium">
        {children}
      </code>
    )
  }
};

const AILesson = () => {
  const { lessonId } = useParams(); 
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();
  const userEmail = user?.email || "";
  
  const exercise = location.state?.exercise;
  const isAIGenerated = location.state?.isAIGenerated;
  const aiExerciseData = location.state?.exerciseData;
  const popupLanguage = location.state?.popupLanguage;
  
  const savedLessonContent = location.state?.savedLessonContent;

  const hasFetchedRef = useRef(false);

  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    if (popupLanguage && SUPPORTED_LANGUAGES.includes(popupLanguage)) {
        return popupLanguage;
    }
    const savedLang = localStorage.getItem("preferred_language");
    return SUPPORTED_LANGUAGES.includes(savedLang || "") ? savedLang! : "C++";
  });

  const [aiContent, setAiContent] = useState<string>(savedLessonContent || "");
  const [loading, setLoading] = useState(!savedLessonContent);
  const [error, setError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // 💡 STATE CHO MINDMAP DẠNG JSON
  const [mindmapData, setMindmapData] = useState<{nodes: any[], edges: any[]} | null>(null);
  const [loadingMindmap, setLoadingMindmap] = useState(false);

  const getApiUrl = () => {
    try {
      return import.meta.env.VITE_API_BASE_URL || MOCK_API_URL;
    } catch (e) {
      return MOCK_API_URL;
    }
  };

  // 💡 HÀM NHẬN VÀ PARSE JSON TỪ AI (BỘ LỌC THÉP 100%)
  const autoFetchMindmap = async (textContent: string) => {
    if (!textContent) return;
    
    setLoadingMindmap(true);
    try {
        const API_BASE_URL = getApiUrl();
        const res = await fetch(`${API_BASE_URL}/api/AIAssistant/generate-direct-mindmap`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ Content: textContent })
        });
        const data = await res.json();
        
        if (data.success) {
            try {
                // 💡 IN RA F12 ĐỂ XEM AI NÓ ĐANG NÓI CÁI GÌ
                console.log("🤖 Dữ liệu gốc từ AI:", data.mindmapCode);

                let cleanJsonStr = data.mindmapCode;
                
                // 💡 THUẬT TOÁN KẸP LỒNG KÍNH: Chỉ lấy phần nằm trong ngoặc nhọn { ... }
                const startIndex = cleanJsonStr.indexOf('{');
                const endIndex = cleanJsonStr.lastIndexOf('}');
                
                if (startIndex !== -1 && endIndex !== -1) {
                    cleanJsonStr = cleanJsonStr.substring(startIndex, endIndex + 1);
                }

                const parsedData = JSON.parse(cleanJsonStr);
                
                // KHIÊN BẢO VỆ: Nếu AI quên trả về nodes thì mình tạo 1 node báo lỗi
                if (!parsedData.nodes || !Array.isArray(parsedData.nodes) || parsedData.nodes.length === 0) {
                     parsedData.nodes = [{ id: "1", type: "mindmap", data: { label: "Sơ đồ trống (AI không tìm thấy ý chính)", level: 1 } }];
                }
                if (!parsedData.edges || !Array.isArray(parsedData.edges)) {
                     parsedData.edges = [];
                }

                setMindmapData(parsedData);
            } catch (parseError) {
                console.error("Lỗi Parse JSON Mindmap:", parseError);
                setMindmapData({
                    nodes: [{ id: "error", type: "mindmap", data: { label: "AI sinh JSON bị lỗi (Bấm F12 để xem)", level: 1 } }],
                    edges: []
                });
            }
        } else {
            console.error("Lỗi lấy Mindmap:", data);
        }
    } catch (error) {
        console.error("Lỗi kết nối tới API Mindmap:", error);
    } finally {
        setLoadingMindmap(false);
    }
  };

  const fetchAI = async (targetLanguage: string) => {
    try {
      setLoading(true);
      setError(null);
      const API_BASE_URL = getApiUrl();

      const strictPrompt = `${exercise.description}\n\n[LƯU Ý RẤT QUAN TRỌNG TỪ HỆ THỐNG]: Hãy cung cấp kiến thức chuẩn bị và code ví dụ CHỈ BẰNG NGÔN NGỮ ${targetLanguage}. TUYỆT ĐỐI KHÔNG sử dụng, không nhắc đến, và không giải thích bằng bất kỳ ngôn ngữ lập trình nào khác. TUYỆT ĐỐI KHÔNG viết lời chào mừng dài dòng lê thê, hãy đi thẳng vào các kiến thức trọng tâm cần chuẩn bị.`;

      const response = await fetch(`${API_BASE_URL}/api/AIAssistant/prerequisites`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({
          exerciseTitle: exercise.title,
          exerciseDescription: strictPrompt,
          studentLevel: "Cơ bản"
        })
      });

      if (!response.ok) throw new Error("Lỗi khi kết nối với AI");

      const data = await response.json();
      setAiContent(data.data || data.feedback);
    } catch (err) {
      console.error("Lỗi AI:", err);
      setError("Đã có lỗi xảy ra khi tải gợi ý từ AI. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!exercise) {
      setError("Không tìm thấy thông tin bài tập. Vui lòng quay lại Dashboard.");
      setLoading(false);
      return;
    }

    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      if (!savedLessonContent) {
          fetchAI(selectedLanguage);
      }
    }
  }, [exercise]);

  // 💡 TỰ ĐỘNG CHẠY HÀM VẼ KHI AI SOẠN BÀI XONG
  useEffect(() => {
      if (aiContent && !loading && !mindmapData && !loadingMindmap) {
          autoFetchMindmap(aiContent);
      }
  }, [aiContent, loading]);

  const handleLanguageChange = (lang: string) => {
    if (lang === selectedLanguage || loading) return;
    
    setSelectedLanguage(lang);
    localStorage.setItem("preferred_language", lang);
    setIsSaved(false); 
    setMindmapData(null); // 💡 Reset mindmap cũ
    fetchAI(lang); 
  };

  const handleSaveLesson = async () => {
    if (!userEmail || !exercise) return;
    
    setIsSaving(true);
    try {
      const API_BASE_URL = getApiUrl();
      const response = await fetch(`${API_BASE_URL}/api/SavedAI/save`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({
          userEmail: userEmail,
          title: exercise.title,
          description: exercise.description,
          difficulty: exercise.difficulty || "Cơ bản",
          language: selectedLanguage,
          starterCode: aiContent, 
          testCases: "[]",
          contentType: "Lesson" 
        })
      });

      if (response.ok) {
        setIsSaved(true);
      }
    } catch (e) {
      console.error("Lỗi khi lưu bài giảng:", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto max-w-7xl flex h-16 items-center px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 shadow-glow-sm">
              <Code2 className="h-5 w-5 text-primary" />
            </div>
            <span className="font-extrabold text-xl text-foreground tracking-tight">AI Learning <span className="text-primary">Hub</span></span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto max-w-4xl px-4 py-8 flex-1">
        <div className="flex justify-between items-start mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/student-dashboard')}
            className="text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Quay lại Dashboard
          </Button>

          {!loading && !error && userEmail && !savedLessonContent && (
             <Button 
               onClick={handleSaveLesson} 
               disabled={isSaving || isSaved}
               variant="outline"
               className={`border-primary/30 text-primary hover:bg-primary/10 transition-all ${
                 isSaved ? 'opacity-70 cursor-not-allowed bg-primary/10 border-primary/50' : ''
               }`}
             >
               {isSaving ? (
                 <Loader2 className="h-4 w-4 mr-2 animate-spin" />
               ) : (
                 <Heart className={`h-4 w-4 mr-2 ${isSaved ? 'fill-primary' : ''}`} />
               )}
               {isSaved ? "Đã lưu vào Thư viện" : "Lưu bài giảng AI"}
             </Button>
          )}
        </div>

        {error && !aiContent ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-8 text-center mt-10">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Oops! Có lỗi xảy ra</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate('/student-dashboard')}>
              Về trang chủ
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6 space-y-3">
              <Badge className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-glow-sm">
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                AI Preparation
              </Badge>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Chuẩn bị kiến thức:{" "}
                <span className="text-primary">{exercise?.title}</span>
              </h1>
              <p className="text-muted-foreground text-[15px] leading-relaxed max-w-2xl">
                Đọc kỹ yêu cầu đề bài và gợi ý từ AI dưới đây trước khi bắt đầu viết code.
              </p>
            </div>

            <Card className="rounded-2xl border-border bg-card shadow-sm mb-8">
              <CardContent className="p-5 sm:p-7">
                <div className="flex items-center gap-2 text-foreground font-bold mb-4 pb-3 border-b border-border/50">
                  <Target className="h-5 w-5 text-primary" />
                  <span className="text-base uppercase tracking-wider">Yêu cầu đề bài</span>
                </div>
                <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none w-full break-words prose-headings:text-foreground prose-p:text-muted-foreground/90 prose-p:leading-relaxed">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]} 
                    components={MarkdownComponents}
                  >
                    {exercise?.description || "Không có mô tả cho bài tập này."}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* ======================================================== */}
            {/* 💡 KHU VỰC HIỂN THỊ KNOWLEDGE GRAPH TỰ ĐỘNG */}
            {/* ======================================================== */}
            {(loadingMindmap || mindmapData) && (
              <div className="mb-8 p-6 bg-card border border-border rounded-2xl shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-2 text-foreground font-bold mb-6">
                      <span className="text-xl flex items-center">
                          🧠 Sơ đồ Kiến thức (Mindmap)
                          {loadingMindmap && (
                              <span className="ml-3 text-sm font-normal text-muted-foreground flex items-center">
                                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-primary" /> 
                                  AI đang thiết kế sơ đồ...
                              </span>
                          )}
                      </span>
                  </div>
                  
                  {mindmapData && (
                      <div className="animate-in slide-in-from-bottom-4 fade-in duration-700">
                          <KnowledgeGraph nodes={mindmapData.nodes} edges={mindmapData.edges} />
                      </div>
                  )}
                  
                  {/* Lớp phủ mờ đẹp mắt khi đang tải */}
                  {loadingMindmap && (
                      <div className="h-[400px] w-full rounded-xl bg-muted/30 animate-pulse flex flex-col items-center justify-center border border-dashed border-border">
                          <div className="h-2 w-1/3 bg-primary/20 rounded-full overflow-hidden mb-4">
                              <div className="h-full w-1/2 bg-primary rounded-full animate-bounce"></div>
                          </div>
                          <p className="text-muted-foreground text-sm font-medium">Đang gọi thuật toán Layout...</p>
                      </div>
                  )}
              </div>
            )}
            {/* ======================================================== */}

            <div className="flex flex-wrap items-center gap-2 mb-6 p-4 bg-muted/40 rounded-xl border border-border">
              <div className="flex items-center text-sm font-semibold text-muted-foreground mr-2">
                <Terminal className="h-4 w-4 mr-1.5 text-primary" /> Hướng dẫn giải bằng:
              </div>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  disabled={loading}
                  onClick={() => handleLanguageChange(lang)}
                  className={`px-5 py-2 text-sm font-bold rounded-full border transition-all duration-300 ${
                    selectedLanguage === lang
                      ? "bg-primary text-primary-foreground border-primary shadow-glow scale-105"
                      : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground hover:bg-muted disabled:opacity-50"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {loading ? (
              <LoadingState language={selectedLanguage} />
            ) : (
              <Card className="rounded-2xl shadow-card border-border mb-8 overflow-hidden animate-in fade-in duration-500">
                <CardContent className="p-5 sm:p-8 w-full overflow-x-hidden">
                  <div className="flex items-center gap-2 text-primary mb-6 pb-4 border-b border-border/50">
                    <BookOpen className="h-5 w-5" />
                    <span className="text-sm font-bold uppercase tracking-wider">
                      Bài giảng {selectedLanguage}
                    </span>
                  </div>

                  <article className="prose prose-sm sm:prose-base dark:prose-invert max-w-none w-full break-words prose-headings:text-foreground prose-p:text-muted-foreground/90 prose-p:leading-relaxed prose-a:text-primary prose-strong:text-foreground prose-ul:list-disc prose-ol:list-decimal">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={MarkdownComponents}
                    >
                      {aiContent}
                    </ReactMarkdown>
                  </article>
                </CardContent>
              </Card>
            )}

            {!loading && (
              <div className="flex justify-end mt-10 mb-6">
                <Button 
                  size="lg" 
                  className="text-base px-10 h-12 rounded-xl font-bold shadow-glow" 
                  onClick={() => {
                    const langMap: Record<string, string> = {
                      "C++": "cpp",
                      "Python": "python",
                      "Java": "java",
                      "JavaScript": "javascript"
                    };
                    const targetWorkspaceLang = langMap[selectedLanguage] || "python";

                    navigate(`/workspace/${exercise.id}`, {
                      state: { 
                        pastLanguage: targetWorkspaceLang,
                        isAIGenerated: isAIGenerated, 
                        exerciseData: aiExerciseData  
                      }
                    });
                  }}
                >
                  Đã hiểu! Viết code {selectedLanguage} ngay
                  <Play className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <footer className="py-8 px-6 text-center border-t border-border bg-card/50 mt-auto">
          <p className="text-xs text-muted-foreground">Học tập hiệu quả hơn cùng AI Learning Hub &copy; 2026</p>
      </footer>
    </div>
  );
};

export default AILesson;