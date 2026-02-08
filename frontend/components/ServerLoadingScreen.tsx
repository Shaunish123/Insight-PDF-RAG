"use client";

import { useEffect, useState } from "react";
import { Loader2, ExternalLink } from "lucide-react";
import axios from "axios";

interface ServerLoadingScreenProps {
  onServerReady: () => void;
  apiUrl: string;
}

export default function ServerLoadingScreen({ onServerReady, apiUrl }: ServerLoadingScreenProps) {
  const [dots, setDots] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    // Animated dots (Loading... -> Loading.. -> Loading. -> Loading...)
    const dotsInterval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? "" : prev + "."));
    }, 500);

    return () => clearInterval(dotsInterval);
  }, []);

  useEffect(() => {
    // Timer to show elapsed time
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const response = await axios.get(`${apiUrl}/health`, { 
          timeout: 5000 
        });
        
        if (response.data.ready) {
          console.log("✅ Backend is ready!");
          onServerReady();
        }
      } catch (error) {
        console.log(`⏳ Waiting for backend... (Attempt ${attempts + 1})`);
        setAttempts(prev => prev + 1);
      }
    };

    // Check immediately
    checkServerHealth();

    // Then check every 3 seconds
    const healthCheckInterval = setInterval(checkServerHealth, 3000);

    return () => clearInterval(healthCheckInterval);
  }, [apiUrl, onServerReady, attempts]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-700">
        {/* Loading Animation */}
        <div className="flex flex-col items-center mb-8">
          <Loader2 className="w-16 h-16 text-blue-400 animate-spin mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">
            Waking Up the Server{dots}
          </h1>
          <p className="text-gray-400 text-center">
            The backend is hosted on Render's free tier and goes to sleep after 15 minutes of inactivity.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            This usually takes 30-50 seconds. Time elapsed: <span className="text-blue-400 font-mono">{timeElapsed}s</span>
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-8 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse transition-all duration-500"
            style={{ width: `${Math.min((timeElapsed / 50) * 100, 100)}%` }}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-700/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{attempts}</div>
            <div className="text-sm text-gray-400">Health Checks</div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{timeElapsed}s</div>
            <div className="text-sm text-gray-400">Waiting Time</div>
          </div>
        </div>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-gray-800/50 text-gray-400">While you wait</span>
          </div>
        </div>

        {/* Game Link */}
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg p-6 border border-blue-500/30">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <ExternalLink className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                🎮 Play Simon Game
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                Pass the time with this classic memory game I built! Test your memory and beat your high score.
              </p>
              <a
                href="https://shaunish123.github.io/The-Simon-Game/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Play Now
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-xs">
          <p>The server will automatically connect once it's ready.</p>
          <p className="mt-1">No action required from you! ✨</p>
        </div>
      </div>
    </div>
  );
}
