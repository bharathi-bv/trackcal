"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useBookingStore } from "@/store/bookingStore";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const schema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

type Values = z.infer<typeof schema>;

export default function DetailsForm() {
  const { details, setDetails } = useBookingStore();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: details.name || "",
      email: details.email || "",
      phone: details.phone || "",
      notes: details.notes || "",
    },
    mode: "onTouched",
  });

  // Auto-save to store on every change — no submit button needed
  const values = form.watch();
  React.useEffect(() => {
    setDetails({
      name: values.name ?? "",
      email: values.email ?? "",
      phone: values.phone,
      notes: values.notes,
    });
  }, [values.name, values.email, values.phone, values.notes]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          Your details
        </h3>
        <p style={{ marginTop: "var(--space-1)", fontSize: 13, color: "var(--text-secondary)" }}>
          This is what we&apos;ll use to confirm the booking.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={(e) => e.preventDefault()}
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <input className="input" placeholder="Your full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <input className="input" type="email" placeholder="you@company.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone (optional)</FormLabel>
                <FormControl>
                  <input className="input" placeholder="+91 9XXXX XXXXX" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl>
                  <textarea
                    className="input textarea"
                    placeholder="Anything we should know before the call?"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
}
