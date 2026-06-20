import { appConfig } from "../config/appConfig";

export function formatWon(value) {
  return `₩${value.toLocaleString(appConfig.locale)}`;
}

export function routeName(origin, destination) {
  return `${origin.city} → ${destination.city}`;
}

export function createFlightAlert(draft) {
  const route = routeName(draft.origin, draft.destination);
  const targetValue = draft.targetValue || 150000;
  const now = new Date().toISOString();

  return {
    id: `${draft.origin.code}-${draft.destination.code}-${Date.now()}`,
    from: draft.origin.code,
    to: draft.destination.code,
    city: draft.destination.city,
    route,
    price: "확인 대기",
    priceValue: null,
    target: formatWon(targetValue),
    targetValue,
    note: "새 알림 조건 저장됨",
    status: "추적 중",
    date: draft.departureLabel,
    direct: draft.stopCount === 0,
    tripType: draft.tripType,
    cabinBags: draft.cabinBags,
    checkedBags: draft.checkedBags,
    stopCount: draft.stopCount,
    layovers: draft.layovers.slice(0, draft.stopCount),
    createdAt: now,
  };
}

export function validateAlertDraft(draft) {
  if (draft.origin.code === draft.destination.code) {
    return "출발 공항과 도착 공항을 다르게 선택해 주세요.";
  }

  if (!draft.targetValue || draft.targetValue < 10000) {
    return "목표 가격을 다시 확인해 주세요.";
  }

  return "";
}

export function alertToNotification(alert, index = 0) {
  const fresh = index === 0 || alert.status === "가격 하락";

  if (alert.status === "가격 하락") {
    return {
      id: `${alert.id}-drop`,
      type: "drop",
      title: `${alert.city} 항공권이 내려갔어요`,
      subtitle: `${alert.route} · ${alert.price}`,
      fresh,
      target: alert,
    };
  }

  if (alert.status === "도달") {
    return {
      id: `${alert.id}-target`,
      type: "target",
      title: `${alert.city} 목표가 도달`,
      subtitle: `${alert.route} · ${alert.price}`,
      fresh,
      target: alert,
    };
  }

  return {
    id: `${alert.id}-watch`,
    type: "watch",
    title: `${alert.city} 추적 중`,
    subtitle: `${alert.route} · 목표가 ${alert.target}`,
    fresh,
    target: alert,
  };
}

export function getNotificationSummary(notifications) {
  const drops = notifications.filter((item) => item.type === "drop").length;
  const targets = notifications.filter((item) => item.type === "target").length;
  const watching = notifications.filter((item) => item.type === "watch").length;

  return `현재 가격 하락 ${drops}건, 목표가 도달 ${targets}건, 추적 중 ${watching}건을 확인하고 있어요.`;
}

