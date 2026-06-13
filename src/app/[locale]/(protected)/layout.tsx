import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { SidebarProvider } from "@/components/layout/sidebar-context";

interface ProtectedLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function ProtectedLayout({ children, params }: ProtectedLayoutProps) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  return (
    <SidebarProvider>
      <Sidebar />
      <div className="flex min-h-screen flex-col md:pl-64">
        <Header />
        <main className="flex-1 bg-background p-4 md:p-6">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
