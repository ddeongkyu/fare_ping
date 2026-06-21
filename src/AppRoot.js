import { LogIn, LogOut, Radar } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, Text, View } from "react-native";

import { AppShell } from "./components/AppShell";
import { appConfig } from "./config/appConfig";
import { airportOptions, initialAlerts } from "./data/flightData";
import { createFlightAlert } from "./domain/flightAlerts";
import { BottomNav } from "./navigation/BottomNav";
import { AuthScreen } from "./screens/AuthScreen";
import { CreateAlertScreen } from "./screens/CreateAlertScreen";
import { DetailScreen } from "./screens/DetailScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { NotificationsScreen } from "./screens/NotificationsScreen";
import { fetchAirportOptions } from "./services/airportRepository";
import { fetchFareAlerts, saveFareAlert as saveFareAlertRemote } from "./services/fareAlertRepository";
import { ensureUserProfile } from "./services/profileRepository";
import { getSupabaseStatusLabel, isSupabaseConfigured, supabase } from "./services/supabaseClient";
import { colors } from "./theme/colors";
import { styles } from "./theme/styles";

const screenOrder = {
  home: 0,
  create: 1,
  detail: 2,
  notifications: 3,
  auth: 4,
};

function friendlyError(error) {
  return error?.message || "알 수 없는 오류";
}

export default function AppRoot() {
  const [screen, setScreen] = useState("home");
  const [airports, setAirports] = useState(airportOptions);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [selected, setSelected] = useState(initialAlerts[1]);
  const [session, setSession] = useState(null);
  const [syncMessage, setSyncMessage] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [savingAlert, setSavingAlert] = useState(false);
  const transition = useRef(new Animated.Value(1)).current;
  const direction = useRef(1);

  useEffect(() => {
    let active = true;

    fetchAirportOptions()
      .then((nextAirports) => {
        if (active && nextAirports.length) setAirports(nextAirports);
      })
      .catch(() => {
        if (active) setSyncMessage("공항 목록은 로컬 데이터로 표시 중입니다.");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setSyncMessage("Supabase 환경값이 없어서 데모 모드로 실행 중입니다.");
      return undefined;
    }

    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (error && active) setSyncMessage(`세션 확인 실패: ${friendlyError(error)}`);
      if (active) setSession(data?.session || null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setAlerts(initialAlerts);
      setSelected(initialAlerts[1]);
      return undefined;
    }

    let active = true;

    async function loadRemoteAlerts() {
      try {
        await ensureUserProfile(session.user);
        const remoteAlerts = await fetchFareAlerts(session.user.id, airports);

        if (!active) return;

        setAlerts(remoteAlerts);
        setSelected(remoteAlerts[0] || null);
        setSyncMessage(remoteAlerts.length ? "Supabase 알림 동기화 완료" : "저장된 알림이 아직 없어요.");
      } catch (error) {
        if (active) setSyncMessage(`Supabase 동기화 실패: ${friendlyError(error)}`);
      }
    }

    loadRemoteAlerts();

    return () => {
      active = false;
    };
  }, [airports, session?.user]);

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

  const submitAuth = async ({ mode, email, password }) => {
    if (!supabase) {
      setAuthError("Supabase 환경값이 없습니다.");
      return;
    }

    if (password.length < 6) {
      setAuthError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    setAuthBusy(true);
    setAuthError("");
    setAuthMessage("");

    try {
      const result =
        mode === "signup"
          ? await supabase.auth.signUp({ email, password })
          : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) throw result.error;

      if (result.data.session) {
        setSession(result.data.session);
        setAuthMessage("로그인 완료");
        go("home");
        return;
      }

      setAuthMessage("가입 확인 메일을 확인해 주세요. 개발 중에는 Supabase에서 이메일 확인을 끌 수도 있어요.");
    } catch (error) {
      setAuthError(friendlyError(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    if (!supabase || !session?.user) {
      go("auth");
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
    setSyncMessage("로그아웃했습니다. 지금은 데모 알림을 보여줍니다.");
    go("home");
  };

  const saveAlert = async (draft) => {
    const localAlert = createFlightAlert(draft);

    setSavingAlert(true);

    if (!session?.user) {
      setAlerts((current) => [localAlert, ...current]);
      setSyncMessage("로그인 전이라 로컬 미리보기로 저장했습니다.");
      setSavingAlert(false);
      go("notifications", localAlert);
      return;
    }

    try {
      await ensureUserProfile(session.user);
      const remoteAlert = await saveFareAlertRemote(session.user.id, draft, airports);
      const nextAlert = remoteAlert || localAlert;

      setAlerts((current) => [nextAlert, ...current]);
      setSyncMessage("Supabase에 가격 알림을 저장했습니다.");
      go("notifications", nextAlert);
    } catch (error) {
      setAlerts((current) => [localAlert, ...current]);
      setSyncMessage(`Supabase 저장 실패: ${friendlyError(error)}. 로컬 미리보기로 저장했습니다.`);
      go("notifications", localAlert);
    } finally {
      setSavingAlert(false);
    }
  };

  const translateX = transition.interpolate({
    inputRange: [0, 1],
    outputRange: [direction.current * 18, 0],
  });

  return (
    <AppShell>
      <View style={styles.appBrandBar}>
        <View style={styles.brandBarContent}>
          <View style={styles.brandMark}>
            <Radar size={20} color={colors.teal} />
            <Text style={styles.brandText}>{appConfig.brandName}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={session?.user ? "로그아웃" : "로그인"}
            onPress={session?.user ? signOut : () => go("auth")}
            style={({ pressed }) => [styles.accountButton, pressed && styles.pressed]}
          >
            {session?.user ? <LogOut size={14} color={colors.teal} /> : <LogIn size={14} color={colors.teal} />}
            <Text style={styles.accountButtonText}>{session?.user ? "로그아웃" : "로그인"}</Text>
          </Pressable>
        </View>
        <Text style={styles.syncStatusText}>
          {session?.user ? session.user.email : `${getSupabaseStatusLabel()} · 데모 모드`}
        </Text>
        {syncMessage ? <Text style={styles.syncMessageText}>{syncMessage}</Text> : null}
      </View>

      <Animated.View style={[styles.screenSlot, styles.animatedScreen, { opacity: transition, transform: [{ translateX }] }]}>
        {screen === "home" && <HomeScreen go={go} alerts={alerts} />}
        {screen === "create" && <CreateAlertScreen go={go} onSaveAlert={saveAlert} airports={airports} saving={savingAlert} />}
        {screen === "detail" && <DetailScreen selected={selected} go={go} />}
        {screen === "notifications" && <NotificationsScreen go={go} alerts={alerts} />}
        {screen === "auth" && (
          <AuthScreen
            busy={authBusy}
            error={authError}
            go={go}
            isConfigured={isSupabaseConfigured}
            message={authMessage}
            onSubmit={submitAuth}
          />
        )}
      </Animated.View>

      <BottomNav screen={screen} go={go} />
    </AppShell>
  );
}
