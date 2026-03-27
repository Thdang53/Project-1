import { useState } from "react";
import { Copy, Download, X, Check, FileCode, Bot } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/scroll-area";
import { motion } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

// 🚀 Đã cập nhật Interface để nhận dữ liệu THẬT từ Gemini
interface ArtifactPreviewProps {
  open: boolean;
  onClose: () => void;
  data: {
    type: string;
    content: string;
  };
}

const ArtifactPreview = ({ open, onClose, data }: ArtifactPreviewProps) => {
  const [copied, setCopied] = useState(false);

  // Tính toán số dòng từ dữ liệu thật
  const lines = data.content.split("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(data.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Chuẩn hóa tên ngôn ngữ
  const getLanguage = (type: string) => {
    const t = type.toLowerCase();
    if (t === 'py') return 'python';
    if (t === 'js') return 'javascript';
    if (t === 'cs') return 'csharp';
    return t; 
  };

  const getExtension = (lang: string) => {
    if (lang === "python") return "py";
    if (lang === "json") return "json";
    if (lang === "javascript") return "js";
    if (lang === "cpp") return "cpp";
    if (lang === "java") return "java";
    if (lang === "csharp") return "cs";
    return "txt";
  };

  const handleDownload = () => {
    const blob = new Blob([data.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    
    const lang = getLanguage(data.type);
    const extension = getExtension(lang);

    a.download = `artifact_${Date.now()}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0.8 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ ease: "easeOut", duration: 0.3 }}
      className="flex flex-col h-full w-[45%] min-w-[420px] border-l border-slate-200/80 bg-white shadow-[-12px_0_40px_-15px_rgba(0,0,0,0.08)] absolute right-0 top-0 bottom-0 z-50"
    >
      {/* ── Header ─────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-sm px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <FileCode className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            Artifact Preview
          </span>
          <Badge
            variant="secondary"
            className="rounded-md bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-0"
          >
            {/* Đổi ngôn ngữ hiển thị động */}
            {data.type}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-150"
            onClick={handleCopy}
            title="Copy Code"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-150"
            onClick={handleDownload}
            title="Download File"
          >
            <Download className="h-4 w-4" />
          </Button>
          <div className="mx-1.5 h-4 w-px bg-slate-200" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-150"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ── Code Editor Area ───────────────────────── */}
      <ScrollArea className="flex-1 bg-slate-50">
        <SyntaxHighlighter
          // Truyền ngôn ngữ động vào để nhận diện màu sắc
          language={getLanguage(data.type)}
          style={oneLight}
          showLineNumbers
          wrapLines
          lineNumberStyle={{
            minWidth: "3em",
            paddingRight: "1.2em",
            color: "#c1c7cd",
            fontSize: "12px",
            userSelect: "none",
            textAlign: "right",
          }}
          customStyle={{
            margin: 0,
            padding: "1.25rem 0",
            background: "transparent",
            fontSize: "13px",
            lineHeight: "1.75",
            fontFamily: "'Fira Code', 'JetBrains Mono', ui-monospace, monospace",
          }}
          codeTagProps={{
            style: {
              fontFamily: "'Fira Code', 'JetBrains Mono', ui-monospace, monospace",
            },
          }}
        >
          {/* Đổ dữ liệu thật vào */}
          {data.content}
        </SyntaxHighlighter>
      </ScrollArea>

      {/* ── Footer ─────────────────────────────────── */}
      <div className="flex h-8 shrink-0 items-center justify-between border-t border-slate-100 bg-slate-100/60 px-5">
        <span className="text-[11px] font-mono text-slate-400">
          preview_file.{getExtension(getLanguage(data.type))}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400">
            {lines.length} lines · UTF-8
          </span>
          <Bot className="h-3 w-3 text-slate-300" />
        </div>
      </div>
    </motion.div>
  );
};

export default ArtifactPreview;