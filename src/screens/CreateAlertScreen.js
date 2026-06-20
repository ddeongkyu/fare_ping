import { ArrowLeftRight, CalendarDays, Send } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import {
  AirportPicker,
  AirportSelectField,
  PriceInsightCard,
  TargetPriceField,
  TravelPreferenceCard,
  TripTypeSelector,
} from "../components/AlertFormControls";
import { Field, PrimaryButton, ScreenHeader } from "../components/ui";
import { airportOptions, defaultLayovers } from "../data/flightData";
import { formatWon, routeName, validateAlertDraft } from "../domain/flightAlerts";
import { colors } from "../theme/colors";
import { styles } from "../theme/styles";

export function CreateAlertScreen({ go, onSaveAlert }) {
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
