'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="text-gray-500 hover:text-red-600 transition-colors flex items-center text-sm font-medium"
      title="退出登录"
    >
      <LogOut className="w-4 h-4 sm:mr-1" />
      <span className="hidden sm:inline-block">退出</span>
    </button>
  );
}
