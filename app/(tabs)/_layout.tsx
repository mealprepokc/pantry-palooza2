import { Tabs, Redirect } from 'expo-router';
import { ChefHat, BookMarked } from 'lucide-react-native';
import OpenBook from '@/assets/icons/OpenBook';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

export default function TabLayout() {
  const { user, loading } = useAuth();

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
          backgroundColor: '#FFF',
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
          tabBarIcon: ({ size, color }) => (
            <OpenBook size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Generate',
          tabBarIcon: ({ size, color }) => (
            <ChefHat size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ size, color }) => (
            <BookMarked size={size} color={color} />
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
});
