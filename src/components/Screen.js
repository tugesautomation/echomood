import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { containerStyle } from '../theme/dimensions';
import { ui } from '../theme/colors';

export default function Screen({ children, style }) {
  return (
    <SafeAreaView style={styles.outer}>
      <View style={[styles.inner, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: ui.background, alignItems: 'center' },
  inner: { flex: 1, width: '100%', ...containerStyle },
});