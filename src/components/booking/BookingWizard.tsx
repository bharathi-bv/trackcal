"use client";

import { useBookingStore } from "@/store/bookingStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import DatePicker from "@/components/booking/DatePicker";
import TimeSlotSelector from "@/components/booking/TimeSlotSelector";
import DetailsForm from "@/components/booking/DetailsForm";
import ReviewStep from "@/components/booking/ReviewStep";

function StepLabel({ step }: { step: number }) {
  const labels = {
    1: "Select time",
    2: "Your details",
    3: "Review",
    4: "Confirmed",
  } as const;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">Step {step}</span>
      <span>•</span>
      <span>{labels[step as 1 | 2 | 3 | 4]}</span>
    </div>
  );
}

export default function BookingWizard() {
  const {
    step,
    setStep,
    reset,
    selectedDate,
    selectedTime,
    details,
  } = useBookingStore();

  const canContinueFromStep1 = Boolean(selectedDate && selectedTime);
  const canContinueFromStep2 = Boolean(details.name && details.email);

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-2xl tracking-tight">
              Schedule a meeting
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a date & time, then enter details.
            </p>
          </div>
          <Badge variant="secondary">TrackCal</Badge>
        </div>

        <StepLabel step={step} />
      </CardHeader>

      <Separator />

      <CardContent className="p-6">
        {step === 1 && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-md border bg-muted/30 p-4">
                <DatePicker />
              </div>
              <div className="rounded-md border bg-muted/30 p-4">
                <TimeSlotSelector />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={reset}>
                Reset
              </Button>
              <Button onClick={() => setStep(2)} disabled={!canContinueFromStep1}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="rounded-md border bg-muted/30 p-4">
              <DetailsForm />
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canContinueFromStep2}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <ReviewStep
              onEditTime={() => setStep(1)}
              onEditDetails={() => setStep(2)}
            />

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={() => setStep(4)}>Confirm</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="rounded-md border bg-muted/30 p-6">
              <h3 className="text-lg font-semibold">You’re booked ✅</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Frontend-only confirmation screen (we’ll hook this to Google Calendar later).
              </p>

              <div className="mt-4 text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  <span className="font-medium">{selectedDate}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Time:</span>{" "}
                  <span className="font-medium">{selectedTime}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  <span className="font-medium">{details.email}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Button onClick={reset}>Book another</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}