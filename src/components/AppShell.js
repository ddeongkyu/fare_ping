import { SafeAreaView, StatusBar, Text, View } from "react-native";

import { styles } from "../theme/styles";

function StatusLine() {
  return (
    <View style={styles.statusLine}>
      <Text style={styles.statusTime}>9:41</Text>
      <View style={styles.statusIcons}>
        <View style={styles.signalDot} />
        <View style={styles.signalDot} />
        <View style={styles.signalDot} />
      </View>
    </View>
  );
}

export function AppShell({ children }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.webStage}>
        <View style={styles.deviceFrame}>
          <StatusLine />
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}
