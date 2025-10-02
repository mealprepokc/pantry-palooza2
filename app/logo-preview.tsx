import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { LogoVariants } from '@/components/LogoVariants';

export default function LogoPreviewScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <LogoVariants />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FB',
  },
});
