"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Loader2, User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { uploadPDF, chatWithPDF } from "@/lib/api";

interface Message {
  role: "user" | "ai";
  content: string;
}

// Accept the initial file passed from the Landing Page
interface Props {
  initialFile?: File;
}

export default function ChatInterface({ initialFile }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hello! I've read your document. Ask me anything." },
  ]);
  const [inputValue, setInputValue] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasUploadedRef = useRef(false); // Track if we've already uploaded

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // AUTOMATIC UPLOAD ON LOAD
  // If the Landing Page passed a file, upload it immediately.
  // useRef prevents duplicate uploads in React Strict Mode (dev mode)
  useEffect(() => {
    if (initialFile && !hasUploadedRef.current) {
      hasUploadedRef.current = true;
      handleUpload(initialFile);
    }
  }, [initialFile]);

  const handleUpload = async (file: File) => {
    try {
      setIsUploading(true);
      await uploadPDF(file);
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: `✅ **${file.name}** processed! I am ready.` },
      ]);
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.response?.data?.detail || error.message || "Unknown error occurred";
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: `❌ **Upload Failed:** ${errorMsg}\n\nPlease check that:\n- File is a valid PDF\n- File size is under 50MB\n- Backend server is running` },
      ]);
    } finally {
      setIsUploading(false);
    }
  };

const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const question = inputValue;
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setIsThinking(true);

    try {
      // --- NEW: Convert message state to Backend History Format ---
      // We take the last 6 messages to keep context without overloading the token limit
      const history = messages.slice(-6).map(msg => [
        msg.role === "user" ? "human" : "ai", 
        msg.content
      ]) as [string, string][];

      const data = await chatWithPDF(question, history);
      
      setMessages((prev) => [...prev, { role: "ai", content: data.answer }]);
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.response?.data?.detail || error.message || "Unknown error";
      const statusCode = error.response?.status;
      
      let userMessage = `❌ **Error:** ${errorMsg}`;
      
      if (statusCode === 400) {
        userMessage += "\n\n💡 **Tip:** Make sure you've uploaded a PDF first.";
      } else if (statusCode === 500) {
        userMessage += "\n\n⚠️ The server encountered an error. Please try again or upload a different PDF.";
      } else if (!statusCode) {
        userMessage = "❌ **Connection Error:** Cannot reach the server.\n\n🔌 Please check that the backend is running on port 8000.";
      }
      
      setMessages((prev) => [
        ...prev, 
        { role: "ai", content: userMessage }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-full flex flex-col h-full bg-white dark:bg-gray-900 relative transition-colors">
      {/* Loading Overlay */}
      {isUploading && (
        <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 flex items-center justify-center z-20 cursor-wait">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Analyzing Document...</p>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`flex items-start gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-blue-600 dark:bg-blue-500 text-white" : "bg-orange-500 dark:bg-orange-600 text-white"}`}>
                {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

              <div className={`p-4 rounded-lg text-sm leading-relaxed ${msg.role === "user" ? "bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 rounded-tr-none" : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none"}`}>
                {/* --- NEW: MARKDOWN RENDERER --- */}
                {msg.role === "ai" ? (
                  <div className="prose prose-sm max-w-none text-gray-800 dark:text-gray-200 break-words overflow-hidden">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
                      components={{
                        p: ({node, ...props}) => <p className="mb-2 last:mb-0 break-words" {...props} />,
                        strong: ({node, ...props}) => <span className="font-bold text-gray-900 dark:text-white" {...props} />,
                        em: ({node, ...props}) => <span className="italic" {...props} />,
                        h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-2 mt-3 first:mt-0 text-gray-900 dark:text-white break-words" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0 text-gray-900 dark:text-white break-words" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-base font-bold mb-2 mt-2 first:mt-0 text-gray-900 dark:text-white break-words" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="break-words" {...props} />,
                        a: ({node, ...props}) => <a className="text-blue-500 dark:text-blue-400 underline hover:text-blue-600 dark:hover:text-blue-300 break-all" target="_blank" rel="noopener noreferrer" {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-3 italic my-2 text-gray-700 dark:text-gray-300" {...props} />,
                        table: ({node, ...props}) => <div className="overflow-x-auto my-2"><table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600" {...props} /></div>,
                        thead: ({node, ...props}) => <thead className="bg-gray-200 dark:bg-gray-700" {...props} />,
                        tbody: ({node, ...props}) => <tbody {...props} />,
                        tr: ({node, ...props}) => <tr className="border-b border-gray-300 dark:border-gray-600" {...props} />,
                        th: ({node, ...props}) => <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left font-semibold" {...props} />,
                        td: ({node, ...props}) => <td className="border border-gray-300 dark:border-gray-600 px-3 py-2" {...props} />,
                        code: ({node, className, children, ...props}) => {
                          const isInline = !className;
                          return isInline ? (
                            <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono break-all" {...props}>
                              {children}
                            </code>
                          ) : (
                            <code className="block bg-gray-200 dark:bg-gray-700 p-3 rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words mb-2" {...props}>
                              {children}
                            </code>
                          );
                        },
                        pre: ({node, children, ...props}) => <pre className="overflow-x-auto mb-2 max-w-full" {...props}>{children}</pre>,
                        hr: ({node, ...props}) => <hr className="my-3 border-gray-300 dark:border-gray-600" {...props} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm ml-12">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            disabled={isUploading || isThinking}
          />
          <button onClick={handleSendMessage} disabled={isUploading || !inputValue.trim()} className="p-2 bg-blue-600 dark:bg-blue-500 text-white rounded-full hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}