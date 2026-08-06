'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, CheckCircle2, PlayCircle, Sparkles, Award, AlertCircle, ArrowRight, Loader2, RefreshCw } from 'lucide-react';

interface DialogueLine {
  id: string;
  role: string;
  text: string;
  audio_url?: string;
}

interface EvaluationResult {
  overall_score: number;
  accuracy_score: number;
  fluency_score: number;
  mispronounced_words: string[];
  feedback_zh: string;
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
  const [userScores, setUserScores] = useState<number[]>([]);
  
  // AI Speech Evaluation States
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  // Refs for system audio & speech recognition & media recorder
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const currentLine = dialogues[currentIndex];

  // Determine if it is user's turn
  const isUserTurn = currentLine && (
    currentLine.role === userRole || 
    (userRole === 'user' && currentLine.role === 'user') ||
    (userRole === 'role_a' && currentLine.role === 'system') // backward compatibility
  );

  // Setup Web Speech API for real-time visual feedback
  useEffect(() => {
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
    setEvaluation(null);
    setIsEvaluating(false);

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
        setTimeout(() => handleNext(), 1000);
      };
    } else {
      setIsPlayingAudio(true);
      setTimeout(() => {
        setIsPlayingAudio(false);
        handleNext();
      }, currentLine.text.length * 50 + 1000);
    }
  };

  const startRecording = async () => {
    setRecognizedText('');
    setEvaluation(null);
    setIsRecording(true);

    // 1. Start Web Speech Recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.log('Recognition already started');
      }
    }

    // 2. Start MediaRecorder for audio file generation
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
    } catch (err) {
      console.warn('Microphone access for recording failed:', err);
    }
  };

  const hasEvaluatedRef = useRef(false);

  useEffect(() => {
    hasEvaluatedRef.current = false;
  }, [currentIndex]);

  const stopRecordingAndEvaluate = async () => {
    if (hasEvaluatedRef.current) return;
    hasEvaluatedRef.current = true;

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);

    // Stop MediaRecorder & get audio Blob
    let audioBlob: Blob | null = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        if (!mediaRecorderRef.current) return resolve();
        mediaRecorderRef.current.onstop = () => {
          audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          resolve();
        };
        mediaRecorderRef.current.stop();
      });
    }

    // Stop audio stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Call AI Speech Evaluation API
    setIsEvaluating(true);
    let evalResult: EvaluationResult | null = null;

    if (audioBlob && (audioBlob as Blob).size > 0) {
      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'speech.webm');
        formData.append('targetText', currentLine.text);

        const res = await fetch('/api/evaluate-speech', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.evaluation) {
            evalResult = data.evaluation;
          }
        }
      } catch (error) {
        console.error('Error calling speech evaluation API:', error);
      }
    }

    // Fallback if API fails or no audio recorded
    if (!evalResult) {
      const targetWords = currentLine.text.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/).filter(Boolean);
      const spokenWords = recognizedText.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/).filter(Boolean);
      
      let matchCount = 0;
      targetWords.forEach(tw => {
        if (spokenWords.includes(tw)) matchCount++;
      });
      
      const accuracy = targetWords.length > 0 ? Math.round((matchCount / targetWords.length) * 100) : 85;
      evalResult = {
        overall_score: accuracy,
        accuracy_score: accuracy,
        fluency_score: Math.min(100, accuracy + 5),
        mispronounced_words: targetWords.filter(tw => !spokenWords.includes(tw)),
        feedback_zh: accuracy >= 80 ? '朗读清晰稳定，请继续保持！' : '注意到部分单词略有不熟练，多多跟读练习会更棒！',
      };
    }

    setIsEvaluating(false);
    setEvaluation(evalResult);
    setUserScores(prev => [...prev, evalResult!.overall_score]);
  };

  // Auto-advance detection: when user matches >= 85% of sentence words, trigger evaluation
  useEffect(() => {
    if (!isUserTurn || !currentLine || hasEvaluatedRef.current || isEvaluating || evaluation) return;

    const targetWords = currentLine.text.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/).filter(Boolean);
    const spokenWords = recognizedText.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/).filter(Boolean);

    if (targetWords.length === 0) return;

    let matchCount = 0;
    targetWords.forEach(tw => {
      if (spokenWords.includes(tw)) matchCount++;
    });

    const matchRatio = matchCount / targetWords.length;

    if (matchRatio >= 0.85) {
      const timer = setTimeout(() => {
        if (!hasEvaluatedRef.current) {
          stopRecordingAndEvaluate();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [recognizedText, isUserTurn, currentLine, isEvaluating, evaluation]);

  const handleNext = () => {
    if (currentIndex < dialogues.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const totalScore = userScores.length > 0
        ? Math.round(userScores.reduce((a, b) => a + b, 0) / userScores.length)
        : 100;
      onComplete(totalScore);
    }
  };

  // Render text with word highlighting
  const renderUserText = (text: string) => {
    const targetWords = text.split(/\s+/);
    const spokenWords = recognizedText.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/);
    const mispronounced = evaluation?.mispronounced_words.map(w => w.toLowerCase()) || [];

    return (
      <div className="flex flex-wrap justify-center gap-2 leading-relaxed max-w-2xl mx-auto py-2">
        {targetWords.map((word, idx) => {
          const cleanWord = word.toLowerCase().replace(/[^\w\s]/gi, '');
          const isMatched = spokenWords.includes(cleanWord);
          const isMispronounced = mispronounced.includes(cleanWord);
          
          let colorStyle = 'text-gray-800 font-medium';
          if (evaluation && isMispronounced) {
            colorStyle = 'text-amber-700 bg-amber-100 font-bold border border-amber-300 shadow-sm';
          } else if (isMatched) {
            colorStyle = 'text-emerald-600 bg-emerald-50 font-bold border border-emerald-200 shadow-sm';
          }

          return (
            <span
              key={idx}
              className={`inline-block px-2 py-1 rounded-xl transition-all duration-300 ${colorStyle}`}
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
        transition={{ duration: 0.08, delay: index * 0.04 }}
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
    <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto p-6 bg-white rounded-3xl shadow-xl min-h-[520px] relative overflow-hidden">
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-100 rounded-full h-2.5 mb-8">
        <div 
          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-500 shadow-sm" 
          style={{ width: `${((currentIndex + 1) / dialogues.length) * 100}%` }}
        ></div>
      </div>

      <div className="flex-1 w-full flex flex-col justify-center items-center text-center space-y-6">
        
        {!isUserTurn ? (
          <div className="animate-fade-in-up">
            <div className="text-sm font-semibold text-blue-500 uppercase tracking-widest mb-4 flex items-center justify-center">
              <PlayCircle className={`w-5 h-5 mr-2 ${isPlayingAudio ? 'animate-pulse text-blue-600' : ''}`} />
              AI Partner ({currentLine.role?.toUpperCase()})
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 leading-relaxed px-4">
              {isPlayingAudio ? renderSystemText(currentLine.text) : currentLine.text}
            </h2>
          </div>
        ) : (
          <div className="animate-fade-in-up w-full">
            <div className="text-sm font-semibold text-emerald-500 uppercase tracking-widest mb-2 flex items-center justify-center">
              {isRecording ? (
                <><Mic className="w-5 h-5 mr-2 animate-pulse text-red-500" /> Your Turn (Recording...)</>
              ) : (
                <><MicOff className="w-5 h-5 mr-2 text-gray-400" /> Your Turn</>
              )}
            </div>

            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight py-4 px-2 min-h-[120px]">
              {renderUserText(currentLine.text)}
            </h2>

            {/* AI Evaluating Loading Animation */}
            {isEvaluating && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center space-x-3 my-4 py-3 px-6 bg-indigo-50 text-indigo-700 rounded-2xl shadow-inner border border-indigo-100 max-w-md mx-auto"
              >
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span className="font-semibold text-sm">AI 语音导师正在仔细聆听评估中...</span>
              </motion.div>
            )}

            {/* AI Speech Evaluation Card Result */}
            <AnimatePresence>
              {evaluation && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mt-4 p-5 bg-gradient-to-br from-indigo-50/90 via-purple-50/80 to-blue-50/90 rounded-2xl border border-indigo-100 shadow-md max-w-xl mx-auto text-left"
                >
                  <div className="flex items-center justify-between border-b border-indigo-100/80 pb-3 mb-3">
                    <div className="flex items-center space-x-2 text-indigo-900 font-bold text-base">
                      <Sparkles className="w-5 h-5 text-amber-500 animate-bounce" />
                      <span>AI 发音点评指导</span>
                    </div>

                    {/* Scores Badge */}
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 uppercase font-semibold">准确度</span>
                        <span className="text-xs font-bold text-indigo-600">{evaluation.accuracy_score}分</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 uppercase font-semibold">流畅度</span>
                        <span className="text-xs font-bold text-purple-600">{evaluation.fluency_score}分</span>
                      </div>
                      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold px-3 py-1 rounded-xl shadow-sm flex items-center text-sm">
                        <Award className="w-4 h-4 mr-1" />
                        {evaluation.overall_score} 分
                      </div>
                    </div>
                  </div>

                  {/* Feedback Message */}
                  <p className="text-sm text-gray-700 leading-relaxed mb-3">
                    {evaluation.feedback_zh}
                  </p>

                  {/* Mispronounced Words Alert if any */}
                  {evaluation.mispronounced_words && evaluation.mispronounced_words.length > 0 && (
                    <div className="flex items-center space-x-2 bg-amber-50/90 p-2.5 rounded-xl border border-amber-200/60 text-xs text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>发音偏差或难点词：</span>
                      <div className="flex flex-wrap gap-1">
                        {evaluation.mispronounced_words.map((w, idx) => (
                          <span key={idx} className="font-bold underline decoration-amber-400">
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex items-center justify-center space-x-4 mt-6">
              {!evaluation ? (
                <button 
                  onClick={stopRecordingAndEvaluate}
                  disabled={isEvaluating}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 px-8 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center text-base"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" /> 朗读完毕，获取 AI 点评 ➔
                </button>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setEvaluation(null);
                      startRecording();
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-full shadow-sm transition-all flex items-center text-sm"
                  >
                    <RefreshCw className="w-4 h-4 mr-1.5" /> 重新朗读
                  </button>
                  <button 
                    onClick={handleNext}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center text-sm"
                  >
                    进入下一句 <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

