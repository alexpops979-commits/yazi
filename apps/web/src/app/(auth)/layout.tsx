import { Providers } from '@/components/providers';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="mb-8 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-lg font-bold text-white">D</div>
          <span className="text-xl font-semibold tracking-tight">Yazi</span>
        </div>
        {children}
      </div>
    </Providers>
  );
}
