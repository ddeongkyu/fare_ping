import { Bell, Home, Plus } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { styles } from "../theme/styles";

export function BottomNav({ screen, go }) {
  const items = [
    { key: "home", label: "홈", icon: Home },
    { key: "create", label: "만들기", icon: Plus },
    { key: "notifications", label: "알림", icon: Bell },
  ];

  return (
    <View style={styles.bottomNav}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = screen === item.key;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            onPress={() => go(item.key)}
            style={({ pressed }) => [styles.navItem, active && styles.navItemActive, pressed && styles.pressed]}
          >
            <Icon size={18} color={active ? colors.teal : colors.muted} />
            <Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
