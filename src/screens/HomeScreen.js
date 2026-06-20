import { Plane, Plus, Radar } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

import { HeaderStatusPill, PrimaryButton, ScreenHeader } from "../components/ui";
import { appConfig } from "../config/appConfig";
import { chartBars } from "../data/flightData";
import { colors } from "../theme/colors";
import { styles } from "../theme/styles";

export function HomeScreen({ go, alerts }) {
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
