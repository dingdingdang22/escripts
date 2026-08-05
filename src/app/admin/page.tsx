'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [formData, setFormData] = useState({
    unitId: '123e4567-e89b-12d3-a456-426614174000', // Mock UUID for MVP
    moduleName: 'Module 1',
    kbUrl: 'https://test.zyddff.top/kb/English/mt_jh_eng_wy_9a01_001.md',
    customSetting: 'At the school gate, friendly tone.',
  });

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      setResult({ error: 'Failed to generate' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">内容管理后台 (Admin Panel)</h1>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">模块名称 (Module)</label>
            <input 
              type="text" 
              className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
              value={formData.moduleName}
              onChange={(e) => setFormData({...formData, moduleName: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">知识点 R2 Markdown 链接 (Knowledge Base URL)</label>
            <input 
              type="text" 
              placeholder="e.g. https://test.zyddff.top/kb/English/mt_jh_eng_wy_9a01_001.md"
              className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
              value={formData.kbUrl}
              onChange={(e) => setFormData({...formData, kbUrl: e.target.value})}
            />
            <p className="text-xs text-gray-500 mt-1">系统会自动读取该 Markdown 文件作为生成剧本的词汇句型依据。</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">自定义情景/角色设定</label>
            <input 
              type="text" 
              className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
              value={formData.customSetting}
              onChange={(e) => setFormData({...formData, customSetting: e.target.value})}
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 className="animate-spin mr-2 h-5 w-5" /> 正在生成脚本与音频 (可能需要几分钟)...</>
          ) : (
            '一键生成对话脚本与TTS音频'
          )}
        </button>

        {result && (
          <div className="mt-6 p-4 bg-gray-50 rounded-md overflow-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-2">执行结果：</h3>
            <pre className="text-sm text-gray-700">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
