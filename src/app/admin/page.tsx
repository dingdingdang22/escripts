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
    kbUrls: [] as string[],
    customSetting: 'At the school gate, friendly tone.',
  });

  useEffect(() => {
    async function loadFiles() {
      try {
        const res = await fetch('/api/kb-files');
        const data = await res.json();
        if (data.success) {
          if (data.files.length > 0) {
            setKbFiles(data.files);
            const first = data.files[0];
            const autoModule = `${first.gradeVolumeName || ''} · ${first.moduleName || ''}`;
            setFormData(prev => ({ 
              ...prev, 
              kbUrls: [first.url],
              moduleName: autoModule
            }));
          }
        } else {
          console.error('API Error:', data.error);
          setResult({ error: `R2 文件加载失败: ${data.error}` });
        }
      } catch (e: any) {
        console.error('Failed to load kb files', e);
        setResult({ error: `网络请求失败: ${e.message}` });
      } finally {
        setFetchingFiles(false);
      }
    }
    loadFiles();
  }, []);

  const handleFileToggle = (url: string) => {
    setFormData(prev => {
      const exists = prev.kbUrls.includes(url);
      const newUrls = exists 
        ? prev.kbUrls.filter(u => u !== url)
        : [...prev.kbUrls, url];
      
      // Find the first selected file to auto-update module name
      let autoModule = prev.moduleName;
      if (newUrls.length > 0) {
        const selectedFile = kbFiles.find(f => f.url === newUrls[0]);
        if (selectedFile) {
          autoModule = `${selectedFile.gradeVolumeName || ''} · ${selectedFile.moduleName || ''}`;
        }
      }

      return {
        ...prev,
        kbUrls: newUrls,
        moduleName: autoModule
      };
    });
  };

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
            <label className="block text-sm font-medium text-gray-700 mb-1">选择知识点主题 (Select Knowledge Base) [可多选]</label>
            {fetchingFiles ? (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Loader2 className="animate-spin h-4 w-4" /> <span>加载云端知识点...</span>
              </div>
            ) : (
              <div className="w-full border-gray-300 rounded-md shadow-sm border p-2 max-h-60 overflow-y-auto bg-white">
                {kbFiles.length === 0 && <p className="text-sm text-gray-500 p-2">未找到任何 .md 文件</p>}
                {kbFiles.map((f, i) => {
                  const isChecked = formData.kbUrls.includes(f.url);
                  return (
                    <label key={i} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors border-b border-gray-100 last:border-0">
                      <input 
                        type="checkbox"
                        className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        checked={isChecked}
                        onChange={() => handleFileToggle(f.url)}
                      />
                      <span className="text-sm text-gray-800 break-all">{f.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">勾选一个或多个 Markdown 文件，AI 将综合这些知识点生成剧情。</p>
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
