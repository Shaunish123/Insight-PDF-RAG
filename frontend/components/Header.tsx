"use client";

import { FileText, Github, Upload, Info } from "lucide-react";

interface HeaderProps {
  hasActiveFile?: boolean;
  onUploadNew?: () => void;
  onAbout?: () => void;
}

export default function Header({ hasActiveFile, onUploadNew, onAbout }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b dark:border-gray-700 shadow-sm transition-colors">
      <div className="flex items-center gap-2">
        <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">InsightPDF</h1>
      </div>
      
      <div className="flex items-center gap-4">
        {hasActiveFile && (
          <>
            <button
              onClick={onUploadNew}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-lg transition"
            >
              <Upload className="w-4 h-4" />
              Upload PDF
            </button>
            <button
              onClick={onAbout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition"
            >
              <Info className="w-4 h-4" />
              About
            </button>
          </>
        )}
        <a 
          href="https://github.com" 
          target="_blank" 
          className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
        >
          <Github className="w-5 h-5" />
        </a>
      </div>
    </header>
  );
}