'use client';
import { useState, useEffect } from 'react';
import ConversationPractice from '@/components/ConversationPractice';

import { Loader2, RefreshCcw } from 'lucide-react';

export default function PracticePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scriptData, setScriptData] = useState<any>(null);

  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [score, setScore] = useState(0);

  const fetchRandomScript = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/practice/random', { cache: 'no-store' });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to load script');
        return;
      }
      
      setScriptData(data.script);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRandomScript();
  }, []);

  const handleComplete = (finalScore: number) => {
    setScore(finalScore);
    setIsCompleted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
      
      {loading && (
        <div className="flex flex-col items-center text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
          <p>正在为您抽取最新剧本...</p>
        </div>
      )}

      {error && (
        <div className="text-center bg-red-50 p-6 rounded-xl border border-red-100 max-w-md">
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button 
            onClick={fetchRandomScript}
            className="flex items-center justify-center mx-auto text-blue-600 hover:text-blue-700 font-medium"
          >
            <RefreshCcw className="w-4 h-4 mr-2" /> 换一题 (Retry)
          </button>
        </div>
      )}

      {!loading && !error && !isStarted && !isCompleted && scriptData && (
        <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-2">
            {scriptData.difficulty_level?.toUpperCase() || 'PRACTICE'}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight max-w-3xl mx-auto">
            {scriptData.title || 'Conversation Practice'}
          </h1>
          <p className="text-xl text-gray-600 max-w-lg mx-auto">
            Get ready to practice your speaking skills. Listen carefully to the teacher and repeat clearly when it's your turn.
          </p>
          <button 
            onClick={() => setIsStarted(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-full shadow-xl transition-transform transform hover:scale-105 text-lg"
          >
            Start Practice
          </button>
        </div>
      )}

      {!loading && !error && isStarted && !isCompleted && scriptData && (
        <div className="w-full h-full flex flex-col justify-center animate-in fade-in zoom-in duration-500">
           <ConversationPractice 
              dialogues={scriptData.dialogues} 
              onComplete={handleComplete} 
           />
        </div>
      )}

      {isCompleted && (
        <div className="text-center space-y-6 animate-in slide-in-from-bottom-8 duration-700">
          <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">🎉</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900">Practice Completed!</h2>
          <p className="text-2xl font-medium text-gray-600">Great job completing this unit.</p>
          
          <div className="flex justify-center space-x-4 mt-8">
            <button 
              onClick={() => {
                setIsCompleted(false);
                setIsStarted(false);
                fetchRandomScript();
              }}
              className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105"
            >
              Practice Again
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
