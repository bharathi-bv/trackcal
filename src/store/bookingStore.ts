import { create } from "zustand";

export type BookingDetails = {
  name: string;
  email: string;
  phone?: string;
  notes?: string;
};

type BookingState = {
  step: 1 | 2 | 3 | 4; // 4 = success screen
  selectedDate: string | null;
  selectedTime: string | null;
  details: BookingDetails;

  setStep: (step: BookingState["step"]) => void;
  setDate: (iso: string | null) => void;
  setTime: (time: string | null) => void;
  setDetails: (details: BookingDetails) => void;
  reset: () => void;
};

const emptyDetails: BookingDetails = { name: "", email: "", phone: "", notes: "" };

export const useBookingStore = create<BookingState>((set) => ({
  step: 1,
  selectedDate: null,
  selectedTime: null,
  details: emptyDetails,

  setStep: (step) => set({ step }),
  setDate: (iso) => set({ selectedDate: iso, selectedTime: null }),
  setTime: (time) => set({ selectedTime: time }),
  setDetails: (details) => set({ details }),
  reset: () =>
    set({
      step: 1,
      selectedDate: null,
      selectedTime: null,
      details: emptyDetails,
    }),
}));