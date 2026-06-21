import { PauseCircle, Pencil, Plane, PlayCircle, Share as ShareIcon, Trash2 } from "lucide-react-native";
import { Modal, Platform, Pressable, ScrollView, Share as NativeShare, Text, View } from "react-native";
import { useState } from "react";

import { IconButton, InfoCard, PrimaryButton, ScreenHeader } from "../components/ui";
import { initialAlerts } from "../data/flightData";
import { CABIN_LABELS, getConditionSummary, getPassengerSummary } from "../domain/flightAlerts";
import { buildAffiliateUrl } from "../services/affiliate";
import { colors } from "../theme/colors";
import { styles } from "../theme/styles";

export function DetailScreen({ selected, go, onDeleteAlert, onOpenAffiliate, onToggleStatus }) {
  const deal = selected || initialAlerts[1];
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [fromCity, toCity] = deal.route.split(" → ");
  const affiliateUrl = buildAffiliateUrl(deal);
  const isPaused = deal.statusCode === "paused";
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
        <InfoCard label="조건" value={getConditionSummary(deal)} />
        <InfoCard label="목표가" value={deal.target} />
        <InfoCard label="상태" value={deal.status} />
        <InfoCard label="수하물" value={`기내 ${deal.cabinBags} · 위탁 ${deal.checkedBags}`} />
        <InfoCard label="승객" value={getPassengerSummary(deal)} />
      </View>

      <View style={styles.managementCard}>
        <Text style={styles.previewTitle}>알림 관리</Text>
        <Text style={styles.previewBody}>
          {CABIN_LABELS[deal.cabinClass] || "이코노미"} · {deal.tripType === "round" ? "왕복" : "편도"} · 목표가 {deal.target}
        </Text>
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="알림 수정"
            onPress={() => go("create", deal)}
            style={({ pressed }) => [styles.secondaryActionButton, pressed && styles.pressed]}
          >
            <Pencil size={16} color={colors.teal} />
            <Text style={styles.secondaryActionText}>수정</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPaused ? "알림 재개" : "알림 일시정지"}
            onPress={() => onToggleStatus(deal)}
            style={({ pressed }) => [styles.secondaryActionButton, pressed && styles.pressed]}
          >
            {isPaused ? <PlayCircle size={16} color={colors.teal} /> : <PauseCircle size={16} color={colors.teal} />}
            <Text style={styles.secondaryActionText}>{isPaused ? "재개" : "일시정지"}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="알림 삭제"
            onPress={() => setDeleteConfirmVisible(true)}
            style={({ pressed }) => [styles.dangerActionButton, pressed && styles.pressed]}
          >
            <Trash2 size={16} color={colors.coral} />
            <Text style={styles.dangerActionText}>삭제</Text>
          </Pressable>
        </View>
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

      <PrimaryButton onPress={() => onOpenAffiliate(deal, affiliateUrl)} icon={<Plane size={18} color={colors.white} />}>
        Aviasales에서 보기
      </PrimaryButton>

      <Modal animationType="fade" transparent visible={deleteConfirmVisible} onRequestClose={() => setDeleteConfirmVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>알림을 삭제할까요?</Text>
            <Text style={styles.confirmBody}>{deal.route} 가격 알림과 연결된 조건을 목록에서 제거합니다.</Text>
            <View style={styles.confirmActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="삭제 취소"
                onPress={() => setDeleteConfirmVisible(false)}
                style={({ pressed }) => [styles.confirmCancelButton, pressed && styles.pressed]}
              >
                <Text style={styles.confirmCancelText}>취소</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="삭제 확인"
                onPress={() => {
                  setDeleteConfirmVisible(false);
                  onDeleteAlert(deal);
                }}
                style={({ pressed }) => [styles.confirmDeleteButton, pressed && styles.pressed]}
              >
                <Text style={styles.confirmDeleteText}>삭제</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
