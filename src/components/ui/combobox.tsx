"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface ComboboxOption {
  value: string;
  /** Shown on the closed trigger, and the default row content. */
  label: string;
  /**
   * Everything the search box should match against. Defaults to `label`, so
   * options with richer rows can stay findable by fields they don't spell out.
   */
  searchText?: string;
  /** Replaces `label` inside the dropdown row only. */
  content?: React.ReactNode;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  loading?: boolean;
  clearable?: boolean;
  /**
   * Label for `value` when it isn't in `options` yet.
   *
   * Options are often fetched, so a value restored from a URL can be set well
   * before its option exists. Without this the trigger falls back to the
   * placeholder and the control looks empty when it isn't.
   */
  valueLabel?: string;
  className?: string;
  triggerClassName?: string;
  id?: string;
}

/**
 * Searchable single-select, replacing Mantine's <Select searchable />.
 * Built from Popover + Command (the standard shadcn/ui combobox pattern).
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled,
  loading,
  clearable = true,
  valueLabel,
  className,
  triggerClassName,
  id,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);
  // A value with no matching option still counts as a selection.
  const selectedLabel = selected?.label ?? (value ? valueLabel : undefined);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal bg-background",
            !selectedLabel && "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="truncate">{selectedLabel ?? placeholder}</span>
          {loading ? (
            // Full opacity on purpose: a loading combobox is usually disabled
            // too, and the button's own disabled:opacity-50 would otherwise
            // compound with a dimmed spinner into something barely visible.
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin" aria-label="Loading" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[--radix-popover-trigger-width] p-0", className)}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {clearable && value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="text-muted-foreground"
                >
                  Clear selection
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  // cmdk filters on this, so it carries the searchable text
                  // rather than the display label. Selection is resolved from
                  // the closure, not from what's passed back here.
                  value={option.searchText ?? option.label}
                  onSelect={() => {
                    onChange(option.value === value ? (clearable ? null : value) : option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="min-w-0 flex-1">{option.content ?? option.label}</div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
