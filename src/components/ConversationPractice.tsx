'use client';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, CheckCircle2, PlayCircle } from 'lucide-react';

interface DialogueLine {
  id: string;
  role: string;
  text: string;
  audio_url?: string;
}

interface ConversationPracticeProps {
  dialogues: DialogueLine[];
  userRole?: string;
  onComplete: (score: number) => void;
}

export default function ConversationPractice({ dialogues, userRole = 'role_a', onComplete }: ConversationPracticeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  
  // Ref for the system audio player
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const currentLine = dialogues[currentIndex];

  // Determine if it is user's turn
  const isUserTurn = currentLine && (
    currentLine.role === userRole || 
    (userRole === 'user' && currentLine.role === 'user') ||
    (userRole === 'role_a' && currentLine.role === 'system') // backward compatibility
  );

  useEffect(() => {
    // Setup Speech Recognition
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        setRecognizedText(prev => prev + ' ' + finalTranscript + interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    if (currentLine) {
      if (!isUserTurn) {
        playSystemAudio();
      } else {
        startRecording();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustivedeps
  }, [currentIndex, currentLine, isUserTurn]);

  const playSystemAudio = () => {
    if (currentLine.audio_url) {
      if (!audioRef.current) {
        audioRef.current = new Audio(currentLine.audio_url);
      } else {
        audioRef.current.src = currentLine.audio_url;
      }
      setIsPlayingAudio(true);
      audioRef.current.play();
      audioRef.current.onended = () => {
        setIsPlayingAudio(false);
        // Automatically move to the next turn after audio finishes
        setTimeout(() => handleNext(), 1000);
      };
    } else {
      // Simulate reading time if no audio
      setIsPlayingAudio(true);
      setTimeout(() => {
        setIsPlayingAudio(false);
        handleNext();
      }, currentLine.text.length * 50 + 1000);
    }
  };

  const startRecording = () => {
    setRecognizedText('');
    setIsRecording(true);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.log('Recognition already started');
      }
    }
  };

  const [userScores, setUserScores] = useState<number[]>([]);

  const stopRecordingAndEvaluate = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    
    // Evaluate (Simple word matching MVP)
    const targetWords = currentLine.text.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/);
    const spokenWords = recognizedText.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/);
    
    let matchCount = 0;
    targetWords.forEach(tw => {
      if (spokenWords.includes(tw)) matchCount++;
    });
    
    const accuracy = Math.round((matchCount / targetWords.length) * 100);
    setUserScores(prev => [...prev, accuracy]);
    
    handleNext();
  };

  const handleNext = () => {
    if (currentIndex < dialogues.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Calculate overall average score
      const totalScore = userScores.length > 0
        ? Math.round(userScores.reduce((a, b) => a + b, 0) / userScores.length)
        : 100;
      onComplete(totalScore);
    }
  };

  // Logic to highlight correct words cleanly without font overlap
  const renderUserText = (text: string) => {
    const targetWords = text.split(/\s+/);
    const spokenWords = recognizedText.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/);

    return (
      <div className="flex flex-wrap justify-center gap-2 leading-relaxed max-w-2xl mx-auto py-2">
        {targetWords.map((word, idx) => {
          const cleanWord = word.toLowerCase().replace(/[^\w\s]/gi, '');
          const isMatched = spokenWords.includes(cleanWord);
          
          return (
            <span
              key={idx}
              className={`inline-block px-1.5 py-0.5 rounded-lg transition-colors duration-300 ${
                isMatched 
                  ? 'text-emerald-600 bg-emerald-50 font-bold border border-emerald-200 shadow-sm' 
                  : 'text-gray-800 font-medium'
              }`}
            >
              {word}
            </span>
          );
        })}
      </div>
    );
  };

  // Streaming text simulation for System role
  const renderSystemText = (text: string) => {
    const chars = text.split('');
    return chars.map((char, index) => (
      <motion.span
        key={index}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.1, delay: index * 0.05 }}
      >
        {char}
      </motion.span>
    ));
  };

  if (!currentLine) {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto p-8 bg-white rounded-3xl shadow-xl text-center">
        <p className="text-gray-500 font-medium mb-4">该剧本暂无有效对话台词。</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full shadow"
        >
          重新抽取
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto p-6 bg-white rounded-3xl shadow-xl min-h-[500px]">
      
      {/* Progress */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
          style={{ width: `${((currentIndex + 1) / dialogues.length) * 100}%` }}
        ></div>
      </div>

      <div className="flex-1 w-full flex flex-col justify-center items-center text-center space-y-8">
        
        {!isUserTurn ? (
          <div className="animate-fade-in-up">
            <div className="text-sm font-semibold text-blue-500 uppercase tracking-widest mb-4 flex items-center justify-center">
              <PlayCircle className={`w-5 h-5 mr-2 ${isPlayingAudio ? 'animate-pulse text-blue-600' : ''}`} />
              AI Partner ({currentLine.role?.toUpperCase()})
            </div>
            <h2 className="text-4xl font-extrabold text-gray-800 leading-tight">
              {isPlayingAudio ? renderSystemText(currentLine.text) : currentLine.text}
            </h2>
          </div>
        ) : (
          <div className="animate-fade-in-up w-full">
            <div className="text-sm font-semibold text-green-500 uppercase tracking-widest mb-4 flex items-center justify-center">
              {isRecording ? (
                <><Mic className="w-5 h-5 mr-2 animate-pulse text-red-500" /> Your Turn (Recording...)</>
              ) : (
                <><MicOff className="w-5 h-5 mr-2" /> Your Turn</>
              )}
            </div>
            <h2 className="text-4xl font-extrabold leading-tight py-4 px-2 min-h-[120px]">
              {renderUserText(currentLine.text)}
            </h2>
            


            <button 
              onClick={stopRecordingAndEvaluate}
              className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 px-10 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center mx-auto text-base"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" /> 朗读完毕，进入下一句 ➔
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
