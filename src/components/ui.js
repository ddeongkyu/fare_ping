import { ChevronLeft } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { styles } from "../theme/styles";

export function IconButton({ children, onPress, tone = "default", label }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        tone === "soft" && styles.iconButtonSoft,
        pressed && styles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function PrimaryButton({ children, disabled = false, icon, onPress, tone = "teal" }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        tone === "white" && styles.whiteButton,
        disabled && styles.primaryButtonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.primaryButtonText,
          tone === "white" && styles.whiteButtonText,
          disabled && styles.primaryButtonTextDisabled,
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

export function ScreenHeader({ kicker, title, right, onBack }) {
  if (onBack) {
    return (
      <View style={styles.compactHeader}>
        <IconButton onPress={onBack} label="뒤로 가기">
          <ChevronLeft size={20} color={colors.ink} />
        </IconButton>
        <Text style={styles.compactHeaderTitle}>{title}</Text>
        {right || <View style={styles.headerSpacer} />}
      </View>
    );
  }

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.kicker}>{kicker}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

export function HeaderStatusPill({ icon, children }) {
  return (
    <View style={styles.headerStatusPill}>
      {icon}
      <Text style={styles.headerStatusText}>{children}</Text>
    </View>
  );
}

export function Field({ label, value, icon }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {icon}
      </View>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

export function InfoCard({ label, value }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}
