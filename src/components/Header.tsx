import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="font-bold text-xl text-blue-600 flex items-center">
              <span className="text-2xl mr-2">📚</span> FLTRP Speaking
            </Link>
            
            <nav className="hidden md:flex space-x-6 text-sm font-medium">
              <Link to="/practice" className="text-gray-600 hover:text-blue-600 transition-colors">
                AI 模拟练习
              </Link>
              <Link to="/admin" className="text-indigo-600 hover:text-indigo-800 transition-colors flex items-center">
                <span className="mr-1">⚙️</span> 后台管理
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
