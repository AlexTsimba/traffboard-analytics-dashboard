import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar />
      <div className="pl-64">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
