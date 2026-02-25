import BookingWizard from "@/components/booking/BookingWizard";

export default function BookPage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(135deg, #dce8f8 0%, #e8eef7 60%, #d8e4f4 100%)" }}
    >
      <BookingWizard />
    </main>
  );
}
