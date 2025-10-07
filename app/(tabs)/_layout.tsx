import React, { useEffect, useState } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { ChefHat, BookMarked } from 'lucide-react-native';
import OpenBook from '@/assets/icons/OpenBook';
import AccountIcon from '@/assets/icons/Account';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function TabLayout() {
  const { user, loading } = useAuth();
  const [shoppingBadge, setShoppingBadge] = useState(0);

  useEffect(() => {
    if (!user) {
      setShoppingBadge(0);
      return;
    }
    const load = async () => {
      const [{ data: saved }, { data: lib }] = await Promise.all([
        supabase.from('saved_dishes').select('ingredients').eq('user_id', user.id),
        supabase.from('user_library').select('*').eq('user_id', user.id).maybeSingle(),
      ]);
      const library = (lib as any) || {};
      const libSet = new Set<string>();
      Object.values(library).forEach((arr: any) => {
        if (Array.isArray(arr)) arr.forEach((x: string) => libSet.add(String(x || '').trim().toLowerCase()));
      });
      const norm = (s: string) => String(s || '').trim().toLowerCase();
      const simpleMatch = (a: string, b: string) => {
        const aa = norm(a).replace(/s\b/, '');
        const bb = norm(b).replace(/s\b/, '');
        return aa === bb || aa.includes(bb) || bb.includes(aa);
      };
      const needed = new Set<string>();
      (saved as any[] || []).forEach((row) => {
        (row.ingredients || []).forEach((ing: string) => {
          const inLib = Array.from(libSet).some((l) => simpleMatch(ing, l));
          if (!inLib) needed.add(ing);
        });
      });
      setShoppingBadge(needed.size);
    };
    load();

    // Realtime updates: recompute badge when saved_dishes or user_library change
    const channel = supabase
      .channel('shopping-badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'saved_dishes', filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_library', filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch (_) {}
    };
  }, [user?.id]);

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
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ size, color, focused }) => (
            <AccountIcon size={size} color={color} active={focused} badgeCount={shoppingBadge} />
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
    backgroundColor: '#FFF4ED',
  },
});
