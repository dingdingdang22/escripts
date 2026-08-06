'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, PlayCircle, Sparkles, Award, AlertCircle, ArrowRight, Loader2, RefreshCw, CheckCircle2, ChevronDown, ChevronUp, BookOpen, Volume2 } from 'lucide-react';

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

interface SentenceReport {
  sentenceIndex: number;
  role: string;
  text: string;
  evaluation: EvaluationResult;
}

interface ConversationPracticeProps {
  dialogues: DialogueLine[];
  userRole?: string;
  onComplete: (score: number, reports: SentenceReport[]) => void;
}

export default function ConversationPractice({ dialogues, userRole = 'role_a', onComplete }: ConversationPracticeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  
  // Background evaluations mapping: line index -> evaluation
  const [evaluationsMap, setEvaluationsMap] = useState<Record<number, EvaluationResult>>({});
  const [pendingEvalCount, setPendingEvalCount] = useState(0);

  // Practice state
  const [isCompleted, setIsCompleted] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const hasEvaluatedRef = useRef(false);

  const currentLine = dialogues[currentIndex];

  // Determine if it is user's turn
  const isUserTurn = currentLine && (
    currentLine.role === userRole || 
    (userRole === 'user' && currentLine.role === 'user') ||
    (userRole === 'role_a' && currentLine.role === 'system')
  );

  // Web Speech API
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
    if (!isCompleted && currentLine) {
      if (!isUserTurn) {
        playSystemAudio();
      } else {
        startRecording();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustivedeps
  }, [currentIndex, currentLine, isUserTurn, isCompleted]);

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
        setTimeout(() => handleNext(), 800);
      };
    } else {
      setIsPlayingAudio(true);
      setTimeout(() => {
        setIsPlayingAudio(false);
        handleNext();
      }, currentLine.text.length * 50 + 800);
    }
  };

  const startRecording = async () => {
    setRecognizedText('');
    setIsRecording(true);
    hasEvaluatedRef.current = false;

    // 1. Web Speech API
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.log('Recognition already started');
      }
    }

    // 2. MediaRecorder
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

  // Asynchronous Background Evaluation Trigger
  const triggerBackgroundEvaluation = async (lineIdx: number, targetText: string, recordedText: string, audioBlob: Blob | null) => {
    setPendingEvalCount(prev => prev + 1);

    let evalResult: EvaluationResult | null = null;

    if (audioBlob && audioBlob.size > 0) {
      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'speech.webm');
        formData.append('targetText', targetText);

        const res = await fetch('/api/evaluate-speech', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data: any = await res.json();
          if (data.success && data.evaluation) {
            evalResult = data.evaluation;
          }
        }
      } catch (error) {
        console.error('Error calling speech evaluation API:', error);
      }
    }

    // Fallback evaluation if API fails or no audio recorded
    if (!evalResult) {
      const targetWords = targetText.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/).filter(Boolean);
      const spokenWords = recordedText.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/).filter(Boolean);
      
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
        feedback_zh: accuracy >= 80 ? '发音准确流利，表现优秀！' : '注意个别生词的发音细节，继续加油！',
      };
    }

    setEvaluationsMap(prev => ({
      ...prev,
      [lineIdx]: evalResult!
    }));
    setPendingEvalCount(prev => Math.max(0, prev - 1));
  };

  const finishCurrentLineAndAdvance = async () => {
    if (hasEvaluatedRef.current) return;
    hasEvaluatedRef.current = true;

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);

    // Stop MediaRecorder & capture blob
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

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Trigger async background analysis without blocking UI!
    const lineIndexToEval = currentIndex;
    const targetTextToEval = currentLine.text;
    const recordedTextToEval = recognizedText;
    
    triggerBackgroundEvaluation(lineIndexToEval, targetTextToEval, recordedTextToEval, audioBlob);

    // Smoothly advance to the next line
    handleNext();
  };

  // Auto-advance detection (>=85% matched words)
  useEffect(() => {
    if (!isUserTurn || !currentLine || hasEvaluatedRef.current || isCompleted) return;

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
          finishCurrentLineAndAdvance();
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [recognizedText, isUserTurn, currentLine, isCompleted]);

  const handleNext = () => {
    if (currentIndex < dialogues.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsCompleted(true);
    }
  };

  // Compute final summary scores when completed
  const userLines = dialogues.map((d, idx) => ({ line: d, index: idx })).filter(item => {
    return item.line.role === userRole || 
      (userRole === 'user' && item.line.role === 'user') ||
      (userRole === 'role_a' && item.line.role === 'system');
  });

  const completedUserScores = userLines
    .map(item => evaluationsMap[item.index]?.overall_score)
    .filter((s): s is number => typeof s === 'number');

  const finalAvgScore = completedUserScores.length > 0
    ? Math.round(completedUserScores.reduce((a, b) => a + b, 0) / completedUserScores.length)
    : 88;

  const avgAccuracy = userLines
    .map(item => evaluationsMap[item.index]?.accuracy_score)
    .filter((s): s is number => typeof s === 'number');
  const finalAvgAccuracy = avgAccuracy.length > 0
    ? Math.round(avgAccuracy.reduce((a, b) => a + b, 0) / avgAccuracy.length)
    : finalAvgScore;

  const avgFluency = userLines
    .map(item => evaluationsMap[item.index]?.fluency_score)
    .filter((s): s is number => typeof s === 'number');
  const finalAvgFluency = avgFluency.length > 0
    ? Math.round(avgFluency.reduce((a, b) => a + b, 0) / avgFluency.length)
    : finalAvgScore;

  // Render text with word highlighting during practice
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
              className={`inline-block px-2 py-1 rounded-xl transition-all duration-300 ${
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

  // Streaming text animation for System role
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

  // Final Summary Completion View
  if (isCompleted) {
    return (
      <div className="w-full max-w-3xl mx-auto p-6 md:p-8 bg-white rounded-3xl shadow-2xl space-y-8 animate-in fade-in zoom-in duration-500 my-4">
        
        {/* Header Summary Card */}
        <div className="text-center space-y-4 border-b border-gray-100 pb-6">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow">
            <Award className="w-4 h-4" />
            <span>AI 阶段口语练习复盘报告</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
            对话练习圆满完成！🎉
          </h2>

          {/* Scores Badges */}
          <div className="flex items-center justify-center space-x-4 md:space-x-8 pt-2">
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex flex-col items-center min-w-[100px]">
              <span className="text-xs font-semibold text-indigo-600 uppercase">综合得分</span>
              <span className="text-3xl font-black text-indigo-700">{finalAvgScore} <span className="text-sm font-normal">分</span></span>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex flex-col items-center min-w-[100px]">
              <span className="text-xs font-semibold text-emerald-600 uppercase">平均准确度</span>
              <span className="text-3xl font-black text-emerald-700">{finalAvgAccuracy} <span className="text-sm font-normal">分</span></span>
            </div>

            <div className="bg-purple-50 border border-purple-100 p-4 rounded-2xl flex flex-col items-center min-w-[100px]">
              <span className="text-xs font-semibold text-purple-600 uppercase">平均流畅度</span>
              <span className="text-3xl font-black text-purple-700">{finalAvgFluency} <span className="text-sm font-normal">分</span></span>
            </div>
          </div>

          {/* Global AI Mentor Overall Feedback */}
          <div className="bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-purple-50/80 p-5 rounded-2xl border border-indigo-100 text-left flex items-start space-x-3 mt-4">
            <Sparkles className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-indigo-900 text-sm mb-1">AI 语音导师总体总结</h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                {finalAvgScore >= 90
                  ? '太棒了！你的发音极为标准自然，语调起伏非常有韵律感，完美掌握了本课的重点词汇与发音重音！'
                  : finalAvgScore >= 75
                  ? '整体表现非常流畅好学！对于大多数重点句型都能熟练表达，注意部分难点词汇的音素细节会更加完美！'
                  : '很有潜力！建议跟着 AI 伙伴的原声示范多加模仿和练习，相信你的口语表达会越来越流利！'}
              </p>
            </div>
          </div>
        </div>

        {/* Pending async evaluation indicator */}
        {pendingEvalCount > 0 && (
          <div className="flex items-center justify-center space-x-2 text-sm text-indigo-600 bg-indigo-50 py-2 rounded-xl">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>AI 导师正在生成最后 {pendingEvalCount} 句的详细分析报告...</span>
          </div>
        )}

        {/* Sentence-by-Sentence Breakdown List */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
            逐句发音诊断与回顾
          </h3>

          <div className="space-y-3">
            {userLines.map(({ line, index }, i) => {
              const evalRes = evaluationsMap[index];
              const isExpanded = expandedIndex === index || expandedIndex === null;

              return (
                <div 
                  key={line.id || index}
                  className="border border-gray-200 rounded-2xl p-4 transition-all hover:border-blue-300 bg-white shadow-sm"
                >
                  <div 
                    onClick={() => setExpandedIndex(expandedIndex === index ? -1 : index)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-7 h-7 bg-blue-100 text-blue-700 font-bold rounded-full flex items-center justify-center text-xs">
                        {i + 1}
                      </span>
                      <span className="font-bold text-gray-800 text-base md:text-lg">
                        {line.text}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      {evalRes ? (
                        <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
                          evalRes.overall_score >= 85 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {evalRes.overall_score} 分
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 flex items-center">
                          <Loader2 className="w-3 h-3 animate-spin mr-1" /> 分析中
                        </span>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded Breakdown */}
                  {isExpanded && evalRes && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-xs md:text-sm text-gray-600">
                      <p className="text-gray-700 font-medium bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        💡 <span className="font-semibold text-gray-800">发音点评：</span>{evalRes.feedback_zh}
                      </p>

                      {evalRes.mispronounced_words && evalRes.mispronounced_words.length > 0 && (
                        <div className="flex items-center space-x-2 bg-amber-50 p-2 rounded-xl border border-amber-100 text-amber-900">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>需注意生词/发音难点：</span>
                          <div className="flex flex-wrap gap-1">
                            {evalRes.mispronounced_words.map((w, idx) => (
                              <span key={idx} className="font-bold underline decoration-amber-400">
                                {w}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={() => {
              setIsCompleted(false);
              setCurrentIndex(0);
              setEvaluationsMap({});
            }}
            className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3.5 px-8 rounded-full transition-colors flex items-center justify-center text-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> 重新练习本对话
          </button>
          <button 
            onClick={() => onComplete(finalAvgScore, userLines.map(({ line, index }) => ({
              sentenceIndex: index,
              role: line.role,
              text: line.text,
              evaluation: evaluationsMap[index]
            })))}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 px-10 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center text-sm"
          >
            完成练习并返回 <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>

      </div>
    );
  }

  // Active Practice View (Uninterrupted Flow)
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto p-6 bg-white rounded-3xl shadow-xl min-h-[500px] relative overflow-hidden">
      
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

            <div className="flex items-center justify-center space-x-4 mt-6">
              <button 
                onClick={finishCurrentLineAndAdvance}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 px-10 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center text-base"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" /> 朗读完毕，进入下一句 ➔
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

