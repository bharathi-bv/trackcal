import ManageBookingClient from "@/components/manage/ManageBookingClient";
import { loadManageBookingView } from "@/lib/manage-booking-server";

export default async function ManageBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const booking = await loadManageBookingView(token);

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(135deg, #dce8f8 0%, #e8eef7 60%, #d8e4f4 100%)" }}
    >
      <ManageBookingClient token={token} initialBooking={booking} />
    </main>
  );
}
