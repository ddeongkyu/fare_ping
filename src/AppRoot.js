import { Radar } from "lucide-react-native";
import { useRef, useState } from "react";
import { Animated, Easing, Platform, Text, View } from "react-native";

import { AppShell } from "./components/AppShell";
import { appConfig } from "./config/appConfig";
import { initialAlerts } from "./data/flightData";
import { createFlightAlert } from "./domain/flightAlerts";
import { BottomNav } from "./navigation/BottomNav";
import { CreateAlertScreen } from "./screens/CreateAlertScreen";
import { DetailScreen } from "./screens/DetailScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { NotificationsScreen } from "./screens/NotificationsScreen";
import { colors } from "./theme/colors";
import { styles } from "./theme/styles";

const screenOrder = {
  home: 0,
  create: 1,
  detail: 2,
  notifications: 3,
};

export default function AppRoot() {
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
