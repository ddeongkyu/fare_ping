import { PauseCircle, Pencil, Plane, PlayCircle, Plus, Radar } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

import { HeaderStatusPill, PrimaryButton, ScreenHeader } from "../components/ui";
import { appConfig } from "../config/appConfig";
import { chartBars } from "../data/flightData";
import { colors } from "../theme/colors";
import { styles } from "../theme/styles";

export function HomeScreen({ go, alerts, onEditAlert, onToggleStatus }) {
  const featured = alerts[0];
  const renderStatusIcon = (alert, color = colors.teal) =>
    alert.statusCode === "paused" ? <PlayCircle size={15} color={color} /> : <PauseCircle size={15} color={color} />;
  const renderStatusLabel = (alert) => (alert.statusCode === "paused" ? "재개" : "정지");

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

      {featured ? (
        <View style={styles.dealHero}>
          <Text style={styles.dealRoute}>{featured.route}</Text>
          <Text style={styles.dealPrice}>{featured.price}</Text>
          <Text style={styles.dealNote}>{featured.note}</Text>
          <PrimaryButton tone="white" onPress={() => go("detail", featured)} icon={<Plane size={18} color={colors.ink} />}>
            예약 보기
          </PrimaryButton>
          <View style={styles.heroActionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${featured.route} 알림 수정`}
              onPress={() => onEditAlert(featured)}
              style={({ pressed }) => [styles.heroActionButton, pressed && styles.pressed]}
            >
              <Pencil size={15} color={colors.white} />
              <Text style={styles.heroActionText}>수정</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${featured.route} 알림 ${renderStatusLabel(featured)}`}
              onPress={() => onToggleStatus(featured)}
              style={({ pressed }) => [styles.heroActionButton, pressed && styles.pressed]}
            >
              {renderStatusIcon(featured, colors.white)}
              <Text style={styles.heroActionText}>{renderStatusLabel(featured)}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.emptyStateCard}>
          <Radar size={24} color={colors.teal} />
          <Text style={styles.emptyStateTitle}>아직 저장된 알림이 없어요</Text>
          <Text style={styles.emptyStateBody}>첫 항공권 조건을 만들면 Supabase에 저장하고 여기에서 추적 상태를 보여줍니다.</Text>
        </View>
      )}

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

      {alerts.length > 1 ? (
        <View style={styles.listBlock}>
          {alerts.slice(1, 4).map((alert) => (
            <View key={alert.id} style={styles.compactDeal}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${alert.route} 상세 보기`}
                onPress={() => go("detail", alert)}
                style={({ pressed }) => [styles.compactDealMain, pressed && styles.pressed]}
              >
                <View style={styles.compactDealCopy}>
                  <Text style={styles.airportCode}>{alert.city}</Text>
                  <Text style={styles.compactRoute}>{alert.route}</Text>
                </View>
                <Text style={styles.compactPrice}>{alert.price.replace(",000", "k").replace("₩", "₩")}</Text>
              </Pressable>
              <View style={styles.compactDealActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${alert.route} 알림 수정`}
                  onPress={() => onEditAlert(alert)}
                  style={({ pressed }) => [styles.compactActionButton, pressed && styles.pressed]}
                >
                  <Pencil size={14} color={colors.teal} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${alert.route} 알림 ${renderStatusLabel(alert)}`}
                  onPress={() => onToggleStatus(alert)}
                  style={({ pressed }) => [styles.compactActionButton, pressed && styles.pressed]}
                >
                  {renderStatusIcon(alert)}
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <PrimaryButton onPress={() => go("create")} icon={<Plus size={18} color={colors.white} />}>
        새 가격 알림 만들기
      </PrimaryButton>
    </ScrollView>
  );
}
