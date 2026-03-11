export default function ConnectCalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Intentionally no SideNav — this is a one-time onboarding step
  return <>{children}</>;
}
