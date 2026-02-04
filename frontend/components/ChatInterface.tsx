"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Loader2, User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown"; // <--- NEW IMPORT
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
    } catch (error) {
      console.error(error);
      alert("Failed to upload PDF.");
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
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev, 
        { role: "ai", content: "❌ Error connecting to server." }
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
    <div className="w-full flex flex-col h-full bg-white relative">
      {/* Loading Overlay */}
      {isUploading && (
        <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-20">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm font-medium text-gray-600">Analyzing Document...</p>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`flex items-start gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-orange-500 text-white"}`}>
                {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

              <div className={`p-4 rounded-lg text-sm leading-relaxed ${msg.role === "user" ? "bg-blue-50 text-blue-900 rounded-tr-none" : "bg-gray-100 text-gray-800 rounded-tl-none"}`}>
                {/* --- NEW: MARKDOWN RENDERER --- */}
                {msg.role === "ai" ? (
                  <div className="prose prose-sm max-w-none text-gray-800">
                    <ReactMarkdown
                      components={{
                        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                        strong: ({node, ...props}) => <span className="font-bold text-gray-900" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2" {...props} />,
                        li: ({node, ...props}) => <li className="mb-1" {...props} />,
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
          <div className="flex items-center gap-2 text-gray-400 text-sm ml-12">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isUploading || isThinking}
          />
          <button onClick={handleSendMessage} disabled={isUploading || !inputValue.trim()} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}