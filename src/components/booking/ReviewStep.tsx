"use client";

import { useBookingStore } from "@/store/bookingStore";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function ReviewStep({
  onEditTime,
  onEditDetails,
}: {
  onEditTime: () => void;
  onEditDetails: () => void;
}) {
  const { selectedDate, selectedTime, details } = useBookingStore();

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold">Review</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirm everything looks right before booking.
        </p>
      </div>

      <div className="rounded-md border p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">Date:</span>{" "}
              <span className="font-medium">{selectedDate || "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Time:</span>{" "}
              <span className="font-medium">{selectedTime || "-"}</span>
            </div>
          </div>
          <Button variant="outline" onClick={onEditTime}>
            Edit
          </Button>
        </div>

        <Separator className="my-4" />

        <div className="flex items-center justify-between">
          <div className="text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">Name:</span>{" "}
              <span className="font-medium">{details.name || "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>{" "}
              <span className="font-medium">{details.email || "-"}</span>
            </div>
            {details.phone ? (
              <div>
                <span className="text-muted-foreground">Phone:</span>{" "}
                <span className="font-medium">{details.phone}</span>
              </div>
            ) : null}
          </div>
          <Button variant="outline" onClick={onEditDetails}>
            Edit
          </Button>
        </div>

        {details.notes ? (
          <>
            <Separator className="my-4" />
            <div className="text-sm">
              <div className="text-muted-foreground">Notes</div>
              <div className="mt-1 whitespace-pre-wrap font-medium">
                {details.notes}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}