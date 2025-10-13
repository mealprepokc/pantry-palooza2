import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { ChefHat, BookMarked } from 'lucide-react-native';
import OpenBook from '@/assets/icons/OpenBook';
import AccountIcon from '@/assets/icons/Account';
import { useAuth } from '@/contexts/AuthContext';
import { useAlerts } from '@/contexts/AlertContext';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

export default function TabLayout() {
  const { user, loading } = useAuth();
  const { shoppingDelta, cookedDelta, pendingShopping, pendingCooked } = useAlerts();
  const accountBadgeCount = (pendingShopping ? shoppingDelta : 0) + (pendingCooked ? cookedDelta : 0);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/auth" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '600',
        },
        tabBarItemStyle: {
          paddingVertical: 6,
        },
        tabBarStyle: {
          backgroundColor: "#FFF",
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          paddingTop: 10,
          paddingBottom: 12,
          height: 72,
        },
      }}>
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <OpenBook size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Generate',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <ChefHat size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <BookMarked size={size} color={color} />
              {pendingCooked ? <View style={styles.alertDot} /> : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ size, color, focused }) => (
            <AccountIcon size={size} color={color} active={focused} badgeCount={accountBadgeCount} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  iconWrap: {
    padding: 6,
    borderRadius: 14,
  },
  iconWrapActive: {
    backgroundColor: "#FFF4ED",
  },
  alertDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B35',
  },
});
