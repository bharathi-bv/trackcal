import SideNav from "@/components/dashboard/SideNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <SideNav />
      <div className="app-content">
        {children}
      </div>
    </div>
  );
}
