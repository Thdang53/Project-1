import { useState } from "react";
import { Code2, Copy, Download, X, Check, FileCode } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/scroll-area";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

// Interface để nhận data từ GeminiSidebar truyền vào
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

  // Tách dòng từ code thật
  const lines = data.content.split("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(data.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([data.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    
    // Tự động nhận diện đuôi file
    let extension = "txt";
    if (data.type.toLowerCase() === "python" || data.type.toLowerCase() === "py") extension = "py";
    else if (data.type.toLowerCase() === "json") extension = "json";
    else if (data.type.toLowerCase() === "javascript" || data.type.toLowerCase() === "js") extension = "js";
    else if (data.type.toLowerCase() === "cpp") extension = "cpp";
    else if (data.type.toLowerCase() === "java") extension = "java";

    a.download = `artifact_${Date.now()}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0.5 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="flex flex-col h-full w-[45%] min-w-[400px] max-w-[800px] border-l border-border/60 bg-background shadow-[-8px_0_30px_-12px_rgba(0,0,0,0.12)] z-50 absolute right-0 top-0 bottom-0"
    >
      {/* ── Header ─────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 bg-background/80 px-4 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
            <FileCode className="h-4.5 w-4.5 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Artifact Preview
          </span>
          <Badge
            variant="secondary"
            className="rounded-md px-2 py-0 text-[10px] font-bold uppercase tracking-wider ml-2"
          >
            {data.type}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={handleCopy}
            title="Copy Code"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={handleDownload}
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
          <div className="mx-1 h-4 w-px bg-border/60" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="h-4.5 w-4.5" />
          </Button>
        </div>
      </header>

      {/* ── Code Editor Area ───────────────────────── */}
      <ScrollArea className="flex-1 bg-[#0d1117] w-full">
        <div className="min-w-max min-h-full">
          <pre className="p-0 m-0">
            <code className="block text-[13px] leading-[1.7] font-mono">
              {lines.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex hover:bg-white/[0.04] transition-colors duration-100",
                    i === 0 && "pt-4",
                    i === lines.length - 1 && "pb-4"
                  )}
                >
                  {/* Gutter (Số dòng) */}
                  <span className="sticky left-0 w-12 shrink-0 select-none bg-[#0d1117] pr-3 text-right text-[12px] leading-[1.7] text-[#484f58] font-mono">
                    {i + 1}
                  </span>
                  {/* Code line */}
                  <span className="flex-1 px-4 text-[#e6edf3] whitespace-pre">
                    {/* Nếu file là JSON, không dùng highlight vì regex highlight ở dưới đang viết cho Python. Render text thuần */}
                    {data.type.toLowerCase() === "json" ? line : highlightLine(line)}
                  </span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      </ScrollArea>

      {/* ── Footer ─────────────────────────────────── */}
      <div className="flex h-9 shrink-0 items-center justify-between border-t border-border/40 bg-[#0d1117] px-4">
        <span className="text-[11px] font-mono text-[#484f58] flex items-center gap-2">
           <Code2 className="h-3.5 w-3.5" /> preview_file.{data.type.toLowerCase()}
        </span>
        <span className="text-[11px] font-mono text-[#484f58]">
          {lines.length} lines · UTF-8
        </span>
      </div>
    </motion.div>
  );
};

/* ── Minimal Syntax Highlighting (Cho code giống Hacker) ───────────────────── */
function highlightLine(line: string): React.ReactNode {
  if (line.trimStart().startsWith("#") || line.trimStart().startsWith("//")) {
    return <span className="text-[#8b949e] italic">{line}</span>;
  }
  if (line.trimStart().startsWith('"""') || line.trimStart().startsWith("'''")) {
    return <span className="text-[#a5d6ff]">{line}</span>;
  }

  const parts: React.ReactNode[] = [];
  const keywords = /\b(import|from|def|return|if|else|print|as|class|for|in|and|or|not|True|False|None|let|const|var|function|public|private)\b/g;
  const strings = /(["'])(?:(?=(\\?))\2.)*?\1/g;
  const numbers = /\b(\d+\.?\d*)\b/g;
  const builtins = /\b(len|range|int|str|float|list|dict|set|type|open|super|self|console|Math)\b/g;

  let result = line;
  const tokens: { start: number; end: number; cls: string }[] = [];

  let m: RegExpExecArray | null;
  
  // Keyword (Màu đỏ/hồng)
  while ((m = keywords.exec(result)) !== null) {
    tokens.push({ start: m.index, end: m.index + m[0].length, cls: "text-[#ff7b72]" });
  }
  // String (Màu xanh biển nhạt)
  while ((m = strings.exec(result)) !== null) {
    tokens.push({ start: m.index, end: m.index + m[0].length, cls: "text-[#a5d6ff]" });
  }
  // Number (Màu xanh lơ)
  while ((m = numbers.exec(result)) !== null) {
    tokens.push({ start: m.index, end: m.index + m[0].length, cls: "text-[#79c0ff]" });
  }
  // Built-in functions (Màu tím)
  while ((m = builtins.exec(result)) !== null) {
    tokens.push({ start: m.index, end: m.index + m[0].length, cls: "text-[#d2a8ff]" });
  }

  if (tokens.length === 0) return line;

  tokens.sort((a, b) => a.start - b.start);

  const clean: typeof tokens = [];
  for (const t of tokens) {
    if (clean.length === 0 || t.start >= clean[clean.length - 1].end) {
      clean.push(t);
    }
  }

  let last = 0;
  for (const t of clean) {
    if (t.start > last) parts.push(result.slice(last, t.start));
    parts.push(
      <span key={t.start} className={t.cls}>
        {result.slice(t.start, t.end)}
      </span>
    );
    last = t.end;
  }
  if (last < result.length) parts.push(result.slice(last));

  return <>{parts}</>;
}

export default ArtifactPreview;