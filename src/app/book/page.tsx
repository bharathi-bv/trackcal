import BookingWizard from "@/components/booking/BookingWizard";

export default function BookPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <BookingWizard />
      </div>
    </main>
  );
}