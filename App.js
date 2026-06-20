import {
  ArrowLeftRight,
  Bell,
  BellRing,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  Clock3,
  Home,
  MapPin,
  Plane,
  Plus,
  Radar,
  Send,
  Share as ShareIcon,
  TrendingDown,
  X,
} from "lucide-react-native";
import { useRef, useState } from "react";
import {
  Animated,
  Easing,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share as NativeShare,
  StyleSheet,
  StatusBar,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Line, Polyline, Rect } from "react-native-svg";

import { appConfig } from "./src/config/appConfig";
import { airportOptions, chartBars, defaultLayovers, initialAlerts, previousYearTrend } from "./src/data/flightData";
import {
  alertToNotification,
  createFlightAlert,
  formatWon,
  getNotificationSummary,
  routeName,
  validateAlertDraft,
} from "./src/domain/flightAlerts";
import { buildAffiliateUrl } from "./src/services/affiliate";

const colors = {
  ink: "#172027",
  muted: "#69757f",
  line: "#dfe6e8",
  paper: "#f5f7f4",
  white: "#ffffff",
  teal: "#0f8b8d",
  tealSoft: "#dff2f0",
  coral: "#e46f5c",
  coralSoft: "#ffe7e2",
  amber: "#f2ad3f",
  amberSoft: "#fff0cf",
  green: "#4a9f66",
  greenSoft: "#e4f3ea",
  blue: "#4978a8",
};

const screenOrder = {
  home: 0,
  create: 1,
  detail: 2,
  notifications: 3,
};

function IconButton({ children, onPress, tone = "default", label }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        tone === "soft" && styles.iconButtonSoft,
        pressed && styles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

function PrimaryButton({ children, icon, onPress, tone = "teal" }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        tone === "white" && styles.whiteButton,
        pressed && styles.pressed,
      ]}
    >
      {icon}
      <Text style={[styles.primaryButtonText, tone === "white" && styles.whiteButtonText]}>{children}</Text>
    </Pressable>
  );
}

function ScreenHeader({ kicker, title, right, onBack }) {
  if (onBack) {
    return (
      <View style={styles.compactHeader}>
        <IconButton onPress={onBack} label="뒤로 가기">
          <ChevronLeft size={20} color={colors.ink} />
        </IconButton>
        <Text style={styles.compactHeaderTitle}>{title}</Text>
        {right || <View style={styles.headerSpacer} />}
      </View>
    );
  }

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.kicker}>{kicker}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

function HeaderStatusPill({ icon, children }) {
  return (
    <View style={styles.headerStatusPill}>
      {icon}
      <Text style={styles.headerStatusText}>{children}</Text>
    </View>
  );
}

function StatusLine() {
  return (
    <View style={styles.statusLine}>
      <Text style={styles.statusTime}>9:41</Text>
      <View style={styles.statusIcons}>
        <View style={styles.signalDot} />
        <View style={styles.signalDot} />
        <View style={styles.signalDot} />
      </View>
    </View>
  );
}

function AppShell({ children }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.webStage}>
        <View style={styles.deviceFrame}>
          <StatusLine />
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}

function HomeScreen({ go, alerts }) {
  const featured = alerts[0];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
      <ScreenHeader
        kicker={appConfig.brandName}
        title="오늘의 항공권"
        right={
          <HeaderStatusPill icon={<Radar size={16} color={colors.teal} />}>
            실시간 확인
          </HeaderStatusPill>
        }
      />

      <View style={styles.dealHero}>
        <Text style={styles.dealRoute}>{featured.route}</Text>
        <Text style={styles.dealPrice}>{featured.price}</Text>
        <Text style={styles.dealNote}>{featured.note}</Text>
        <PrimaryButton tone="white" onPress={() => go("detail", featured)} icon={<Plane size={18} color={colors.ink} />}>
          예약 보기
        </PrimaryButton>
      </View>

      <View style={styles.chartCard}>
        {chartBars.map((height, index) => (
          <View
            key={index}
            style={[
              styles.chartBar,
              { height: `${height}%` },
              index === 4 || index === 6 ? styles.chartBarLow : null,
            ]}
          />
        ))}
      </View>

      <View style={styles.listBlock}>
        {alerts.slice(1, 4).map((alert) => (
          <Pressable
            key={alert.id}
            accessibilityRole="button"
            accessibilityLabel={`${alert.route} 상세 보기`}
            onPress={() => go("detail", alert)}
            style={({ pressed }) => [styles.compactDeal, pressed && styles.pressed]}
          >
            <View>
              <Text style={styles.airportCode}>{alert.city}</Text>
              <Text style={styles.compactRoute}>{alert.route}</Text>
            </View>
            <Text style={styles.compactPrice}>{alert.price.replace(",000", "k").replace("₩", "₩")}</Text>
          </Pressable>
        ))}
      </View>

      <PrimaryButton onPress={() => go("create")} icon={<Plus size={18} color={colors.white} />}>
        새 가격 알림 만들기
      </PrimaryButton>
    </ScrollView>
  );
}

