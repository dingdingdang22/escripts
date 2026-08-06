import { Routes, Route } from 'react-router-dom';
import Header from '@/components/Header';
import HomePage from '@/pages/HomePage';
import PracticePage from '@/pages/PracticePage';
import AdminPage from '@/pages/AdminPage';

function App() {
  return (
    <div className="min-h-full flex flex-col h-full font-sans antialiased text-gray-900 bg-white">
      <Header />
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
