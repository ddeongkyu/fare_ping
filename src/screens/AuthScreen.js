import { LockKeyhole, LogIn, Mail, UserPlus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { PrimaryButton, ScreenHeader } from "../components/ui";
import { colors } from "../theme/colors";
import { styles } from "../theme/styles";

export function AuthScreen({ go, onSubmit, busy, message, error, isConfigured }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isSignup = mode === "signup";
  const canSubmit = isConfigured && email.trim().length > 3 && password.length >= 6 && !busy;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({ mode, email: email.trim(), password });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
      <ScreenHeader title={isSignup ? "회원가입" : "로그인"} onBack={() => go("home")} />

      <View style={styles.authCard}>
        <View style={styles.authHeroIcon}>
          {isSignup ? <UserPlus size={24} color={colors.teal} /> : <LogIn size={24} color={colors.teal} />}
        </View>
        <Text style={styles.authTitle}>{isSignup ? "FarePing 계정 만들기" : "FarePing에 로그인"}</Text>
        <Text style={styles.authBody}>
          로그인하면 만든 가격 알림이 Supabase에 저장되고, 다른 기기에서도 이어서 볼 수 있어요.
        </Text>

        {!isConfigured ? (
          <View style={styles.validationBox}>
            <Text style={styles.validationText}>Supabase 환경값이 필요합니다. `.env` 설정을 확인해 주세요.</Text>
          </View>
        ) : null}

        {message ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{message}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.validationBox}>
            <Text style={styles.validationText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>이메일</Text>
          <View style={styles.textInputShell}>
            <Mail size={16} color={colors.teal} />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#9aa5ad"
              style={styles.textInput}
              value={email}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>비밀번호</Text>
          <View style={styles.textInputShell}>
            <LockKeyhole size={16} color={colors.teal} />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setPassword}
              placeholder="6자 이상"
              placeholderTextColor="#9aa5ad"
              secureTextEntry
              style={styles.textInput}
              value={password}
            />
          </View>
        </View>

        <PrimaryButton
          disabled={!canSubmit}
          icon={isSignup ? <UserPlus size={18} color={colors.white} /> : <LogIn size={18} color={colors.white} />}
          onPress={submit}
        >
          {busy ? "처리 중" : isSignup ? "회원가입" : "로그인"}
        </PrimaryButton>

        <Pressable
          accessibilityRole="button"
          onPress={() => setMode(isSignup ? "signin" : "signup")}
          style={({ pressed }) => [styles.authToggle, pressed && styles.pressed]}
        >
          <Text style={styles.authToggleText}>
            {isSignup ? "이미 계정이 있어요. 로그인" : "계정이 없어요. 회원가입"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
