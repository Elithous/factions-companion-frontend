"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface NumberInputValue {
  floatValue: number | undefined;
  value: string;
}

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "min" | "max"> {
  value?: number | string;
  onChange?: (value: number) => void;
  /** Mirrors Mantine's onValueChange({ floatValue }) callback. */
  onValueChange?: (value: NumberInputValue) => void;
  min?: number;
  max?: number;
  allowNegative?: boolean;
  decimalScale?: number;
  fixedDecimalScale?: boolean;
  hideControls?: boolean;
  label?: string;
}

/**
 * Minimal NumberInput replacement for Mantine's, used throughout the
 * calculator. Keeps the raw string while typing and only coerces to a
 * number on blur/change so partial input (e.g. "1.") isn't clobbered.
 */
const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      value,
      onChange,
      onValueChange,
      min,
      max,
      allowNegative = true,
      decimalScale,
      fixedDecimalScale,
      hideControls,
      label,
      id,
      ...props
    },
    ref
  ) => {
    const [text, setText] = React.useState(value === undefined || value === null ? "" : String(value));

    React.useEffect(() => {
      const next = value === undefined || value === null ? "" : String(value);
      setText((current) => (Number(current) === Number(next) ? current : next));
    }, [value]);

    const commit = (raw: string) => {
      let num = raw === "" ? undefined : parseFloat(raw);
      if (num !== undefined) {
        if (!allowNegative && num < 0) num = 0;
        if (min !== undefined && num < min) num = min;
        if (max !== undefined && num > max) num = max;
        if (decimalScale !== undefined) num = parseFloat(num.toFixed(decimalScale));
      }
      const display =
        num !== undefined && fixedDecimalScale && decimalScale !== undefined
          ? num.toFixed(decimalScale)
          : num?.toString() ?? "";
      setText(display);
      onChange?.(num ?? 0);
      onValueChange?.({ floatValue: num, value: display });
    };

    const autoId = React.useId();
    const inputId = id ?? (label ? autoId : undefined);

    const input = (
      <Input
        ref={ref}
        id={inputId}
        type="text"
        inputMode="decimal"
        className={cn(hideControls && "[appearance:textfield]", className)}
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "" || raw === "-" || /^-?\d*\.?\d*$/.test(raw)) {
            setText(raw);
          }
        }}
        onBlur={() => commit(text)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(text);
        }}
        {...props}
      />
    );

    if (!label) return input;

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
        {input}
      </div>
    );
  }
);
NumberInput.displayName = "NumberInput";

export { NumberInput };
