import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col items-center justify-center p-6 font-sans">
      
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center max-w-3xl"
      >
        <div className="inline-flex items-center justify-center p-4 bg-blue-100 rounded-full mb-8 shadow-inner">
          <Mic className="w-12 h-12 text-blue-600 animate-pulse" />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight mb-6 leading-tight">
          外研版 K12 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">英语口语</span> 练习系统
        </h1>
        
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
          严格对标教材知识点，内置强大的 AI 剧本生成与纯正发音合成，为学生提供实时互动的高反馈口语练习环境。
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link to="/practice">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-200 hover:shadow-2xl transition-all flex items-center"
            >
              <Mic className="w-5 h-5 mr-3" />
              进入学生练习端
            </motion.div>
          </Link>

          <Link to="/admin">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-white text-gray-800 rounded-2xl font-bold text-lg shadow-lg border border-gray-100 hover:shadow-xl transition-all flex items-center"
            >
              <ShieldCheck className="w-5 h-5 mr-3 text-gray-600" />
              进入后台管理
            </motion.div>
          </Link>
        </div>
      </motion.div>

      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-200/30 blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-200/20 blur-3xl"></div>
      </div>
    </div>
  );
}
