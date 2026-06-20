const publicEnv = typeof process !== "undefined" ? process.env : {};

export const appConfig = {
  brandName: "FarePing",
  defaultCurrency: "KRW",
  defaultMarket: "kr",
  locale: "ko-KR",
  supportEmail: "support@fareping.app",
  affiliateUrl: publicEnv.EXPO_PUBLIC_FAREPING_AFFILIATE_URL || "https://www.aviasales.com/",
};
