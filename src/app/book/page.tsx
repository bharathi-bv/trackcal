import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import DatePicker from "@/components/booking/DatePicker";

export default function BookPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
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

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Step 1</span>
              <span>•</span>
              <span>Choose slot</span>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="p-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-md border bg-muted/30 p-4">
                <DatePicker />
              </div>
              <div className="rounded-md border bg-muted/30 p-4">
                Time slots go here
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}