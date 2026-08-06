'use client';

import { useState, useEffect } from 'react';
import ConversationPractice from '@/components/ConversationPractice';
import { Loader2, RefreshCcw, User, BookOpen, Sparkles, ArrowRight, Layers, GraduationCap } from 'lucide-react';

export default function PracticePage() {
  // Step state: 
  // 1 = Select Grade, 2 = Select AI Module/Theme, 3 = Select AI Character, 4 = Practice, 5 = Complete
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Level data states
  const [grades, setGrades] = useState<{ name: string; count: number }[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('');

  const [modules, setModules] = useState<{ name: string; count: number }[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Randomly fetched script object
  const [scriptData, setScriptData] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<'role_a' | 'role_b'>('role_a');
  
  const [score, setScore] = useState(0);

  // 1. Fetch available grades on mount
  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/practice/levels?type=grades');
      const data = await res.json();
      if (data.success) {
        setGrades(data.grades || []);
      } else {
        setError(data.error || '无法加载年级数据');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch modules for the selected grade
  const handleSelectGrade = async (gradeName: string) => {
    setSelectedGrade(gradeName);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/practice/levels?type=modules&grade=${encodeURIComponent(gradeName)}`);
      const data = await res.json();
      if (data.success) {
        setModules(data.modules || []);
        setStep(2); // Go to Module Selection
      } else {
        setError(data.error || '无法加载主题模块数据');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch a random script under the selected grade & module
  const handleSelectModule = async (moduleName: string) => {
    setSelectedModule(moduleName);
    setLoading(true);
    setError(null);
    try {
      const url = `/api/practice/random?grade_volume=${encodeURIComponent(selectedGrade)}&module_name=${encodeURIComponent(moduleName)}`;
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        setError(data.error || '未找到该主题下的有效剧本');
        return;
      }
      
      setScriptData(data.script);
      setStep(3); // Go to AI Character Choice
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartPractice = (role: 'role_a' | 'role_b') => {
    setSelectedRole(role);
    setStep(4); // Start practice
  };

  const handleComplete = (finalScore: number) => {
    setScore(finalScore);
    setStep(5);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-white flex flex-col items-center justify-center p-4 md:p-8">
      
      {/* Loading indicator */}
      {loading && (
        <div className="flex flex-col items-center text-gray-600 bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-xl">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
          <p className="text-lg font-medium">正在加载课程与剧本数据...</p>
        </div>
      )}

      {/* Error container */}
      {error && !loading && (
        <div className="text-center bg-red-50 p-8 rounded-3xl border border-red-100 max-w-md shadow-lg">
          <p className="text-red-600 font-medium mb-6 text-lg">{error}</p>
          <button 
            onClick={() => setStep(1)}
            className="flex items-center justify-center mx-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all"
          >
            <RefreshCcw className="w-4 h-4 mr-2" /> 返回重选
          </button>
        </div>
      )}

      {/* STEP 1: Select Grade & Volume */}
      {!loading && !error && step === 1 && (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
              <GraduationCap className="w-4 h-4" />
              <span>第一步：选择年级与册别</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
              外研版英语·同步同伴口语练习
            </h1>
            <p className="text-lg text-gray-600 max-w-xl mx-auto">
              选择你当前学习的教材年级，开启沉浸式 AI 同伴对话
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-4">
            {/* All Grades Option */}
            <div 
              onClick={() => handleSelectGrade('all')}
              className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between min-h-[160px] group"
            >
              <div className="flex justify-between items-start">
                <span className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                  <Sparkles className="w-6 h-6 text-yellow-300" />
                </span>
                <span className="text-xs bg-white/30 px-3 py-1 rounded-full font-bold">全库随机</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">任意年级随机练习</h3>
                <p className="text-blue-100 text-sm flex items-center group-hover:translate-x-1 transition-transform">
                  不限年级跨册挑战 <ArrowRight className="w-4 h-4 ml-1" />
                </p>
              </div>
            </div>

            {/* Grade List Cards */}
            {grades.map((g) => (
              <div 
                key={g.name}
                onClick={() => handleSelectGrade(g.name)}
                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between min-h-[160px] group"
              >
                <div className="flex justify-between items-start">
                  <span className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <GraduationCap className="w-6 h-6" />
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">
                    {g.count} 个剧本
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{g.name}</h3>
                  <p className="text-gray-500 text-sm flex items-center group-hover:text-blue-600 transition-colors">
                    进入单元主题 <ArrowRight className="w-4 h-4 ml-1" />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Select AI-Generated Module/Theme */}
      {!loading && !error && step === 2 && (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
              <Layers className="w-4 h-4" />
              <span>第二步：选择课文主题 ({selectedGrade})</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
              请选择【{selectedGrade}】的学习主题
            </h2>
            <p className="text-gray-600">
              选定主题后，系统将为您随机分发该主题下的精编场景对话
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {modules.map((m) => (
              <div 
                key={m.name}
                onClick={() => handleSelectModule(m.name)}
                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer flex justify-between items-center group"
              >
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">AI 主题场景</span>
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{m.name}</h3>
                  <p className="text-xs text-gray-400">包含 {m.count} 个精品朗读对话</p>
                </div>
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-4">
            <button 
              onClick={() => setStep(1)}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium underline"
            >
              ← 返回重选年级
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Select AI-Generated Character */}
      {!loading && !error && step === 3 && scriptData && (
        <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-green-100 text-green-700 font-semibold text-sm">
              <User className="w-4 h-4" />
              <span>第三步：选择你想扮演的角色</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
              {scriptData.title}
            </h2>
            <p className="text-gray-600">
              选中你的角色后，AI 伙伴将自动为你朗读另一个角色的台词！
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Role A Choice Card */}
            <div 
              onClick={() => handleStartPractice('role_a')}
              className="bg-white p-8 rounded-3xl border-2 border-blue-200 hover:border-blue-500 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 cursor-pointer text-center space-y-4 group"
            >
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <User className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  扮演 {scriptData.role_a_name || '角色 A'}
                </h3>
                <p className="text-sm text-gray-500">
                  （由你朗读 {scriptData.role_a_name || '角色 A'}，AI 扮演 {scriptData.role_b_name || '角色 B'}）
                </p>
              </div>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl shadow transition-colors">
                选择 {scriptData.role_a_name || '角色 A'} 开始
              </button>
            </div>

            {/* Role B Choice Card */}
            <div 
              onClick={() => handleStartPractice('role_b')}
              className="bg-white p-8 rounded-3xl border-2 border-purple-200 hover:border-purple-500 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 cursor-pointer text-center space-y-4 group"
            >
              <div className="w-20 h-20 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <User className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  扮演 {scriptData.role_b_name || '角色 B'}
                </h3>
                <p className="text-sm text-gray-500">
                  （由你朗读 {scriptData.role_b_name || '角色 B'}，AI 扮演 {scriptData.role_a_name || '角色 A'}）
                </p>
              </div>
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-2xl shadow transition-colors">
                选择 {scriptData.role_b_name || '角色 B'} 开始
              </button>
            </div>
          </div>

          <div className="text-center pt-4">
            <button 
              onClick={() => setStep(2)}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium underline"
            >
              ← 返回重选主题
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Interactive Practice */}
      {!loading && !error && step === 4 && scriptData && (
        <div className="w-full h-full flex flex-col justify-center animate-in fade-in zoom-in duration-500">
           <ConversationPractice 
              dialogues={scriptData.dialogues}
              userRole={selectedRole}
              onComplete={handleComplete} 
           />
        </div>
      )}

      {/* STEP 5: Completion Screen */}
      {step === 5 && (
        <div className="text-center space-y-6 animate-in slide-in-from-bottom-8 duration-700 bg-white p-10 rounded-3xl shadow-2xl max-w-md">
          <div className="w-28 h-28 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-6xl">🎉</span>
          </div>
          <h2 className="text-3xl font-black text-gray-900">同伴对话练习完成！</h2>
          <div className="bg-blue-50 py-3 px-6 rounded-2xl inline-block border border-blue-100">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider block">综合发音准确度分</span>
            <span className="text-4xl font-extrabold text-blue-700">{score}%</span>
          </div>
          <p className="text-gray-600">干得漂亮！你已成功完成了本次课文口语互动。</p>
          
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
              返回年级列表
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
