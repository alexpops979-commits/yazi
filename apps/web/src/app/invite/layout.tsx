'use client';

import { Providers } from '@/components/providers';

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
