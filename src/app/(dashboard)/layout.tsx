import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard/dashboard-nav';
import { Providers } from '@/app/providers';
import { TRPCReactProvider } from '@/trpc/client';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <Providers>
      <TRPCReactProvider>
        <div className="flex min-h-screen flex-col md:flex-row">
          <DashboardNav user={session.user} />
          <main className="flex-1 overflow-auto bg-background p-6">
            {children}
          </main>
        </div>
      </TRPCReactProvider>
    </Providers>
  );
}
