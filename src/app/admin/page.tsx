'use client';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [fetchingFiles, setFetchingFiles] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [kbFiles, setKbFiles] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    unitId: '123e4567-e89b-12d3-a456-426614174000', // Mock UUID for MVP
    moduleName: 'Module 1',
    kbUrl: '',
    customSetting: 'At the school gate, friendly tone.',
  });

  useEffect(() => {
    async function loadFiles() {
      try {
        const res = await fetch('/api/kb-files');
        const data = await res.json();
        if (data.success && data.files.length > 0) {
          setKbFiles(data.files);
          setFormData(prev => ({ ...prev, kbUrl: data.files[0].url }));
        }
      } catch (e) {
        console.error('Failed to load kb files', e);
      } finally {
        setFetchingFiles(false);
      }
    }
    loadFiles();
  }, []);

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
            <label className="block text-sm font-medium text-gray-700 mb-1">选择知识点主题 (Select Knowledge Base)</label>
            {fetchingFiles ? (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Loader2 className="animate-spin h-4 w-4" /> <span>加载云端知识点...</span>
              </div>
            ) : (
              <select 
                className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                value={formData.kbUrl}
                onChange={(e) => {
                  const selectedFile = kbFiles.find(f => f.url === e.target.value);
                  setFormData({
                    ...formData, 
                    kbUrl: e.target.value,
                    // Auto-fill module name based on selected file label
                    moduleName: selectedFile ? selectedFile.label : formData.moduleName
                  });
                }}
              >
                {kbFiles.length === 0 && <option value="">未找到任何文件</option>}
                {kbFiles.map((f, i) => (
                  <option key={i} value={f.url}>{f.label} ({f.filename})</option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-500 mt-1">下拉菜单自动读取 R2 存储桶中的 `kb/English/` 目录。</p>
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
