import { MessageSquare, BookOpen, Minimize2, Maximize2, X, Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface LeftPanelProps {
  isChatExpanded: boolean;
  setIsChatExpanded: (expanded: boolean) => void;
  showChat: boolean;
  setShowChat: (show: boolean) => void;
  isLoading: boolean;
  exercise: any;
  MarkdownComponents: any;
  chatMessages: any[];
  isChatLoading: boolean;
  chatInput: string;
  setChatInput: (input: string) => void;
  cooldown: number;
  handleSendMessage: () => void;
  handleReportAI: (msg: string) => void;
}

const LeftPanel = ({
  isChatExpanded, setIsChatExpanded, showChat, setShowChat, isLoading, exercise, 
  MarkdownComponents, chatMessages, isChatLoading, chatInput, setChatInput, 
  cooldown, handleSendMessage, handleReportAI
}: LeftPanelProps) => {
  return (
    <div className={`${isChatExpanded ? "w-[45%]" : "w-[30%]"} min-w-[300px] border-r border-editor-line flex flex-col transition-all duration-300 ease-in-out`}>
      
      {/* KHU VỰC 1: NỘI DUNG ĐỀ BÀI */}
      {!isChatExpanded && (
        <div className={`${showChat ? "flex-1" : "flex-[2]"} overflow-auto p-5 border-b border-editor-line`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-primary">
              <BookOpen className="h-5 w-5" />
              <h2 className="font-semibold text-editor-foreground">Yêu cầu đề bài</h2>
            </div>
            {!showChat && (
              <button onClick={() => setShowChat(true)} className="text-xs flex items-center gap-1 text-primary hover:underline">
                <MessageSquare className="h-3.5 w-3.5" /> Mở Chat
              </button>
            )}
          </div>
          
          <div className="space-y-4 text-sm text-editor-foreground/80 leading-relaxed">
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-editor-line rounded w-3/4"></div>
                <div className="h-4 bg-editor-line rounded w-full"></div>
              </div>
            ) : exercise ? (
              <div className="prose prose-sm prose-invert max-w-none text-editor-foreground/80 font-sans">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                  {exercise.description}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-destructive">Lỗi: Không tải được đề bài.</p>
            )}
          </div>
        </div>
      )}

      {/* KHU VỰC 2: CỬA SỔ CHAT VỚI AI */}
      {showChat && (
        <div className="flex-1 flex flex-col min-h-[250px]">
          <div className="flex items-center justify-between px-4 py-2 border-b border-editor-line bg-editor-line/10">
            <div className="flex items-center gap-2 text-sm font-medium text-editor-foreground">
              <MessageSquare className="h-4 w-4 text-primary" /> Chat với AI
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsChatExpanded(!isChatExpanded)}
                className="p-1.5 rounded hover:bg-editor-line text-editor-foreground/50 hover:text-primary transition-colors"
                title={isChatExpanded ? "Thu nhỏ về bình thường" : "Phóng to cửa sổ Chat"}
              >
                {isChatExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button 
                onClick={() => { setShowChat(false); setIsChatExpanded(false); }} 
                className="p-1.5 rounded hover:bg-editor-line text-editor-foreground/50 hover:text-destructive transition-colors"
                title="Đóng Chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-editor-line text-editor-foreground"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                        {msg.content || "..."}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>

                {msg.role === "assistant" && msg.content && (
                  <div className="mt-1.5 opacity-60 hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleReportAI(msg.content)}
                      className="text-[11px] flex items-center gap-1.5 text-orange-400 bg-orange-400/10 hover:bg-orange-400/20 px-2 py-1 rounded-md font-medium transition-colors"
                      title="Báo cáo AI trả lời không tốt"
                    >
                      <Flag className="w-3 h-3" /> Cần giảng viên hỗ trợ
                    </button>
                  </div>
                )}
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-editor-line text-editor-foreground rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> Đang soạn câu trả lời...
                </div>
              </div>
            )}
          </div>
          <div className="p-3 border-t border-editor-line">
            <div className="flex gap-2 relative">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={cooldown > 0 ? `Đợi ${cooldown}s...` : "Hỏi AI về bài tập..."}
                disabled={cooldown > 0}
                className="flex-1 rounded-lg bg-editor-line px-3 py-2.5 text-sm text-editor-foreground placeholder:text-editor-foreground/30 outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              <Button onClick={handleSendMessage} disabled={isChatLoading || cooldown > 0} size="sm" className="bg-gradient-primary text-primary-foreground h-10 w-10 p-0 disabled:opacity-50">
                {cooldown > 0 ? <span className="text-xs font-bold">{cooldown}s</span> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeftPanel;