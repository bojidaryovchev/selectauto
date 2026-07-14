/** Shared field/card styling for the auth forms — mirrors the carfax form's
 *  inputs so the auth pages feel native to the site. */
export const AUTH_INPUT_CLASS =
  "min-h-[54px] w-full appearance-none rounded-[14px] border border-[#d9dde4] bg-white px-4 text-base font-semibold text-[#17181b] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-[border-color,box-shadow,transform] duration-200 placeholder:font-medium placeholder:text-[#9aa0aa] focus:-translate-y-px focus:border-brand focus:shadow-[0_0_0_4px_rgba(216,111,22,0.12)] focus:outline-none";

export const AUTH_PRIMARY_BTN_CLASS =
  "min-h-[54px] w-full rounded-[14px] border-0 bg-gradient-to-r from-brand-dark to-brand text-base font-extrabold text-white shadow-[0_12px_28px_rgba(216,111,22,0.22)] transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-70";

export const AUTH_SUCCESS_BOX_CLASS =
  "block rounded-[14px] border border-[#bfe2c8] bg-[#eef9f1] px-4 py-3.5 text-sm font-bold leading-[1.6] text-[#1e7a35]";

export const AUTH_ERROR_BOX_CLASS =
  "block rounded-[14px] border border-[#f1c1bb] bg-[#fff3f2] px-4 py-3.5 text-sm font-bold leading-[1.6] text-[#b53b2f]";
