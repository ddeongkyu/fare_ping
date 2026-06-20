import { Plane, Share as ShareIcon } from "lucide-react-native";
import { Linking, Platform, ScrollView, Share as NativeShare, Text, View } from "react-native";

import { IconButton, InfoCard, PrimaryButton, ScreenHeader } from "../components/ui";
import { initialAlerts } from "../data/flightData";
import { buildAffiliateUrl } from "../services/affiliate";
import { colors } from "../theme/colors";
import { styles } from "../theme/styles";

export function DetailScreen({ selected, go }) {
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
