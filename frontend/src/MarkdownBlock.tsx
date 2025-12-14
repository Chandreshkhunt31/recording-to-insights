import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownBlock({ text }: { text: string }) {
  return (
    <div className="text-slate-700 leading-7">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 list-disc pl-5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal pl-5 space-y-1">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          h1: ({ children }) => <h1 className="text-xl font-bold text-slate-900 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold text-slate-900 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold text-slate-900 mb-2">{children}</h3>,
          hr: () => <div className="h-px w-full bg-slate-200 my-4" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-slate-200 pl-4 text-slate-600 my-3">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.9em] text-slate-800">{children}</code>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}


