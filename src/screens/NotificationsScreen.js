import { BellRing, Clock3, TrendingDown, X } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

import { HeaderStatusPill, ScreenHeader } from "../components/ui";
import { alertToNotification, getNotificationSummary } from "../domain/flightAlerts";
import { colors } from "../theme/colors";
import { styles } from "../theme/styles";

export function NotificationsScreen({ alerts, remoteNotifications, onDismissNotification, onOpenNotification }) {
  const notifications = remoteNotifications || alerts.map(alertToNotification);
  const freshCount = notifications.filter((item) => item.fresh).length;
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
            {freshCount ? `새 알림 ${freshCount}` : "알림 없음"}
          </HeaderStatusPill>
        }
      />

      <View style={styles.notificationList}>
        {notifications.map((item) => (
          <View
            key={item.id}
            style={[
              styles.notificationItem,
              item.fresh && styles.notificationFresh,
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.title} 상세 보기`}
              onPress={() => onOpenNotification(item)}
              style={({ pressed }) => [styles.notificationMain, pressed && styles.pressed]}
            >
              <View style={[styles.notificationIcon, item.fresh && styles.notificationIconFresh]}>
                {renderNotificationIcon(item)}
              </View>
              <View style={styles.notificationCopy}>
                <Text style={styles.notificationTitle}>{item.title}</Text>
                <Text style={styles.notificationSubtitle}>{item.subtitle}</Text>
              </View>
            </Pressable>
            {item.persisted ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.title} 알림 정리`}
                onPress={() => onDismissNotification(item)}
                style={({ pressed }) => [styles.notificationDismissButton, pressed && styles.pressed]}
              >
                <X size={15} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      <View style={styles.notificationSummaryCard}>
        <Text style={styles.notificationSummaryTitle}>최근 업데이트</Text>
        <Text style={styles.notificationSummaryBody}>{getNotificationSummary(notifications)}</Text>
      </View>
    </ScrollView>
  );
}
