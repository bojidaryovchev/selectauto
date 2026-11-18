import { and, eq, isNull, notInArray, or } from "drizzle-orm";
import { schema } from "@/lib/db";

/**
 * Body types that aren't passenger cars even on a lot whose vehicle type is „automobile": vans, trucks, buses, a
 * hearse, trailers and bikes, plus „other", which can't be told apart. Pickups and every car shape stay.
 */
const NON_PASSENGER_BODIES = [
  "van",
  "truck",
  "furgon",
  "bus",
  "hearse",
  "trailer",
  "industrial",
  "moto",
  "sport_bike",
  "roadster_bike",
  "enduro_bike",
  "bike",
  "other",
];

/**
 * Passenger cars only, for the home rails (owner decision 14, 2 November 2026): the lot is an „automobile" and its
 * body isn't one of the above. An automobile with no body type recorded counts, as the product's own taxonomy does
 * (a 2015 Ford F150 Super Cab arrives that way). No school bus, delivery van, motorcycle or trailer reaches the rails.
 */
export function passengerCarsOnly() {
  const cl = schema.carListings;
  return and(eq(cl.vehicleType, "automobile"), or(isNull(cl.bodyType), notInArray(cl.bodyType, NON_PASSENGER_BODIES)));
}
