"use client";

import { useBookingStore } from "@/store/bookingStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
  const { step, setStep, reset } = useBookingStore();

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
        {/* Step content */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-md border bg-muted/30 p-4">
                Date picker goes here
              </div>
              <div className="rounded-md border bg-muted/30 p-4">
                Time slots go here
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={reset}>
                Reset
              </Button>
              <Button onClick={() => setStep(2)}>Continue</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="rounded-md border bg-muted/30 p-4">
              Details form goes here
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Continue</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="rounded-md border bg-muted/30 p-4">
              Review + confirm goes here
            </div>

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
                This is the success screen (frontend-only for now).
              </p>
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