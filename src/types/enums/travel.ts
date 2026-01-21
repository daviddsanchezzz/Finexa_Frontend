// src/types/enums/travel.ts

/** =========================================================
 * Trip (high level)
 * ========================================================= */

export enum Continent {
  europe = "europe",
  africa = "africa",
  asia = "asia",
  north_america = "north_america",
  south_america = "south_america",
  oceania = "oceania",
  antarctica = "antarctica",
}

export enum TripStatus {
  wishlist = "wishlist",
  planning = "planning",
  seen = "seen",
}

/** =========================================================
 * Plan Items
 * ========================================================= */

export enum TripPlanItemType {
  // Logistics “grandes”
  flight = "flight",
  accommodation = "accommodation",
  transport_destination = "transport_destination",
  transport_local = "transport_local",

  // Culture & tourism
  museum = "museum",
  monument = "monument",
  viewpoint = "viewpoint",
  free_tour = "free_tour",
  guided_tour = "guided_tour",

  // Leisure / entertainment
  concert = "concert",
  sport = "sport",
  bar_party = "bar_party",
  nightlife = "nightlife",

  // Nature
  beach = "beach",
  hike = "hike",

  // Gastronomy
  restaurant = "restaurant",
  cafe = "cafe",
  market = "market",

  // Shopping
  shopping = "shopping",

  // Excursions / special
  day_trip = "day_trip",

  // Generic
  activity = "activity",
  expense = "expense",
  other = "other",
}

export enum FlightProvider {
  aerodatabox = "aerodatabox",
  manual = "manual",
  other = "other",
}

export enum RoomType {
  single = "single",
  double = "double",
  twin = "twin",
  triple = "triple",
  family = "family",
  suite = "suite",
  apartment = "apartment",
  dorm = "dorm",
}

export enum BathroomType {
  private = "private",
  shared = "shared",
}

export enum DestinationTransportMode {
  train = "train",
  bus = "bus",
  car = "car",
  other = "other",
}

export enum BudgetCategoryType {
  accommodation = "accommodation",
  transport_main = "transport_main",
  transport_local = "transport_local",
  food = "food",
  activities = "activities",
  leisure = "leisure",
  shopping = "shopping",
  other = "other",
}

export enum PaymentStatus {
  pending = "pending",
  paid = "paid",
}

export enum TaskStatus {
  to_do = "to_do",
  done = "done",
}
