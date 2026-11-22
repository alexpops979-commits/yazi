export default function RootPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <meta httpEquiv="refresh" content="0;url=/projects" />
      <a href="/projects" className="text-sm text-brand-600 hover:underline">
        Перейти в панель управления
      </a>
    </main>
  );
}
