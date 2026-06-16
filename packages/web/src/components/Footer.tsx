export default function Footer() {
  return (
    <footer className="relative z-10 text-center py-8 text-xs text-gray-400 dark:text-gray-600">
      <p>© {new Date().getFullYear()} BubbleBlog · Powered by Bun + React</p>
    </footer>
  );
}
