import { Briefcase, MapPin, Plane, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Rect } from "react-native-svg";

import { airportOptions, previousYearTrend } from "../data/flightData";
import { formatWon, routeName } from "../domain/flightAlerts";
import { colors } from "../theme/colors";
import { styles } from "../theme/styles";

export function TargetPriceField({ value, active, onHelpPress }) {
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

export function AirportSelectField({ label, airport, onPress }) {
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

export function AirportPicker({ title, selected, onSelect, onClose }) {
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

export function TripTypeSelector({ value, onChange }) {
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

export function PriceInsightCard({ origin, destination }) {
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

export function TravelPreferenceCard({
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
