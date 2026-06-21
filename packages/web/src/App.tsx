import { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import { BackgroundProvider } from './hooks/useBackground';
import { AuthProvider, AuthGuard } from './hooks/useAuth';
import Navbar from './components/Navbar';
import BackgroundBubbles from './components/BackgroundBubbles';
import ReadingProgress from './components/ReadingProgress';
import Footer from './components/Footer';
import SearchModal from './components/SearchModal';
import AdminLayout from './components/admin/AdminLayout';
import HomePage from './pages/HomePage';
import ArticlePage from './pages/ArticlePage';
import SearchPage from './pages/SearchPage';
import TagPage from './pages/TagPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/admin/Dashboard';
import ArticleEditor from './pages/admin/ArticleEditor';
import Appearance from './pages/admin/Appearance';
import Stats from './pages/admin/Stats';
import Profile from './pages/admin/Profile';
import Security from './pages/admin/Security';

function PublicLayout() {
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const isArticlePage = location.pathname.startsWith('/article/');

  return (
    <div className="flex flex-col min-h-screen transition-colors duration-400 text-text-primary dark:text-white">
      <BackgroundBubbles />
      {isArticlePage && <ReadingProgress />}
      <Navbar onSearchClick={() => setSearchOpen(true)} />
      <main className="flex-1 relative z-10">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/article/:slug" element={<ArticlePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/tag/:slug" element={<TagPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </main>
      <Footer />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BackgroundProvider>
        <AuthProvider>
          <Routes>
            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <AuthGuard>
                  <AdminLayout />
                </AuthGuard>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="articles/new" element={<ArticleEditor />} />
              <Route path="articles/:id/edit" element={<ArticleEditor />} />
              <Route path="stats" element={<Stats />} />
              <Route path="profile" element={<Profile />} />
              <Route path="security" element={<Security />} />
              <Route path="appearance" element={<Appearance />} />
            </Route>

            {/* Public routes */}
            <Route path="*" element={<PublicLayout />} />
          </Routes>
        </AuthProvider>
      </BackgroundProvider>
    </ThemeProvider>
  );
}
