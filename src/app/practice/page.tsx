'use client';
import { useState, useEffect } from 'react';
import ConversationPractice from '@/components/ConversationPractice';

// Mock Data for MVP
const MOCK_DIALOGUES = [
  { id: '1', role: 'system' as const, text: 'Hello! Good morning. How are you today?' },
  { id: '2', role: 'user' as const, text: 'Good morning! I am fine, thank you.' },
  { id: '3', role: 'system' as const, text: 'That is great to hear. Are you ready for class?' },
  { id: '4', role: 'user' as const, text: 'Yes, I am ready!' },
];

export default function PracticePage() {
  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [score, setScore] = useState(0);

  const handleComplete = (finalScore: number) => {
    setScore(finalScore);
    setIsCompleted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
      
      {!isStarted && !isCompleted && (
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">
            Unit 1: Greetings
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

      {isStarted && !isCompleted && (
        <div className="w-full h-full flex flex-col justify-center animate-in fade-in zoom-in duration-500">
           <ConversationPractice 
              dialogues={MOCK_DIALOGUES} 
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
              onClick={() => window.location.reload()}
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
