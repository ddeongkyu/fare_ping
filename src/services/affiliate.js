import { appConfig } from "../config/appConfig";

export function buildAffiliateUrl(alert) {
  const params = {
    marker: "fareping-app",
    origin: alert.from,
    destination: alert.to,
    currency: appConfig.defaultCurrency.toLowerCase(),
    market: appConfig.defaultMarket,
  };
  const query = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  const separator = appConfig.affiliateUrl.includes("?") ? "&" : "?";

  return `${appConfig.affiliateUrl}${separator}${query}`;
}