function CreateAlertScreen({ go, onSaveAlert }) {
  const [showPriceInsight, setShowPriceInsight] = useState(false);
  const [origin, setOrigin] = useState(airportOptions[0]);
  const [destination, setDestination] = useState(airportOptions[3]);
  const [tripType, setTripType] = useState("round");
  const [airportPicker, setAirportPicker] = useState(null);
  const [stopCount, setStopCount] = useState(0);
  const [layovers, setLayovers] = useState(defaultLayovers);
  const [cabinBags, setCabinBags] = useState(1);
  const [checkedBags, setCheckedBags] = useState(0);
  const [formError, setFormError] = useState("");
  const targetValue = 150000;

  const updateLayover = (index, key, value) => {
    setLayovers((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
  };

  const baggageSummary = `기내 ${cabinBags}개 · 위탁 ${checkedBags}개`;
  const stopSummary = stopCount === 0 ? "직항만" : `경유 ${stopCount}회까지`;
  const tripSummary = tripType === "round" ? "왕복" : "편도";
  const activeAirport = airportPicker === "origin" ? origin : destination;
  const swapAirports = () => {
    setOrigin(destination);
    setDestination(origin);
    setFormError("");
  };
  const handleSave = () => {
    const draft = {
      origin,
      destination,
      tripType,
      departureLabel: "2026년 9월",
      returnLabel: tripType === "round" ? "2026년 9월 말" : "",
      targetValue,
      stopCount,
      layovers,
      cabinBags,
      checkedBags,
    };
    const error = validateAlertDraft(draft);

    if (error) {
      setFormError(error);
      return;
    }

    setFormError("");
    onSaveAlert(draft);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
      <ScreenHeader title="알림 만들기" onBack={() => go("home")} />

      <View style={styles.formCard}>
        <View style={styles.routeSelectCard}>
          <AirportSelectField label="출발 공항" airport={origin} onPress={() => setAirportPicker("origin")} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="출발 공항과 도착 공항 바꾸기"
            onPress={swapAirports}
            style={({ pressed }) => [styles.swapAirportButton, pressed && styles.pressed]}
          >
            <ArrowLeftRight size={18} color={colors.teal} />
          </Pressable>
          <AirportSelectField label="도착 공항" airport={destination} onPress={() => setAirportPicker("destination")} />
        </View>

        {airportPicker && (
          <AirportPicker
            title={airportPicker === "origin" ? "출발 공항 선택" : "도착 공항 선택"}
            selected={activeAirport}
            onClose={() => setAirportPicker(null)}
            onSelect={(airport) => {
              if (airportPicker === "origin") setOrigin(airport);
              if (airportPicker === "destination") setDestination(airport);
              setFormError("");
              setAirportPicker(null);
            }}
          />
        )}

        <TripTypeSelector value={tripType} onChange={setTripType} />
        <Field label={tripType === "round" ? "가는 시기" : "여행 시기"} value="2026년 9월" icon={<CalendarDays size={16} color={colors.teal} />} />
        {tripType === "round" && <Field label="돌아오는 시기" value="2026년 9월 말" icon={<CalendarDays size={16} color={colors.teal} />} />}
        <TargetPriceField
          value={formatWon(targetValue)}
          active={showPriceInsight}
          onHelpPress={() => setShowPriceInsight((current) => !current)}
        />
      </View>

      {showPriceInsight && <PriceInsightCard origin={origin} destination={destination} />}

      {formError ? (
        <View style={styles.validationBox}>
          <Text style={styles.validationText}>{formError}</Text>
        </View>
      ) : null}

      <TravelPreferenceCard
        stopCount={stopCount}
        setStopCount={setStopCount}
        layovers={layovers}
        updateLayover={updateLayover}
        cabinBags={cabinBags}
        setCabinBags={setCabinBags}
        checkedBags={checkedBags}
        setCheckedBags={setCheckedBags}
      />

      <View style={styles.previewCard}>
        <Text style={styles.previewTitle}>알림 예시</Text>
        <Text style={styles.previewBody}>
          {routeName(origin, destination)} {tripSummary} 항공권이 {formatWon(targetValue)} 이하이고 {stopSummary}, {baggageSummary} 조건을 만족하면 알림을 보냅니다.
        </Text>
      </View>

      <PrimaryButton onPress={handleSave} icon={<Send size={18} color={colors.white} />}>
        저장
      </PrimaryButton>
    </ScrollView>
  );
}

function TargetPriceField({ value, active, onHelpPress }) {
  return (
    <View style={[styles.field, active && styles.fieldActive]}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>목표 가격</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="작년 가격 추이 보기"
          onPress={onHelpPress}
          style={({ pressed }) => [styles.helpButton, active && styles.helpButtonActive, pressed && styles.pressed]}
        >
          <Text style={[styles.helpButtonText, active && styles.helpButtonTextActive]}>?</Text>
        </Pressable>
      </View>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

function AirportSelectField({ label, airport, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} 선택`}
      onPress={onPress}
      style={({ pressed }) => [styles.airportSelectField, pressed && styles.pressed]}
    >
      <View style={styles.airportFieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <MapPin size={16} color={colors.teal} />
      </View>
      <Text style={styles.airportName}>{airport.name}</Text>
      <Text style={styles.airportMeta}>
        {airport.city} · {airport.country} · {airport.code}
      </Text>
    </Pressable>
  );
}

function AirportPicker({ title, selected, onSelect, onClose }) {
  return (
    <View style={styles.airportPicker}>
      <View style={styles.airportPickerHeader}>
        <Text style={styles.airportPickerTitle}>{title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="공항 선택 닫기" onPress={onClose} style={styles.airportCloseButton}>
          <X size={16} color={colors.ink} />
        </Pressable>
      </View>
      <View style={styles.airportList}>
        {airportOptions.map((airport) => {
          const active = airport.code === selected.code;
          return (
            <Pressable
              key={airport.code}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${airport.name} 선택`}
              onPress={() => onSelect(airport)}
              style={({ pressed }) => [styles.airportOption, active && styles.airportOptionActive, pressed && styles.pressed]}
            >
              <View style={styles.airportCodeBadge}>
                <Text style={styles.airportCodeBadgeText}>{airport.code}</Text>
              </View>
              <View style={styles.airportOptionCopy}>
                <Text style={styles.airportOptionName}>{airport.name}</Text>
                <Text style={styles.airportOptionMeta}>
                  {airport.city} · {airport.country}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TripTypeSelector({ value, onChange }) {
  const options = [
    { value: "round", label: "왕복" },
    { value: "oneway", label: "편도" },
  ];

  return (
    <View style={styles.tripTypeCard}>
      <Text style={styles.preferenceLabel}>여행 방식</Text>
      <View style={styles.segmentRow}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [styles.segmentButton, active && styles.segmentButtonActive, pressed && styles.pressed]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PriceInsightCard({ origin, destination }) {
  const [selectedIndex, setSelectedIndex] = useState(4);
  const selected = previousYearTrend[selectedIndex];
  const prices = previousYearTrend.map((item) => item.price);
  const average = Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const target = 150000;
  const width = 302;
  const height = 142;
  const padX = 18;
  const padY = 18;
  const range = high - low || 1;
  const getX = (index) => padX + (index * (width - padX * 2)) / (previousYearTrend.length - 1);
  const getY = (price) => padY + ((high - price) * (height - padY * 2)) / range;
  const points = previousYearTrend.map((item, index) => `${getX(index)},${getY(item.price)}`).join(" ");
  const targetY = getY(target);
  const selectedX = getX(selectedIndex);
  const selectedY = getY(selected.price);

  return (
    <View style={styles.insightCard}>
      <View style={styles.insightHeader}>
        <View>
          <Text style={styles.insightEyebrow}>작년 같은 기간 평균가</Text>
          <Text style={styles.insightTitle}>{routeName(origin, destination)} · 2025년 9월</Text>
        </View>
        <View style={styles.insightBadge}>
          <Text style={styles.insightBadgeText}>목표가 참고</Text>
        </View>
      </View>

      <View style={styles.selectedPriceRow}>
        <View>
          <Text style={styles.selectedDate}>{selected.date}</Text>
          <Text style={styles.selectedCaption}>선택 날짜 평균 가격</Text>
        </View>
        <Text style={styles.selectedPrice}>{formatWon(selected.price)}</Text>
      </View>

      <View style={styles.chartFrame}>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          <Rect x="0" y="0" width={width} height={height} rx="8" fill="#ffffff" />
          <Line x1={padX} y1={padY} x2={padX} y2={height - padY} stroke="#edf1f1" strokeWidth="1" />
          <Line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="#edf1f1" strokeWidth="1" />
          <Line
            x1={padX}
            y1={targetY}
            x2={width - padX}
            y2={targetY}
            stroke={colors.coral}
            strokeDasharray="5 5"
            strokeWidth="1.5"
          />
          <Polyline points={points} fill="none" stroke={colors.teal} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {previousYearTrend.map((item, index) => {
            const x = getX(index);
            const y = getY(item.price);
            const active = index === selectedIndex;
            return (
              <Circle
                key={item.date}
                cx={x}
                cy={y}
                r={active ? 7 : 5}
                fill={active ? colors.coral : colors.white}
                stroke={active ? colors.coral : colors.teal}
                strokeWidth="3"
                onPress={() => setSelectedIndex(index)}
              />
            );
          })}
          <Circle cx={selectedX} cy={selectedY} r="13" fill="rgba(228,111,92,0.14)" />
          {previousYearTrend.map((item, index) => (
            <Rect
              key={`${item.date}-tap`}
              x={Math.max(0, getX(index) - 16)}
              y="0"
              width="32"
              height={height}
              fill="transparent"
              onPress={() => setSelectedIndex(index)}
            />
          ))}
        </Svg>
      </View>

      <View style={styles.chartLabels}>
        {previousYearTrend.map((item, index) => (
          <Pressable
            key={item.date}
            accessibilityRole="button"
            accessibilityLabel={`${item.date} 평균 가격 ${formatWon(item.price)}`}
            accessibilityState={{ selected: index === selectedIndex }}
            onPress={() => setSelectedIndex(index)}
            style={({ pressed }) => [styles.datePill, index === selectedIndex && styles.datePillActive, pressed && styles.pressed]}
          >
            <Text style={[styles.datePillText, index === selectedIndex && styles.datePillTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.insightStats}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>작년 평균</Text>
          <Text style={styles.statValue}>{formatWon(average)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>최저 평균</Text>
          <Text style={styles.statValue}>{formatWon(low)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>현재 목표</Text>
          <Text style={[styles.statValue, styles.targetStat]}>{formatWon(target)}</Text>
        </View>
      </View>
    </View>
  );
}

function TravelPreferenceCard({
  stopCount,
  setStopCount,
  layovers,
  updateLayover,
  cabinBags,
  setCabinBags,
  checkedBags,
  setCheckedBags,
}) {
  return (
    <View style={styles.preferenceCard}>
      <View style={styles.preferenceHeader}>
        <View style={styles.preferenceTitleRow}>
          <Plane size={17} color={colors.teal} />
          <Text style={styles.preferenceTitle}>여정 조건</Text>
        </View>
        <Text style={styles.preferenceSubtitle}>경유와 수하물까지 알림 조건에 포함</Text>
      </View>

      <Text style={styles.preferenceLabel}>경유 횟수</Text>
      <View style={styles.segmentRow}>
        {[
          { label: "직항", value: 0 },
          { label: "1회", value: 1 },
          { label: "2회", value: 2 },
        ].map((item) => (
          <Pressable
            key={item.value}
            accessibilityRole="button"
            accessibilityState={{ selected: stopCount === item.value }}
            onPress={() => setStopCount(item.value)}
            style={({ pressed }) => [
              styles.segmentButton,
              stopCount === item.value && styles.segmentButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.segmentText, stopCount === item.value && styles.segmentTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {stopCount === 0 ? (
        <View style={styles.directNote}>
          <Text style={styles.directNoteTitle}>직항만 추적</Text>
          <Text style={styles.directNoteBody}>경유 시간이 긴 항공권은 알림에서 제외합니다.</Text>
        </View>
      ) : (
        <View style={styles.layoverList}>
          {layovers.slice(0, stopCount).map((layover, index) => (
            <LayoverEditor key={index} index={index} layover={layover} updateLayover={updateLayover} />
          ))}
        </View>
      )}

      <View style={styles.baggageSection}>
        <View style={styles.preferenceTitleRow}>
          <Briefcase size={17} color={colors.teal} />
          <Text style={styles.preferenceTitle}>수하물 조건</Text>
        </View>
        <BagCounter
          label="기내 수하물"
          caption="캐리어/백팩 포함"
          value={cabinBags}
          onChange={setCabinBags}
          min={0}
          max={3}
        />
        <BagCounter
          label="위탁 수하물"
          caption="체크인 수하물"
          value={checkedBags}
          onChange={setCheckedBags}
          min={0}
          max={3}
        />
      </View>
    </View>
  );
}

function LayoverEditor({ index, layover, updateLayover }) {
  const airports = index === 0 ? ["TPE", "HKG", "KIX"] : ["HKG", "TPE", "SIN"];
  const terminals = ["T1", "T2", "T3"];
  const durations = index === 0 ? ["1h 30m", "2h 10m", "3h 40m"] : ["1h 50m", "3h 20m", "5h 00m"];

  return (
    <View style={styles.layoverCard}>
      <View style={styles.layoverHeader}>
        <Text style={styles.layoverTitle}>경유 {index + 1}</Text>
        <Text style={styles.layoverSummary}>
          {layover.airport} · {layover.terminal} · {layover.duration}
        </Text>
      </View>

      <OptionGroup
        label="공항"
        options={airports}
        value={layover.airport}
        onChange={(value) => updateLayover(index, "airport", value)}
      />
      <OptionGroup
        label="터미널"
        options={terminals}
        value={layover.terminal}
        onChange={(value) => updateLayover(index, "terminal", value)}
      />
      <OptionGroup
        label="경유 시간"
        options={durations}
        value={layover.duration}
        onChange={(value) => updateLayover(index, "duration", value)}
      />
    </View>
  );
}

function OptionGroup({ label, options, value, onChange }) {
  return (
    <View style={styles.optionGroup}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((option) => {
          const active = option === value;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(option)}
              style={({ pressed }) => [styles.choiceChip, active && styles.choiceChipActive, pressed && styles.pressed]}
            >
              <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function BagCounter({ label, caption, value, onChange, min, max }) {
  const decrement = () => onChange(Math.max(min, value - 1));
  const increment = () => onChange(Math.min(max, value + 1));

  return (
    <View style={styles.bagCounter}>
      <View style={styles.bagCopy}>
        <Text style={styles.bagLabel}>{label}</Text>
        <Text style={styles.bagCaption}>{caption}</Text>
      </View>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 줄이기`}
          onPress={decrement}
          style={({ pressed }) => [styles.stepperButton, value <= min && styles.stepperButtonDisabled, pressed && value > min && styles.pressed]}
        >
          <Text style={[styles.stepperText, value <= min && styles.stepperTextDisabled]}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 늘리기`}
          onPress={increment}
          style={({ pressed }) => [styles.stepperButton, value >= max && styles.stepperButtonDisabled, pressed && value < max && styles.pressed]}
        >
          <Text style={[styles.stepperText, value >= max && styles.stepperTextDisabled]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Field({ label, value, icon }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {icon}
      </View>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

function DetailScreen({ selected, go }) {
  const deal = selected || initialAlerts[1];
  const [fromCity, toCity] = deal.route.split(" → ");
  const affiliateUrl = buildAffiliateUrl(deal);
  const shareDeal = () => {
    const message = `${deal.route} 항공권 ${deal.price} 발견: ${affiliateUrl}`;

    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(message);
      return;
    }

    NativeShare.share({ message }).catch(() => {});
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
      <ScreenHeader
        title={deal.route}
        onBack={() => go("home")}
        right={
          <IconButton onPress={shareDeal} label="공유">
            <ShareIcon size={18} color={colors.ink} />
          </IconButton>
        }
      />

      <View style={styles.ticketCard}>
        <View style={styles.airportPair}>
          <Text style={[styles.bigAirport, styles.bigAirportFrom]}>{fromCity}</Text>
          <View style={styles.routeLine}>
            <Plane size={18} color={colors.muted} />
          </View>
          <Text style={[styles.bigAirport, styles.bigAirportTo]}>{toCity}</Text>
        </View>
        <Text style={styles.ticketLabel}>최근 발견가</Text>
        <Text style={styles.ticketPrice}>{deal.price}</Text>
      </View>

      <View style={styles.detailGrid}>
        <InfoCard label="출발" value={deal.date} />
        <InfoCard label="조건" value={deal.direct ? "직항" : "경유 가능"} />
        <InfoCard label="목표가" value={deal.target} />
        <InfoCard label="상태" value={deal.status} />
      </View>

      <View style={styles.timelineCard}>
        <Text style={styles.previewTitle}>가격 히스토리</Text>
        <View style={styles.timelineRow}>
          <View style={styles.timelineDot} />
          <Text style={styles.timelineText}>최근 캐시 가격이 목표가 이하로 발견됨</Text>
        </View>
        <View style={styles.timelineRow}>
          <View style={[styles.timelineDot, styles.timelineDotMuted]} />
          <Text style={styles.timelineText}>예약 링크 클릭은 Travelpayouts에서 추적</Text>
        </View>
      </View>

      <PrimaryButton onPress={() => Linking.openURL(affiliateUrl)} icon={<Plane size={18} color={colors.white} />}>
        Aviasales에서 보기
      </PrimaryButton>
    </ScrollView>
  );
}

function InfoCard({ label, value }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function NotificationsScreen({ go, alerts }) {
  const notifications = alerts.map(alertToNotification);
  const renderNotificationIcon = (item) => {
    if (item.type === "drop") return <TrendingDown size={18} color={colors.coral} />;
    if (item.type === "target") return <BellRing size={18} color={colors.teal} />;
    return <Clock3 size={18} color={colors.teal} />;
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
      <ScreenHeader
        kicker="가격 알림"
        title="알림함"
        right={
          <HeaderStatusPill icon={<BellRing size={16} color={colors.coral} />}>
            새 알림 1
          </HeaderStatusPill>
        }
      />

      <View style={styles.notificationList}>
        {notifications.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`${item.title} 상세 보기`}
            onPress={() => go("detail", item.target)}
            style={({ pressed }) => [
              styles.notificationItem,
              item.fresh && styles.notificationFresh,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.notificationIcon, item.fresh && styles.notificationIconFresh]}>
              {renderNotificationIcon(item)}
            </View>
            <View style={styles.notificationCopy}>
              <Text style={styles.notificationTitle}>{item.title}</Text>
              <Text style={styles.notificationSubtitle}>{item.subtitle}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.notificationSummaryCard}>
        <Text style={styles.notificationSummaryTitle}>최근 업데이트</Text>
        <Text style={styles.notificationSummaryBody}>{getNotificationSummary(notifications)}</Text>
      </View>
    </ScrollView>
  );
}

function BottomNav({ screen, go }) {
  const items = [
    { key: "home", label: "홈", icon: Home },
    { key: "create", label: "만들기", icon: Plus },
    { key: "notifications", label: "알림", icon: Bell },
  ];

  return (
    <View style={styles.bottomNav}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = screen === item.key;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            onPress={() => go(item.key)}
            style={({ pressed }) => [styles.navItem, active && styles.navItemActive, pressed && styles.pressed]}
          >
            <Icon size={18} color={active ? colors.teal : colors.muted} />
            <Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [alerts, setAlerts] = useState(initialAlerts);
  const [selected, setSelected] = useState(initialAlerts[1]);
  const transition = useRef(new Animated.Value(1)).current;
  const direction = useRef(1);

  const go = (nextScreen, nextSelected) => {
    if (nextSelected) setSelected(nextSelected);
    if (nextScreen === screen) return;
    direction.current = (screenOrder[nextScreen] ?? 0) >= (screenOrder[screen] ?? 0) ? 1 : -1;
    transition.setValue(0);
    setScreen(nextScreen);
    requestAnimationFrame(() => {
      Animated.timing(transition, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }).start();
    });
  };
  const saveAlert = (draft) => {
    const newAlert = createFlightAlert(draft);

    setAlerts((current) => [newAlert, ...current]);
    go("notifications", newAlert);
  };

  const translateX = transition.interpolate({
    inputRange: [0, 1],
    outputRange: [direction.current * 18, 0],
  });

  return (
    <AppShell>
      <View style={styles.appBrandBar}>
        <View style={styles.brandMark}>
          <Radar size={20} color={colors.teal} />
          <Text style={styles.brandText}>{appConfig.brandName}</Text>
        </View>
      </View>

      <Animated.View style={[styles.screenSlot, styles.animatedScreen, { opacity: transition, transform: [{ translateX }] }]}>
        {screen === "home" && <HomeScreen go={go} alerts={alerts} />}
        {screen === "create" && <CreateAlertScreen go={go} onSaveAlert={saveAlert} />}
        {screen === "detail" && <DetailScreen selected={selected} go={go} />}
        {screen === "notifications" && <NotificationsScreen go={go} alerts={alerts} />}
      </Animated.View>

      <BottomNav screen={screen} go={go} />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  webStage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Platform.OS === "web" ? 24 : 0,
    backgroundColor: colors.paper,
  },
  deviceFrame: {
    flex: 1,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 430 : undefined,
    maxHeight: Platform.OS === "web" ? 900 : undefined,
    overflow: "hidden",
    borderWidth: Platform.OS === "web" ? 10 : 0,
    borderColor: "#11191f",
    borderRadius: Platform.OS === "web" ? 38 : 0,
    backgroundColor: "#f8faf9",
    boxShadow: Platform.OS === "web" ? "0 28px 70px rgba(23,32,39,0.2)" : undefined,
  },
  statusLine: {
    height: 42,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusTime: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  statusIcons: {
    flexDirection: "row",
    gap: 4,
  },
  signalDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.ink,
  },
  appBrandBar: {
    paddingHorizontal: 18,
    paddingBottom: 4,
  },
  brandMark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  screenSlot: {
    flex: 1,
  },
  animatedScreen: {
    overflow: "hidden",
  },
  screenContent: {
    padding: 18,
    paddingBottom: 26,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  compactHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  compactHeaderTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  headerSpacer: {
    width: 42,
    height: 42,
  },
  headerStatusPill: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: "rgba(15,139,141,0.2)",
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  headerStatusText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
  },
  kicker: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    marginTop: 2,
    color: colors.ink,
    fontSize: 24,
    fontWeight: "800",
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  iconButtonSoft: {
    backgroundColor: colors.tealSoft,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  primaryButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: colors.teal,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
  },
  whiteButton: {
    backgroundColor: colors.white,
  },
  whiteButtonText: {
    color: colors.ink,
  },
  dealHero: {
    padding: 22,
    borderRadius: 8,
    backgroundColor: colors.teal,
  },
  dealRoute: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  dealPrice: {
    marginTop: 12,
    paddingBottom: 3,
    color: colors.white,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "800",
  },
  dealNote: {
    marginBottom: 24,
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    fontWeight: "700",
  },
  chartCard: {
    height: 122,
    marginTop: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 9,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  chartBar: {
    flex: 1,
    minHeight: 18,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: colors.amber,
  },
  chartBarLow: {
    backgroundColor: colors.coral,
  },
  listBlock: {
    gap: 10,
    marginTop: 18,
    marginBottom: 18,
  },
  compactDeal: {
    minHeight: 74,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  airportCode: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800",
  },
  compactRoute: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  compactPrice: {
    color: colors.teal,
    fontSize: 16,
    fontWeight: "800",
  },
  formCard: {
    gap: 10,
  },
  routeSelectCard: {
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  airportSelectField: {
    minHeight: 88,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: "#fbfcfc",
  },
  airportFieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  airportName: {
    marginTop: 8,
    color: colors.ink,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
  },
  airportMeta: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  swapAirportButton: {
    alignSelf: "center",
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15,139,141,0.25)",
    borderRadius: 8,
    backgroundColor: colors.tealSoft,
  },
  airportPicker: {
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(15,139,141,0.24)",
    borderRadius: 8,
    backgroundColor: "#f7fcfb",
  },
  airportPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  airportPickerTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  airportCloseButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  airportList: {
    gap: 7,
  },
  airportOption: {
    minHeight: 56,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  airportOptionActive: {
    borderColor: colors.teal,
    backgroundColor: colors.tealSoft,
  },
  airportCodeBadge: {
    width: 46,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  airportCodeBadgeText: {
    color: colors.teal,
    fontSize: 14,
    fontWeight: "800",
  },
  airportOptionCopy: {
    flex: 1,
  },
  airportOptionName: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  airportOptionMeta: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  tripTypeCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  field: {
    minHeight: 76,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  fieldActive: {
    borderColor: "rgba(15,139,141,0.42)",
    backgroundColor: "#fbfefd",
  },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  fieldValue: {
    marginTop: 8,
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  helpButton: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    backgroundColor: colors.white,
  },
  helpButtonActive: {
    borderColor: colors.teal,
    backgroundColor: colors.teal,
  },
  helpButtonText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800",
  },
  helpButtonTextActive: {
    color: colors.white,
  },
  insightCard: {
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(15,139,141,0.22)",
    borderRadius: 8,
    backgroundColor: "#f7fcfb",
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  insightEyebrow: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: "800",
  },
  insightTitle: {
    marginTop: 3,
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  insightBadge: {
    minHeight: 28,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.amberSoft,
  },
  insightBadgeText: {
    color: "#7d571a",
    fontSize: 11,
    fontWeight: "800",
  },
  selectedPriceRow: {
    marginTop: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  selectedDate: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  selectedCaption: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  selectedPrice: {
    color: colors.coral,
    fontSize: 20,
    fontWeight: "800",
  },
  chartFrame: {
    height: 152,
    marginTop: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  chartLabels: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  datePill: {
    minHeight: 28,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  datePillActive: {
    borderColor: colors.coral,
    backgroundColor: colors.coralSoft,
  },
  datePillText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  datePillTextActive: {
    color: colors.coral,
  },
  insightStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  statBox: {
    flex: 1,
    minHeight: 54,
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
  },
  statValue: {
    marginTop: 5,
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  targetStat: {
    color: colors.teal,
  },
  preferenceCard: {
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  preferenceHeader: {
    marginBottom: 14,
  },
  preferenceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  preferenceTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  preferenceSubtitle: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  preferenceLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 9,
  },
  segmentButton: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: "#f9fbfa",
  },
  segmentButtonActive: {
    borderColor: "rgba(15,139,141,0.45)",
    backgroundColor: colors.tealSoft,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800",
  },
  segmentTextActive: {
    color: colors.teal,
  },
  directNote: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.greenSoft,
  },
  directNoteTitle: {
    color: "#27643b",
    fontSize: 14,
    fontWeight: "800",
  },
  directNoteBody: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  layoverList: {
    gap: 10,
    marginTop: 12,
  },
  layoverCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: "#fbfcfc",
  },
  layoverHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  layoverTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  layoverSummary: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: "800",
  },
  optionGroup: {
    marginTop: 8,
  },
  optionLabel: {
    marginBottom: 7,
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  choiceChip: {
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  choiceChipActive: {
    borderColor: colors.teal,
    backgroundColor: colors.tealSoft,
  },
  choiceChipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  choiceChipTextActive: {
    color: colors.teal,
  },
  baggageSection: {
    gap: 10,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  bagCounter: {
    minHeight: 72,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: "#fbfcfc",
  },
  bagCopy: {
    flex: 1,
  },
  bagLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  bagCaption: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepperButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: colors.teal,
  },
  stepperButtonDisabled: {
    backgroundColor: "#edf1f1",
  },
  stepperText: {
    color: colors.white,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "800",
  },
  stepperTextDisabled: {
    color: "#a7b0b6",
  },
  stepperValue: {
    minWidth: 18,
    color: colors.ink,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
  },
  filterRow: {
    marginTop: 18,
    marginBottom: 18,
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  filterSelected: {
    borderColor: "rgba(74,159,102,0.45)",
    backgroundColor: colors.greenSoft,
  },
  filterText: {
    color: colors.muted,
    fontWeight: "800",
  },
  filterTextSelected: {
    color: colors.green,
  },
  previewCard: {
    marginBottom: 18,
    padding: 16,
    borderRadius: 8,
    backgroundColor: colors.tealSoft,
  },
  previewTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  previewBody: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
  },
  validationBox: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(228,111,92,0.34)",
    borderRadius: 8,
    backgroundColor: colors.coralSoft,
  },
  validationText: {
    color: colors.coral,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
  },
  ticketCard: {
    padding: 20,
    borderRadius: 8,
    backgroundColor: colors.white,
    boxShadow: Platform.OS === "web" ? "0 16px 36px rgba(23,32,39,0.08)" : undefined,
  },
  airportPair: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bigAirport: {
    width: 76,
    height: 54,
    borderRadius: 8,
    textAlign: "center",
    textAlignVertical: "center",
    color: colors.ink,
    fontSize: 22,
    lineHeight: 54,
    fontWeight: "800",
  },
  bigAirportFrom: {
    backgroundColor: colors.tealSoft,
  },
  bigAirportTo: {
    backgroundColor: colors.coralSoft,
  },
  routeLine: {
    flex: 1,
    height: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.line,
  },
  ticketLabel: {
    marginTop: 28,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  ticketPrice: {
    marginTop: 8,
    paddingBottom: 3,
    color: colors.ink,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
  },
  detailGrid: {
    marginTop: 16,
    gap: 10,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  infoCard: {
    width: "48%",
    minHeight: 82,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  infoValue: {
    marginTop: 10,
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  timelineCard: {
    gap: 12,
    marginTop: 16,
    marginBottom: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.coral,
  },
  timelineDotMuted: {
    backgroundColor: colors.teal,
  },
  timelineText: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  notificationList: {
    gap: 10,
    marginBottom: 18,
  },
  notificationItem: {
    minHeight: 86,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  notificationFresh: {
    borderColor: "rgba(228,111,92,0.44)",
    backgroundColor: "#fff8f5",
  },
  notificationIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: colors.tealSoft,
  },
  notificationIconFresh: {
    backgroundColor: colors.coralSoft,
  },
  notificationCopy: {
    flex: 1,
  },
  notificationTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  notificationSubtitle: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  notificationSummaryCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(15,139,141,0.18)",
    borderRadius: 8,
    backgroundColor: colors.tealSoft,
  },
  notificationSummaryTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  notificationSummaryBody: {
    marginTop: 7,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
  },
  bottomNav: {
    height: 72,
    paddingHorizontal: 14,
    paddingTop: 8,
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  navItem: {
    flex: 1,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: colors.tealSoft,
  },
  navText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  navTextActive: {
    color: colors.teal,
  },
});
