import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import { BackgroundProvider } from './hooks/useBackground';
import Navbar from './components/Navbar';
import BackgroundBubbles from './components/BackgroundBubbles';
import HomePage from './pages/HomePage';
import ArticlePage from './pages/ArticlePage';
import SearchPage from './pages/SearchPage';
import TagPage from './pages/TagPage';
import LoginPage from './pages/LoginPage';

export default function App() {
  return (
    <ThemeProvider>
      <BackgroundProvider>
        <div className="min-h-screen transition-colors duration-400 bg-[#f8f9fc] dark:bg-black text-text-primary dark:text-white">
          <BackgroundBubbles />
          <Navbar />
          <main className="relative z-10">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/article/:slug" element={<ArticlePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/tag/:slug" element={<TagPage />} />
              <Route path="/login" element={<LoginPage />} />
            </Routes>
          </main>
        </div>
      </BackgroundProvider>
    </ThemeProvider>
  );
}
