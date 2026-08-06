import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LoginForm from './LoginForm';

export default async function LoginPage(props: { searchParams: Promise<{ next?: string }> }) {
  const supabase = await createClient();
  const searchParams = await props.searchParams;
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(searchParams?.next || '/practice');
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-50 via-blue-50 to-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <span className="inline-block p-4 bg-blue-100 rounded-full mb-4">
            <span className="text-4xl">📚</span>
          </span>
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
          登录 FLTRP Speaking
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          开启您的 AI 英语口语同伴练习
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10 border border-gray-100">
          <LoginForm nextUrl={searchParams?.next || '/practice'} />
        </div>
      </div>
    </div>
  );
}
