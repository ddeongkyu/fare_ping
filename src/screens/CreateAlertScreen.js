import { ArrowLeftRight, CalendarDays, Send } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import {
  AirportPicker,
  AirportSelectField,
  PassengerCabinCard,
  PriceInsightCard,
  TargetPriceField,
  TravelPreferenceCard,
  TripTypeSelector,
} from "../components/AlertFormControls";
import { PrimaryButton, ScreenHeader } from "../components/ui";
import { airportOptions, defaultLayovers } from "../data/flightData";
import { formatDateRange, formatWon, parsePriceInput, routeName, validateAlertDraft } from "../domain/flightAlerts";
import { colors } from "../theme/colors";
import { styles } from "../theme/styles";

function findAirport(airports, code, fallbackIndex) {
  return airports.find((airport) => airport.code === code) || airports[fallbackIndex] || airports[0];
}

function DateInputField({ label, value, onChangeText }) {
  return (
    <View style={[styles.field, styles.dateInputField]}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <CalendarDays size={16} color={colors.teal} />
      </View>
      <TextInput
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
        onChangeText={onChangeText}
        placeholder="2026-09-01"
        placeholderTextColor="#9aa5ad"
        style={styles.fieldInput}
        value={value}
      />
    </View>
  );
}

export function CreateAlertScreen({ go, onSaveAlert, airports = airportOptions, editingAlert, saving = false }) {
  const availableAirports = airports.length ? airports : airportOptions;
  const isEditing = Boolean(editingAlert);
  const [showPriceInsight, setShowPriceInsight] = useState(false);
  const [origin, setOrigin] = useState(findAirport(availableAirports, editingAlert?.from || "ICN", 0));
  const [destination, setDestination] = useState(findAirport(availableAirports, editingAlert?.to || "NRT", 3));
  const [tripType, setTripType] = useState(editingAlert?.tripType || "round");
  const [airportPicker, setAirportPicker] = useState(null);
  const [departureDateFrom, setDepartureDateFrom] = useState(editingAlert?.departureDateFrom || "2026-09-01");
  const [departureDateTo, setDepartureDateTo] = useState(editingAlert?.departureDateTo || "2026-09-30");
  const [returnDateFrom, setReturnDateFrom] = useState(editingAlert?.returnDateFrom || "2026-09-20");
  const [returnDateTo, setReturnDateTo] = useState(editingAlert?.returnDateTo || "2026-09-30");
  const [targetPriceText, setTargetPriceText] = useState(String(editingAlert?.targetValue || 150000));
  const [stopCount, setStopCount] = useState(editingAlert?.stopCount || 0);
  const [layovers, setLayovers] = useState(editingAlert?.layovers?.length ? editingAlert.layovers : defaultLayovers);
  const [cabinBags, setCabinBags] = useState(editingAlert?.cabinBags ?? 1);
  const [checkedBags, setCheckedBags] = useState(editingAlert?.checkedBags ?? 0);
  const [adultCount, setAdultCount] = useState(editingAlert?.adultCount || 1);
  const [childCount, setChildCount] = useState(editingAlert?.childCount || 0);
  const [infantCount, setInfantCount] = useState(editingAlert?.infantCount || 0);
  const [cabinClass, setCabinClass] = useState(editingAlert?.cabinClass || "economy");
  const [formError, setFormError] = useState("");
  const targetValue = parsePriceInput(targetPriceText);

  useEffect(() => {
    if (!availableAirports.some((airport) => airport.code === origin.code)) {
      setOrigin(findAirport(availableAirports, editingAlert?.from || "ICN", 0));
    }

    if (!availableAirports.some((airport) => airport.code === destination.code)) {
      setDestination(findAirport(availableAirports, editingAlert?.to || "NRT", 3));
    }
  }, [availableAirports, destination.code, editingAlert?.from, editingAlert?.to, origin.code]);

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
      id: editingAlert?.id,
      persisted: editingAlert?.persisted,
      origin,
      destination,
      tripType,
      departureDateFrom,
      departureDateTo,
      returnDateFrom: tripType === "round" ? returnDateFrom : null,
      returnDateTo: tripType === "round" ? returnDateTo : null,
      departureLabel: formatDateRange(departureDateFrom, departureDateTo),
      returnLabel: tripType === "round" ? formatDateRange(returnDateFrom, returnDateTo) : "",
      targetValue,
      stopCount,
      layovers,
      cabinBags,
      checkedBags,
      adultCount,
      childCount,
      infantCount,
      cabinClass,
      priceDropThresholdPercent: editingAlert?.priceDropThresholdPercent || 5,
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
      <ScreenHeader title={isEditing ? "알림 수정" : "알림 만들기"} onBack={() => go(isEditing ? "detail" : "home", editingAlert)} />

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
            airports={availableAirports}
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
        <View style={styles.dateGrid}>
          <DateInputField label="출발 시작일" value={departureDateFrom} onChangeText={setDepartureDateFrom} />
          <DateInputField label="출발 종료일" value={departureDateTo} onChangeText={setDepartureDateTo} />
        </View>
        {tripType === "round" && (
          <View style={styles.dateGrid}>
            <DateInputField label="귀국 시작일" value={returnDateFrom} onChangeText={setReturnDateFrom} />
            <DateInputField label="귀국 종료일" value={returnDateTo} onChangeText={setReturnDateTo} />
          </View>
        )}
        <TargetPriceField
          value={targetPriceText}
          active={showPriceInsight}
          onChangeText={setTargetPriceText}
          onHelpPress={() => setShowPriceInsight((current) => !current)}
        />
      </View>

      {showPriceInsight && <PriceInsightCard origin={origin} destination={destination} targetValue={targetValue || 150000} />}

      {formError ? (
        <View style={styles.validationBox}>
          <Text style={styles.validationText}>{formError}</Text>
        </View>
      ) : null}

      <PassengerCabinCard
        adultCount={adultCount}
        setAdultCount={setAdultCount}
        childCount={childCount}
        setChildCount={setChildCount}
        infantCount={infantCount}
        setInfantCount={setInfantCount}
        cabinClass={cabinClass}
        setCabinClass={setCabinClass}
      />

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

      <PrimaryButton disabled={saving} onPress={handleSave} icon={<Send size={18} color={colors.white} />}>
        {saving ? "저장 중" : isEditing ? "변경 저장" : "저장"}
      </PrimaryButton>
    </ScrollView>
  );
}
