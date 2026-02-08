"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import PDFViewer from "@/components/PDFViewer";
import ChatInterface from "@/components/ChatInterface";
import ServerLoadingScreen from "@/components/ServerLoadingScreen";
import { FileText, UploadCloud, X } from "lucide-react";

export default function Home() {
  // Server status state
  const [isServerReady, setIsServerReady] = useState(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  
  // Skip loading screen for local development
  const isLocalDev = apiUrl.includes("localhost");

  const [activeFile, setActiveFile] = useState<File | undefined>(undefined);
  const [activeFileUrl, setActiveFileUrl] = useState<string | null>(null);
  
  // Layout State for Resizing
  const [pdfWidth, setPdfWidth] = useState(50); // Start at 50%
  const [isDragging, setIsDragging] = useState(false);
  
  // Toast notification state
  const [showToast, setShowToast] = useState(false);
  
  // About modal state
  const [showAbout, setShowAbout] = useState(false);

  // Handle Mouse Drag for Resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newWidth = (e.clientX / window.innerWidth) * 100;
      setPdfWidth(Math.min(Math.max(newWidth, 20), 80)); // Clamp between 20% and 80%
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Handle Arrow Keys for Resizing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeFile) return; // Only resize if a file is open

      if (e.ctrlKey && e.key === "ArrowLeft") {
        setPdfWidth(prev => Math.max(20, prev - 5)); // Shrink PDF (Min 20%)
      }
      if (e.ctrlKey && e.key === "ArrowRight") {
        setPdfWidth(prev => Math.min(80, prev + 5)); // Grow PDF (Max 80%)
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setActiveFile(file);
      setActiveFileUrl(URL.createObjectURL(file));
      
      // Show toast notification when file is first opened
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000); // Hide after 5 seconds
    }
  };
  
  const handleUploadNew = () => {
    // Clean up old file URL
    if (activeFileUrl) {
      URL.revokeObjectURL(activeFileUrl);
    }
    setActiveFile(undefined);
    setActiveFileUrl(null);
  };

  // Show loading screen only for production (Render deployment)
  if (!isServerReady && !isLocalDev) {
    return (
      <ServerLoadingScreen 
        onServerReady={() => setIsServerReady(true)}
        apiUrl={apiUrl}
      />
    );
  }

  return (
    <main className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header 
        hasActiveFile={!!activeFile}
        onUploadNew={handleUploadNew}
        onAbout={() => setShowAbout(true)}
      />

      {!activeFile ? (
        // --- LANDING PAGE (Restored) ---
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
          <div className="bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 max-w-lg w-full transition-colors">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Welcome to InsightPDF
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
              Upload your technical documents, research papers, or manuals. 
              Our AI will analyze them and answer your questions instantly.
            </p>

            {/* Upload Button */}
            <label className="cursor-pointer group relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-8 h-8 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 mb-2 transition" />
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium">
                  Click to upload PDF
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">PDF files up to 50MB</p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept=".pdf" 
                onChange={handleFileSelect} 
              />
            </label>
          </div>
        </div>
      ) : (
        // --- SPLIT SCREEN WORKSPACE ---
        <div className="flex flex-1 overflow-hidden animate-in slide-in-from-bottom-4 duration-500 relative">
          
          {/* LEFT: PDF VIEWER (Dynamic Width) */}
          <div 
            style={{ width: `${pdfWidth}%` }} 
            className="h-full transition-all duration-200 ease-in-out border-r border-gray-200 dark:border-gray-700"
          >
            <PDFViewer fileUrl={activeFileUrl} />
          </div>

          {/* DRAGGER HANDLE (Visual Indicator) */}
          <div 
            className={`w-1 cursor-col-resize flex items-center justify-center z-10 transition-all ${
              isDragging ? "bg-blue-500 w-2" : "bg-gray-200 dark:bg-gray-700 hover:bg-blue-400 dark:hover:bg-blue-500"
            }`}
            onMouseDown={() => setIsDragging(true)}
          >
            <div className={`h-12 w-1 rounded-full transition-all ${
              isDragging ? "bg-blue-600 w-1" : "bg-gray-400 dark:bg-gray-600"
            }`} />
          </div>
          
          {/* RIGHT: CHAT INTERFACE (Remaining Width) */}
          <div 
            style={{ width: `${100 - pdfWidth}%` }} 
            className="h-full transition-all duration-200 ease-in-out"
          >
            <ChatInterface initialFile={activeFile} />
          </div>

          {/* Toast Notification */}
          {showToast && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-top-4 duration-300">
              <div className="flex flex-col">
                <span className="font-semibold text-sm">💡 Quick Tip</span>
                <span className="text-xs">Press <kbd className="px-1.5 py-0.5 bg-blue-700 rounded text-xs mx-1">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-blue-700 rounded text-xs mx-1">←</kbd> / <kbd className="px-1.5 py-0.5 bg-blue-700 rounded text-xs mx-1">→</kbd> to resize panels or drag the divider</span>
              </div>
              <button 
                onClick={() => setShowToast(false)}
                className="hover:bg-blue-700 rounded p-1 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 cursor-wait" onClick={() => setShowAbout(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 cursor-default" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">About InsightPDF</h2>
              <button onClick={() => setShowAbout(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-3 text-gray-600 dark:text-gray-300 text-sm">
              <p>
                <strong className="text-gray-900 dark:text-white">InsightPDF</strong> is an AI-powered document assistant that helps you understand complex PDFs through natural conversation.
              </p>
              <p>
                Built with <strong>Next.js</strong>, <strong>FastAPI</strong>, and <strong>Google Gemini AI</strong>, using advanced RAG (Retrieval Augmented Generation) technology.
              </p>
              <div className="pt-4 border-t dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">Developed as a learning project • February 2026</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}