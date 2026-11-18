"use client";

import type { ReactNode } from "react";
import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "@/components/icons";
import { MakePlate } from "./make-plate";

/**
 * One option in a {@link Combobox}. `value` is the string sent back to the caller
 * (ids are stringified — the caller converts numeric ids itself, mirroring the old
 * native-`<select>` `numOrUndef` pattern). `count`, when present, is shown with the
 * item, right-aligned and grouped as bg-BG writes it. `disabled` greys the row and blocks selection — used by
 * the catalog facets to disable dead-end (zero-count) combinations. `logo` is a make's
 * logo, for its plate when the combobox shows `plates`.
 */
export type ComboboxOption = {
  value: string;
  label: string;
  count?: number;
  disabled?: boolean;
  logo?: string | null;
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
  /**
   * The field's name for assistive tech — pass the visible label's text. The
   * trigger is a `role="combobox"` button, and a combobox does not take its name
   * from its content: that content is the current VALUE ("Всички марки"), so
   * without this a screen reader announces an unnamed control. It also names the list.
   */
  "aria-label"?: string;
  /** Extra classes merged onto the trigger button (project convention: string append, caller wins). */
  className?: string;
  /** Each option but the „Всички …" row (`value: ""`) shows its make plate, and so does the field. */
  plates?: boolean;
  /** An icon at the field's start (the calculator's map pin, board `im-dialog`). */
  icon?: ReactNode;
}

/**
 * A styled, optionally-searchable single-select dropdown — the app-wide replacement
 * for native `<select>`. Built on Base UI's Combobox (`@base-ui/react`), portaled to
 * `document.body` at the modal z-layer so it clears the sticky header. Works in
 * string-space; callers keep full control of any "Всички …" reset row and numeric-id
 * conversion, so it drops in wherever a native `<select>` was.
 *
 * The „Нощно шосе" look: the boards' `sa-combo` field and `sa-pop` list (board `ct-dd-*`). The list opens under the
 * field, aligned to its start and at least 300 px wide, and above the field when there's no room below (Base UI flips
 * it); the chosen row is orange with a tick.
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
  "aria-label": ariaLabel,
  className = "",
  plates = false,
  icon,
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
      itemToStringLabel={(item) => item?.label ?? ""}
      // Without a search box there is NO query to filter by, yet Base UI fills its
      // internal input with the selected item's label when one is picked
      // (`fillInputOnItemPress`, which applies only while the input is not inside
      // the popup). Reopening then filtered the list against that label and hid
      // every other option until the empty row was chosen again. `null` turns
      // filtering off, which is what a plain dropdown wants. The searchable variant
      // keeps the default filter and is unaffected: its input sits INSIDE the popup,
      // so Base UI leaves it empty and the full list shows until the user types.
      filter={searchable ? undefined : null}
      disabled={disabled}
      name={name}
      autoHighlight
    >
      <BaseCombobox.Trigger id={id} aria-label={ariaLabel} className={`sa-combo ${className}`}>
        {/* In an <i>, not a bare svg or a span: the kit turns the field's direct svg children (the chevron) when
            the list opens and stretches its spans. */}
        {icon ? (
          <i aria-hidden="true" className="flex flex-none text-tx2 not-italic [&>svg]:size-5">
            {icon}
          </i>
        ) : null}
        <BaseCombobox.Value>
          {(current: ComboboxOption | null) => (
            <>
              {plates && current && current.value !== "" ? (
                <MakePlate name={current.label} logo={current.logo ?? null} size="xs" />
              ) : null}
              <span>{current?.label ?? placeholder}</span>
            </>
          )}
        </BaseCombobox.Value>
        <ChevronDownIcon />
      </BaseCombobox.Trigger>

      <BaseCombobox.Portal>
        <BaseCombobox.Positioner sideOffset={6} align="start" className="z-99999">
          <BaseCombobox.Popup className="sa-pop max-h-(--available-height) w-[max(var(--anchor-width),300px)] max-w-(--available-width) outline-none">
            {searchable ? (
              <span className="sa-inw">
                <SearchIcon />
                <BaseCombobox.Input placeholder={searchPlaceholder} className="sa-in sa-in--sm" />
              </span>
            ) : null}

            {/* Empty must stay mounted (an aria-live status region): Base UI renders its children only while
                nothing matches, so the padding lives on the inner node. */}
            <BaseCombobox.Empty>
              <div className="sa-pop__empty">{emptyText}</div>
            </BaseCombobox.Empty>

            <BaseCombobox.List
              aria-label={ariaLabel}
              className="sa-pop__list min-h-0 overscroll-contain empty:hidden"
            >
              {(item: ComboboxOption) => (
                <BaseCombobox.Item key={item.value} value={item} disabled={item.disabled} className="sa-opt">
                  {plates && item.value !== "" ? (
                    <MakePlate name={item.label} logo={item.logo ?? null} />
                  ) : null}
                  <span>{item.label}</span>
                  {item.count !== undefined ? <small>{item.count.toLocaleString("bg-BG")}</small> : null}
                  <BaseCombobox.ItemIndicator className="flex flex-none [&_svg]:size-4.5">
                    <CheckIcon />
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
