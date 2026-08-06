"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        // Floating layers portal to <body>, so they compete with fixed page
        // chrome in the root stacking context. The build timeline sits at
        // z-index 100, which the shadcn default of z-50 loses to. Tooltips rank
        // highest of the three since they can be shown over a dialog.
        "z-[200] overflow-hidden rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/**
 * Convenience wrapper matching Mantine's <Tooltip label="..."> single-child API.
 *
 * Rest props go to the tooltip *content* (`side`, `align`, ...), and this is a
 * plain function component, not a forwardRef. So it must always be the outer
 * wrapper — never the child of an `asChild` parent like `PopoverTrigger` or
 * `DialogTrigger`. Nested the wrong way round, the parent's injected props and
 * ref land on the tooltip content instead of the real trigger, and the control
 * silently stops responding to clicks:
 *
 *     <SimpleTooltip label="..."><PopoverTrigger asChild><button /></PopoverTrigger></SimpleTooltip>  // right
 *     <PopoverTrigger asChild><SimpleTooltip label="..."><button /></SimpleTooltip></PopoverTrigger>  // wrong
 */
function SimpleTooltip({
  label,
  children,
  disabled,
  ...contentProps
}: {
  label: React.ReactNode;
  children: React.ReactElement;
  disabled?: boolean;
} & React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) {
  if (disabled) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent {...contentProps}>{label}</TooltipContent>
    </Tooltip>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, SimpleTooltip };
