'use client';

import { useState, useEffect } from 'react';
import ConversationPractice from '@/components/ConversationPractice';
import { Loader2, RefreshCcw, User, UserCheck, BookOpen, Sparkles, ArrowRight } from 'lucide-react';

export default function PracticePage() {
  // Step state: 1 = Select Module, 2 = Select Role, 3 = Practice, 4 = Complete
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Data states
  const [modules, setModules] = useState<{ name: string; count: number }[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('all');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptData, setScriptData] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<'role_a' | 'role_b'>('role_a');
  
  const [score, setScore] = useState(0);

  // 1. Fetch available modules on mount
  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const res = await fetch('/api/practice/modules');
      const data = await res.json();
      if (data.success) {
        setModules(data.modules || []);
      }
    } catch (e) {
      console.error('Failed to load modules', e);
    }
  };

  // 2. Fetch a random script based on selected module
  const fetchRandomScript = async (moduleName: string) => {
    setSelectedModule(moduleName);
    setLoading(true);
    setError(null);
    try {
      const url = moduleName === 'all' 
        ? '/api/practice/random' 
        : `/api/practice/random?module_name=${encodeURIComponent(moduleName)}`;
        
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        setError(data.error || '未找到合适剧本');
        return;
      }
      
      setScriptData(data.script);
      setStep(2); // Move to Role Selection
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartPractice = (role: 'role_a' | 'role_b') => {
    setSelectedRole(role);
    setStep(3); // Start practice
  };

  const handleComplete = (finalScore: number) => {
    setScore(finalScore);
    setStep(4);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-white flex flex-col items-center justify-center p-4 md:p-8">
      
      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center text-gray-600 bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-xl">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
          <p className="text-lg font-medium">正在抽取所选主题的同伴对话剧本...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="text-center bg-red-50 p-8 rounded-3xl border border-red-100 max-w-md shadow-lg">
          <p className="text-red-600 font-medium mb-6 text-lg">{error}</p>
          <button 
            onClick={() => setStep(1)}
            className="flex items-center justify-center mx-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all"
          >
            <RefreshCcw className="w-4 h-4 mr-2" /> 返回选择其他主题
          </button>
        </div>
      )}

      {/* STEP 1: Select Module */}
      {!loading && !error && step === 1 && (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
              <BookOpen className="w-4 h-4" />
              <span>Step 1 / 2: 选择练习主题</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
              外研版英语·同伴口语对话练习
            </h1>
            <p className="text-lg text-gray-600 max-w-xl mx-auto">
              选择你想练习的课文主题模块，系统将随机分发真实的课文场景剧本
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {/* Random All Option */}
            <div 
              onClick={() => fetchRandomScript('all')}
              className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between min-h-[160px] group"
            >
              <div className="flex justify-between items-start">
                <span className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                  <Sparkles className="w-6 h-6 text-yellow-300" />
                </span>
                <span className="text-xs bg-white/30 px-3 py-1 rounded-full font-bold">全库随机</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">任意主题随机练习</h3>
                <p className="text-blue-100 text-sm flex items-center group-hover:translate-x-1 transition-transform">
                  综合复习所有知识点 <ArrowRight className="w-4 h-4 ml-1" />
                </p>
              </div>
            </div>

            {/* Dynamic Modules List */}
            {modules.map((mod) => (
              <div 
                key={mod.name}
                onClick={() => fetchRandomScript(mod.name)}
                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between min-h-[160px] group"
              >
                <div className="flex justify-between items-start">
                  <span className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <BookOpen className="w-6 h-6" />
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-semibold">
                    {mod.count} 个剧本
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{mod.name}</h3>
                  <p className="text-gray-500 text-sm flex items-center group-hover:text-blue-600 transition-colors">
                    点击开始抽取剧本 <ArrowRight className="w-4 h-4 ml-1" />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Select Role */}
      {!loading && !error && step === 2 && scriptData && (
        <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-green-100 text-green-700 font-semibold text-sm">
              <UserCheck className="w-4 h-4" />
              <span>Step 2 / 2: 选择你的角色</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
              {scriptData.title}
            </h2>
            <p className="text-gray-600">
              选好角色后，AI 伙伴将自动为你朗读另一个角色的台词！
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Role A Card */}
            <div 
              onClick={() => handleStartPractice('role_a')}
              className="bg-white p-8 rounded-3xl border-2 border-blue-200 hover:border-blue-500 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 cursor-pointer text-center space-y-4 group"
            >
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <User className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">扮演 角色 A</h3>
                <p className="text-sm text-gray-500">（由你发音朗读 角色 A，AI 扮演 角色 B）</p>
              </div>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl shadow transition-colors">
                选择 角色 A 开始
              </button>
            </div>

            {/* Role B Card */}
            <div 
              onClick={() => handleStartPractice('role_b')}
              className="bg-white p-8 rounded-3xl border-2 border-purple-200 hover:border-purple-500 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 cursor-pointer text-center space-y-4 group"
            >
              <div className="w-20 h-20 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <User className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">扮演 角色 B</h3>
                <p className="text-sm text-gray-500">（由你发音朗读 角色 B，AI 扮演 角色 A）</p>
              </div>
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-2xl shadow transition-colors">
                选择 角色 B 开始
              </button>
            </div>
          </div>

          <div className="text-center pt-4">
            <button 
              onClick={() => setStep(1)}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium underline"
            >
              ← 返回重选模块
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Practice Interface */}
      {!loading && !error && step === 3 && scriptData && (
        <div className="w-full h-full flex flex-col justify-center animate-in fade-in zoom-in duration-500">
           <ConversationPractice 
              dialogues={scriptData.dialogues}
              userRole={selectedRole}
              onComplete={handleComplete} 
           />
        </div>
      )}

      {/* STEP 4: Completion Screen */}
      {step === 4 && (
        <div className="text-center space-y-6 animate-in slide-in-from-bottom-8 duration-700 bg-white p-10 rounded-3xl shadow-2xl max-w-md">
          <div className="w-28 h-28 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-6xl">🎉</span>
          </div>
          <h2 className="text-3xl font-black text-gray-900">同伴对话练习完成！</h2>
          <p className="text-lg text-gray-600">干得漂亮！你已成功完成了本次课文口语互动。</p>
          
          <div className="flex flex-col space-y-3 pt-6">
            <button 
              onClick={() => handleStartPractice(selectedRole === 'role_a' ? 'role_b' : 'role_a')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105"
            >
              互换角色再次练习 (Role Swap)
            </button>
            <button 
              onClick={() => setStep(1)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3.5 px-8 rounded-full transition-colors"
            >
              返回主题列表
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
