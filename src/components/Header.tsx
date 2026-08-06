import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from './LogoutButton';

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    if (roleData?.role === 'admin') {
      isAdmin = true;
    }
  }

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="font-bold text-xl text-blue-600 flex items-center">
              <span className="text-2xl mr-2">📚</span> FLTRP Speaking
            </Link>
            
            <nav className="hidden md:flex space-x-6 text-sm font-medium">
              <Link href="/practice" className="text-gray-600 hover:text-blue-600 transition-colors">
                AI 模拟练习
              </Link>
              {isAdmin && (
                <Link href="/admin" className="text-indigo-600 hover:text-indigo-800 transition-colors flex items-center">
                  <span className="mr-1">⚙️</span> 后台管理
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500 hidden sm:inline-block">
                  {user.email}
                  {isAdmin && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">Admin</span>}
                </span>
                <LogoutButton />
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-blue-700 transition-colors shadow-sm"
              >
                登录 / 注册
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
