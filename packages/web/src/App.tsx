import { useState, lazy, Suspense } from 'react';
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

const HomePage = lazy(() => import('./pages/HomePage'));
const ArticlePage = lazy(() => import('./pages/ArticlePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const TagPage = lazy(() => import('./pages/TagPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const ArticleEditor = lazy(() => import('./pages/admin/ArticleEditor'));
const Appearance = lazy(() => import('./pages/admin/Appearance'));
const Stats = lazy(() => import('./pages/admin/Stats'));
const Profile = lazy(() => import('./pages/admin/Profile'));
const Security = lazy(() => import('./pages/admin/Security'));

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

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BackgroundProvider>
        <AuthProvider>
          <Suspense fallback={<LoadingFallback />}>
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
          </Suspense>
        </AuthProvider>
      </BackgroundProvider>
    </ThemeProvider>
  );
}
