"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateTimePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  label?: string;
  placeholder?: string;
  className?: string;
}

function formatDisplay(date: Date | null) {
  if (!date) return "";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Popover date + time picker, replacing Mantine's <DateTimePicker />. */
export function DateTimePicker({
  value,
  onChange,
  minDate,
  maxDate,
  label,
  placeholder = "Pick a date",
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const timeValue = value
    ? `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`
    : "";

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) return;
    const next = new Date(day);
    if (value) {
      next.setHours(value.getHours(), value.getMinutes());
    }
    onChange(next);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = e.target.value.split(":").map(Number);
    const base = value ? new Date(value) : new Date();
    base.setHours(hours || 0, minutes || 0);
    onChange(base);
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && <span className="text-sm font-medium">{label}</span>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start gap-2 bg-background font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 opacity-50" />
            <span className="truncate">{value ? formatDisplay(value) : placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value ?? undefined}
            onSelect={handleDaySelect}
            disabled={(date) => (minDate && date < minDate) || (maxDate && date > maxDate) || false}
            initialFocus
          />
          <div className="border-t border-border p-3">
            <Input type="time" value={timeValue} onChange={handleTimeChange} />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
