import { create } from "zustand";
import type { UtmParams } from "@/utils/attribution";

export type BookingDetails = {
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  website?: string;
};

type BookingState = {
  step: 1 | 2 | 3 | 4; // 4 = success screen
  selectedDate: string | null;
  selectedTime: string | null;
  details: BookingDetails;
  customAnswers: Record<string, string | string[]>;
  utmParams: UtmParams;

  setStep: (step: BookingState["step"]) => void;
  setDate: (iso: string | null) => void;
  setTime: (time: string | null) => void;
  setDetails: (details: BookingDetails) => void;
  setCustomAnswer: (id: string, value: string | string[]) => void;
  setUtmParams: (params: UtmParams) => void;
  reset: () => void;
};

const emptyDetails: BookingDetails = { name: "", email: "", phone: "", notes: "", website: "" };

export const useBookingStore = create<BookingState>((set) => ({
  step: 1,
  selectedDate: null,
  selectedTime: null,
  details: emptyDetails,
  customAnswers: {},
  utmParams: {},

  setStep: (step) => set({ step }),
  setDate: (iso) => set({ selectedDate: iso, selectedTime: null }),
  setTime: (time) => set({ selectedTime: time }),
  setDetails: (details) => set({ details }),
  setCustomAnswer: (id, value) =>
    set((state) => ({ customAnswers: { ...state.customAnswers, [id]: value } })),
  setUtmParams: (params) => set({ utmParams: params }),
  // reset preserves utmParams — user may book again from same campaign session
  reset: () =>
    set((state) => ({
      step: 1,
      selectedDate: null,
      selectedTime: null,
      details: emptyDetails,
      customAnswers: {},
      utmParams: state.utmParams,
    })),
}));
