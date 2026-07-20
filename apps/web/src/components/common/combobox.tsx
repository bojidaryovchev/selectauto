"use client";

import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon } from "@/components/icons";

/**
 * One option in a {@link Combobox}. `value` is the string sent back to the caller
 * (ids are stringified — the caller converts numeric ids itself, mirroring the old
 * native-`<select>` `numOrUndef` pattern). `count`, when present, is appended to the
 * item label as ` (N)`. `disabled` greys the row and blocks selection — used by the
 * catalog facets to disable dead-end (zero-count) combinations.
 */
export type ComboboxOption = {
  value: string;
  label: string;
  count?: number;
  disabled?: boolean;
};

interface ComboboxProps {
  options: ComboboxOption[];
  /**
   * The currently selected value. Must equal the `value` of one of `options`
   * (use `""` to select an explicit "Всички …" option, exactly like the old
   * `<option value="">` reset row). Selecting the already-selected item is a no-op
   * (Base UI never deselects to `null` here), so a required select can't go empty.
   */
  value: string;
  onValueChange: (value: string) => void;
  /** Trigger text shown only when `value` matches no option (rare — required selects always have one). */
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  /**
   * The in-popup search input appears only once the list is longer than this
   * (default 8) — long lists (brands, models, US locations) get typeahead while
   * short lists render as a clean styled dropdown.
   */
  searchThreshold?: number;
  /** Form field name for the internal hidden input (optional). */
  name?: string;
  id?: string;
  /** Extra classes merged onto the trigger button (project convention: string append, caller wins). */
  className?: string;
}

const triggerCls =
  "flex h-11 w-full items-center justify-between gap-2 rounded-[10px] border border-[#ddd] bg-white px-3.5 text-left text-sm font-medium text-ink outline-none transition select-none cursor-pointer focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/15 data-[popup-open]:border-brand data-[popup-open]:ring-2 data-[popup-open]:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-60";

const popupCls =
  "z-99999 max-h-72 w-[var(--anchor-width)] min-w-[10rem] origin-[var(--transform-origin)] overflow-y-auto overscroll-contain rounded-[10px] border border-line bg-white py-1 text-sm shadow-[0_12px_32px_rgba(8,10,14,0.14)] outline-none transition-[opacity,transform] duration-150 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0";

const itemCls =
  "flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2 text-ink outline-none select-none data-[highlighted]:bg-[#f6f6f6] data-[selected]:font-semibold data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40";

/**
 * A styled, optionally-searchable single-select dropdown — the app-wide replacement
 * for native `<select>`. Built on Base UI's Combobox (`@base-ui/react`), portaled to
 * `document.body` at the modal z-layer so it clears the sticky header. Works in
 * string-space; callers keep full control of any "Всички …" reset row and numeric-id
 * conversion, so it drops in wherever a native `<select>` was.
 */
export function Combobox({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder = "Търсене…",
  emptyText = "Няма резултати",
  disabled,
  searchThreshold = 8,
  name,
  id,
  className = "",
}: ComboboxProps) {
  const selected = options.find((o) => o.value === value) ?? null;
  const searchable = options.length > searchThreshold;

  return (
    <BaseCombobox.Root
      items={options}
      value={selected}
      onValueChange={(next: ComboboxOption | null) => {
        // Single-select never toggles to null here; ignore the null edge so a
        // required select can't be emptied. A "Всички …" reset is a real option (value "").
        if (next) onValueChange(next.value);
      }}
      isItemEqualToValue={(a, b) => a?.value === b?.value}
      disabled={disabled}
      name={name}
      autoHighlight
    >
      <BaseCombobox.Trigger id={id} className={`${triggerCls} ${className}`}>
        <span className="min-w-0 flex-1 truncate data-placeholder:text-[#999]">
          <BaseCombobox.Value placeholder={placeholder} />
        </span>
        <BaseCombobox.Icon className="pointer-events-none flex shrink-0 text-[#999] transition-transform duration-150 data-popup-open:rotate-180">
          <ChevronDownIcon className="size-3" />
        </BaseCombobox.Icon>
      </BaseCombobox.Trigger>

      <BaseCombobox.Portal>
        <BaseCombobox.Positioner sideOffset={4} className="z-99999">
          <BaseCombobox.Popup className={popupCls}>
            {searchable ? (
              <div className="border-b border-line p-1.5">
                <BaseCombobox.Input
                  placeholder={searchPlaceholder}
                  className="h-9 w-full rounded-lg border border-[#ddd] bg-white px-3 text-sm font-medium text-ink outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/15"
                />
              </div>
            ) : null}

            {/* Empty must stay mounted (aria-live status region) — Base UI nulls only its
                children when the list has matches. Keep padding on the inner node so the
                container collapses to 0 height instead of reserving a blank gap. */}
            <BaseCombobox.Empty>
              <div className="px-3.5 py-3 text-sm text-muted">{emptyText}</div>
            </BaseCombobox.Empty>

            <BaseCombobox.List>
              {(item: ComboboxOption) => (
                <BaseCombobox.Item key={item.value} value={item} disabled={item.disabled} className={itemCls}>
                  <span className="min-w-0 flex-1 truncate">
                    {item.label}
                    {item.count !== undefined ? ` (${item.count})` : ""}
                  </span>
                  <BaseCombobox.ItemIndicator className="flex shrink-0 text-brand">
                    <CheckIcon className="size-4" />
                  </BaseCombobox.ItemIndicator>
                </BaseCombobox.Item>
              )}
            </BaseCombobox.List>
          </BaseCombobox.Popup>
        </BaseCombobox.Positioner>
      </BaseCombobox.Portal>
    </BaseCombobox.Root>
  );
}
