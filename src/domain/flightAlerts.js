import { appConfig } from "../config/appConfig";

export const CABIN_LABELS = {
  economy: "이코노미",
  premium_economy: "프리미엄",
  business: "비즈니스",
  first: "퍼스트",
};

export function formatWon(value) {
  if (typeof value !== "number") return "확인 대기";
  return `₩${value.toLocaleString(appConfig.locale)}`;
}

export function routeName(origin, destination) {
  return `${origin.city} → ${destination.city}`;
}

export function parsePriceInput(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

export function formatPriceInput(value) {
  const parsed = parsePriceInput(value);
  return parsed ? parsed.toLocaleString(appConfig.locale) : "";
}

export function formatDateRange(from, to) {
  if (!from || !to) return "";

  const fromDate = new Date(`${from}T00:00:00+09:00`);
  const toDate = new Date(`${to}T00:00:00+09:00`);
  const fromLabel = `${fromDate.getMonth() + 1}월 ${fromDate.getDate()}일`;
  const toLabel = `${toDate.getMonth() + 1}월 ${toDate.getDate()}일`;

  return from === to ? fromLabel : `${fromLabel} - ${toLabel}`;
}

function isValidIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function getPassengerSummary(alert) {
  const adults = alert.adultCount || 1;
  const children = alert.childCount || 0;
  const infants = alert.infantCount || 0;
  const parts = [`성인 ${adults}`];

  if (children) parts.push(`소아 ${children}`);
  if (infants) parts.push(`유아 ${infants}`);

  return parts.join(" · ");
}

export function getConditionSummary(alert) {
  const stopLabel = alert.stopCount === 0 ? "직항" : `경유 ${alert.stopCount}회까지`;
  const cabinLabel = CABIN_LABELS[alert.cabinClass] || "이코노미";

  return `${stopLabel} · ${cabinLabel} · ${getPassengerSummary(alert)}`;
}

export function createFlightAlert(draft) {
  const route = routeName(draft.origin, draft.destination);
  const targetValue = draft.targetValue || 150000;
  const now = new Date().toISOString();

  return {
    id: draft.id || `${draft.origin.code}-${draft.destination.code}-${Date.now()}`,
    persisted: Boolean(draft.persisted),
    from: draft.origin.code,
    to: draft.destination.code,
    city: draft.destination.city,
    route,
    price: "확인 대기",
    priceValue: null,
    target: formatWon(targetValue),
    targetValue,
    note: "새 알림 조건 저장됨",
    status: draft.status || "추적 중",
    statusCode: draft.statusCode || "active",
    date: draft.departureLabel,
    departureDateFrom: draft.departureDateFrom,
    departureDateTo: draft.departureDateTo,
    returnDateFrom: draft.returnDateFrom,
    returnDateTo: draft.returnDateTo,
    direct: draft.stopCount === 0,
    tripType: draft.tripType,
    cabinClass: draft.cabinClass || "economy",
    adultCount: draft.adultCount || 1,
    childCount: draft.childCount || 0,
    infantCount: draft.infantCount || 0,
    cabinBags: draft.cabinBags,
    checkedBags: draft.checkedBags,
    stopCount: draft.stopCount,
    layovers: draft.layovers.slice(0, draft.stopCount),
    priceDropThresholdPercent: draft.priceDropThresholdPercent || 5,
    createdAt: draft.createdAt || now,
    updatedAt: now,
  };
}

export function validateAlertDraft(draft) {
  if (draft.origin.code === draft.destination.code) {
    return "출발 공항과 도착 공항을 다르게 선택해 주세요.";
  }

  if (!draft.targetValue || draft.targetValue < 10000) {
    return "목표 가격을 다시 확인해 주세요.";
  }

  if (!isValidIsoDate(draft.departureDateFrom) || !isValidIsoDate(draft.departureDateTo)) {
    return "가는 날짜는 YYYY-MM-DD 형식으로 입력해 주세요.";
  }

  if (draft.departureDateFrom > draft.departureDateTo) {
    return "가는 날짜 범위를 다시 확인해 주세요.";
  }

  if (draft.tripType === "round") {
    if (!isValidIsoDate(draft.returnDateFrom) || !isValidIsoDate(draft.returnDateTo)) {
      return "오는 날짜는 YYYY-MM-DD 형식으로 입력해 주세요.";
    }

    if (draft.returnDateFrom > draft.returnDateTo || draft.departureDateFrom > draft.returnDateTo) {
      return "오는 날짜 범위를 다시 확인해 주세요.";
    }
  }

  const passengers = (draft.adultCount || 0) + (draft.childCount || 0) + (draft.infantCount || 0);
  if ((draft.adultCount || 0) < 1 || passengers > 9) {
    return "승객은 성인 1명 이상, 전체 9명 이하로 설정해 주세요.";
  }

  return "";
}

export function alertToNotification(alert, index = 0) {
  const fresh = index === 0 || alert.status === "가격 하락";

  if (alert.statusCode === "paused" || alert.status === "일시정지") {
    return {
      id: `${alert.id}-paused`,
      type: "watch",
      title: `${alert.city} 알림 일시정지`,
      subtitle: `${alert.route} · 목표가 ${alert.target}`,
      fresh: false,
      target: alert,
    };
  }

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
  if (!notifications.length) {
    return "저장된 가격 알림이 아직 없어요. 만들기 화면에서 첫 여행 조건을 저장해 보세요.";
  }

  const drops = notifications.filter((item) => item.type === "drop").length;
  const targets = notifications.filter((item) => item.type === "target").length;
  const watching = notifications.filter((item) => item.type === "watch").length;

  return `현재 가격 하락 ${drops}건, 목표가 도달 ${targets}건, 추적 중 ${watching}건을 확인하고 있어요.`;
}
