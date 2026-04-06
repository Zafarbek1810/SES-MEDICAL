"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "./utils";
import { Button } from "./button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export type SearchableSelectOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  /** Bo‘sh qiymat (masalan `__none`, `__all`) — tanlangan bo‘lsa triggerda `clearLabel` ko‘rinadi */
  clearValue?: string;
  clearLabel?: string;
  searchPlaceholder?: string;
  triggerClassName?: string;
  /** Ro‘yxat bo‘sh yoki disabled bo‘lganda */
  emptyHint?: string;
};

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Tanlang",
  disabled = false,
  clearValue,
  clearLabel = "Tanlanmagan",
  searchPlaceholder = "Qidirish…",
  triggerClassName,
  emptyHint = "Hech narsa topilmadi",
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedLabel = React.useMemo(() => {
    if (clearValue != null && value === clearValue) return clearLabel;
    const hit = options.find((o) => o.value === value);
    return hit?.label ?? (value ? value : placeholder);
  }, [value, options, clearValue, clearLabel, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-9 px-3",
            !value && clearValue == null && "text-muted-foreground",
            triggerClassName,
          )}
        >
          <span className="truncate text-left">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] z-[100] p-0"
        align="start"
      >
        <Command shouldFilter>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyHint}</CommandEmpty>
            <CommandGroup>
              {clearValue != null && (
                <CommandItem
                  value={`${clearLabel} ${clearValue}`}
                  onSelect={() => {
                    onValueChange(clearValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value === clearValue ? "opacity-100" : "opacity-0")}
                  />
                  {clearLabel}
                </CommandItem>
              )}
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={`${opt.label} ${opt.value}`}
                  onSelect={() => {
                    onValueChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === opt.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
