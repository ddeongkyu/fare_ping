import { BellRing, Clock3, TrendingDown } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

import { HeaderStatusPill, ScreenHeader } from "../components/ui";
import { alertToNotification, getNotificationSummary } from "../domain/flightAlerts";
import { colors } from "../theme/colors";
import { styles } from "../theme/styles";

export function NotificationsScreen({ go, alerts }) {
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
