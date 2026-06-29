import React from "react";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
}

/**
 * Animated hamburger ↔ close button for the mobile drawer toggle. The three
 * bars slide out and a rotated cross fades in when `active`. Rendered on the
 * dark mobile shell, so the bars are white.
 */
const NavHamburger = React.forwardRef<HTMLButtonElement, Props>(({ active, className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      className={`group relative cursor-pointer rounded-[0.625rem] ${className ?? ""}`}
      {...props}
    >
      <div
        className={`relative flex h-10 w-10 transform cursor-pointer items-center justify-center overflow-hidden rounded-[0.375rem] transition-all duration-200 ${
          active ? "bg-white/[0.14]" : "bg-white/[0.08]"
        }`}
      >
        <div className="flex h-3.5 w-5 origin-center transform flex-col justify-between overflow-hidden transition-all duration-300">
          <div
            className={`h-0.5 w-5 origin-left transform rounded bg-white transition-all duration-300 ${
              active ? "translate-x-10" : ""
            }`}
          ></div>

          <div
            className={`h-0.5 w-5 transform rounded bg-white transition-all delay-75 duration-300 ${
              active ? "translate-x-10" : ""
            }`}
          ></div>

          <div
            className={`h-0.5 w-5 origin-left transform rounded bg-white transition-all delay-150 duration-300 ${
              active ? "translate-x-10" : ""
            }`}
          ></div>

          <div
            className={`absolute inset-0 flex transform items-center justify-center transition-all duration-500 ${
              active ? "translate-x-0" : "-translate-x-10"
            }`}
          >
            <div
              className={`absolute h-0.5 w-4.5 transform rounded bg-white transition-all delay-300 duration-500 ${
                active ? "rotate-45" : "rotate-0"
              }`}
            ></div>

            <div
              className={`absolute h-0.5 w-4.5 transform rounded bg-white transition-all delay-300 duration-500 ${
                active ? "-rotate-45" : "rotate-0"
              }`}
            ></div>
          </div>
        </div>
      </div>
    </button>
  );
});

NavHamburger.displayName = "NavHamburger";

export { NavHamburger };
