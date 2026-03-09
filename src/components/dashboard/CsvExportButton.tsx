"use client";

type BookingRow = {
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  parent_page_url: string | null;
  parent_page_slug: string | null;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  fbclid: string | null;
  fbc: string | null;
  fbp: string | null;
  li_fat_id: string | null;
  ttclid: string | null;
  msclkid: string | null;
  ga_linker: string | null;
  status: string;
  created_at: string;
};

export default function CsvExportButton({ bookings }: { bookings: BookingRow[] }) {
  function handleExport() {
    const headers = [
      "Date", "Time", "Name", "Email", "Phone",
      "Source", "Campaign", "Medium",
      "parent_page_url", "parent_page_slug",
      "gclid", "gbraid", "wbraid",
      "fbclid", "fbc", "fbp",
      "li_fat_id", "ttclid", "msclkid", "ga_linker",
      "Status", "Booked At",
    ];

    const rows = bookings.map((b) => [
      b.date,
      b.time,
      b.name,
      b.email,
      b.phone ?? "",
      b.utm_source ?? "",
      b.utm_campaign ?? "",
      b.utm_medium ?? "",
      b.parent_page_url ?? "",
      b.parent_page_slug ?? "",
      b.gclid ?? "",
      b.gbraid ?? "",
      b.wbraid ?? "",
      b.fbclid ?? "",
      b.fbc ?? "",
      b.fbp ?? "",
      b.li_fat_id ?? "",
      b.ttclid ?? "",
      b.msclkid ?? "",
      b.ga_linker ?? "",
      b.status,
      b.created_at,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `citacal-bookings-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button className="tc-btn tc-btn--secondary tc-btn--sm" onClick={handleExport}>
      Export CSV
    </button>
  );
}
