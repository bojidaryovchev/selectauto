import Image from "next/image";
import Link from "next/link";
import type { CarView } from "@/types/car.type";
import { LinkButton } from "@/components/common";

/** A single listing card — ported from the site's `sa-car-card`. */
export function CarCard({ car }: { car: CarView }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[26px] border border-line bg-white shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-1.5 hover:shadow-[0_18px_40px_rgba(216,111,22,0.14)] max-md:rounded-[24px]">
      <div className="relative bg-[#f4f4f4]">
        <Link href={car.href} className="block">
          {car.image ? (
            <Image
              src={car.image}
              alt={car.title}
              width={845}
              height={475}
              className="block aspect-[16/9] w-full object-cover max-md:aspect-[16/10]"
            />
          ) : (
            <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-[#2a2d33] to-[#15171b] text-sm font-semibold uppercase tracking-wider text-white/35 max-md:aspect-[16/10]">
              Снимка при поискване
            </div>
          )}
        </Link>

        {/* Source badge (ENCAR / IAAI) */}
        <span className="absolute left-3.5 top-3.5 z-[2] inline-flex min-h-[34px] items-center justify-center rounded-full bg-[#163b66] px-3.5 text-xs font-black uppercase tracking-[0.05em] text-white">
          {car.source}
        </span>

        {/* Status badge */}
        {car.badge.kind === "buy" ? (
          <span className="absolute right-3.5 top-3.5 z-[2] inline-flex min-h-[34px] items-center justify-center rounded-full bg-gradient-to-r from-brand-dark to-brand px-3.5 text-xs font-black uppercase tracking-[0.05em] text-white">
            BUY NOW
          </span>
        ) : (
          <span className="absolute right-3.5 top-3.5 z-[2] inline-flex min-h-[34px] items-center justify-center rounded-full bg-[#282d34]/[0.92] px-3.5 text-xs font-black tracking-[0.05em] text-white">
            {car.badge.label}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-[22px] text-center max-md:px-3.5 max-md:pb-4 max-md:pt-4">
        <h3 className="mb-3 text-xl font-black uppercase leading-tight text-[#153f6b] max-md:text-lg">
          {car.title}
        </h3>

        {car.price ? (
          <div className="mb-3 text-[22px] font-black leading-tight text-brand max-md:text-2xl">
            {car.price}
          </div>
        ) : null}

        <div className="mb-[18px] grid gap-2 text-base text-muted max-md:text-[15px]">
          {car.mileage && (
            <div>
              <strong className="text-ink">Пробег:</strong> {car.mileage}
            </div>
          )}
          {car.engine && (
            <div>
              <strong className="text-ink">Двигател:</strong> {car.engine}
            </div>
          )}
        </div>

        <LinkButton
          href={car.href}
          rippleTheme="light"
          className="mt-auto inline-flex min-h-[54px] w-full items-center justify-center rounded-full bg-gradient-to-r from-brand-dark to-brand px-6 text-[15px] font-extrabold text-white shadow-[0_12px_28px_rgba(216,111,22,0.22)] transition-transform duration-200 hover:-translate-y-0.5"
        >
          Виж автомобила
        </LinkButton>
      </div>
    </article>
  );
}
