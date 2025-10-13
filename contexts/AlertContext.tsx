import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Alert, Platform, ToastAndroid } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type AlertContextValue = {
  shoppingBadge: number;
  shoppingDelta: number;
  cookedDelta: number;
  pendingShopping: boolean;
  pendingCooked: boolean;
  markShoppingSeen: () => void;
  markCookedSeen: () => void;
};

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

const norm = (value: string) => String(value || '').trim().toLowerCase();

const simpleMatch = (a: string, b: string) => {
  const aa = norm(a).replace(/s\b/, '');
  const bb = norm(b).replace(/s\b/, '');
  return aa === bb || aa.includes(bb) || bb.includes(aa);
};

const stripMeasurement = (ing: string): string => {
  if (!ing) return '';
  const withoutBullet = ing.replace(/^[•\-\*\s]+/, '').trim();
  const withoutMeasure = withoutBullet
    .replace(/^[\d\s\/,.-]+(cups?|cup|tablespoons?|tbsp|teaspoons?|tsp|oz|ounce|ounces?|grams?|g|ml|milliliters?|l|liters?|lbs?|pounds?|kg|kilograms?|pinch|cloves?|cans?|pieces?|slices?|heads?|bunch(?:es)?|sticks?|dash|sprigs?|ears?|fillets?|filets?|packages?|pkgs?|bags?|handfuls?|bunches?|links?|strips?|stalks?|leaves?)?\.?\s*/i, '')
    .trim();
  const noParens = withoutMeasure.replace(/\([^)]*\)/g, '').trim();
  const primary = noParens.split(/[;,]/)[0]?.trim() || '';
  if (!primary) return withoutMeasure || withoutBullet || ing;

  const discard = new Set([
    'chopped',
    'fresh',
    'finely',
    'coarsely',
    'roughly',
    'diced',
    'minced',
    'sliced',
    'shredded',
    'grated',
    'optional',
    'softened',
    'peeled',
    'seeded',
    'halved',
    'quartered',
    'divided',
    'plus',
    'more',
    'serving',
    'servings',
    'taste',
    'room',
    'temperature',
    'warm',
    'cold',
    'extra',
    'virgin',
    'drained',
    'rinsed',
    'patted',
    'dry',
    'small',
    'medium',
  ]);

  const words = primary.split(/\s+/).filter(Boolean);
  const filtered = words.filter((word) => !discard.has(word.toLowerCase()));
  const cleaned = filtered.join(' ').trim();
  if (cleaned) return cleaned;
  return words[words.length - 1] || primary || withoutMeasure || withoutBullet || ing;
};

const showNotice = (title: string, message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert(title, message);
  }
};

const showShoppingNotice = (delta: number) => {
  const countLabel = delta <= 1 ? 'new ingredient' : `${delta} new ingredients`;
  const message = `${countLabel} were added to your Shopping List. Open the Shopping tab to review them.`;
  showNotice('Shopping List Updated', message);
};

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [shoppingBadge, setShoppingBadge] = useState(0);
  const [shoppingDelta, setShoppingDelta] = useState(0);
  const [pendingShopping, setPendingShopping] = useState(false);

  const [cookedTotal, setCookedTotal] = useState(0);
  const [cookedDelta, setCookedDelta] = useState(0);
  const [pendingCooked, setPendingCooked] = useState(false);

  const shoppingLastSeenRef = useRef(0);
  const cookedLastSeenRef = useRef(0);
  const shoppingInitializedRef = useRef(false);
  const cookedInitializedRef = useRef(false);
  const shoppingToastShownRef = useRef(false);
  const cookedToastShownRef = useRef(false);

  const handleShoppingCount = useCallback(
    (nextCount: number) => {
      if (!shoppingInitializedRef.current) {
        shoppingInitializedRef.current = true;
        shoppingLastSeenRef.current = nextCount;
        setShoppingBadge(nextCount);
        setShoppingDelta(0);
        setPendingShopping(false);
        shoppingToastShownRef.current = false;
        return;
      }

      if (nextCount < shoppingLastSeenRef.current) {
        shoppingLastSeenRef.current = nextCount;
        setShoppingDelta(0);
        setPendingShopping(false);
        shoppingToastShownRef.current = false;
      } else if (nextCount > shoppingLastSeenRef.current) {
        const delta = nextCount - shoppingLastSeenRef.current;
        setShoppingDelta(delta);
        setPendingShopping(true);
        setShoppingBadge(nextCount);
        if (!shoppingToastShownRef.current) {
          showShoppingNotice(delta);
          shoppingToastShownRef.current = true;
        }
        return;
      }

      setShoppingBadge(nextCount);
    },
    []
  );

  const handleCookedCount = useCallback((nextCount: number) => {
    if (!cookedInitializedRef.current) {
      cookedInitializedRef.current = true;
      cookedLastSeenRef.current = nextCount;
      setCookedTotal(nextCount);
      setCookedDelta(0);
      setPendingCooked(false);
      cookedToastShownRef.current = false;
      return;
    }

    if (nextCount < cookedLastSeenRef.current) {
      cookedLastSeenRef.current = nextCount;
      setCookedDelta(0);
      setPendingCooked(false);
      cookedToastShownRef.current = false;
    } else if (nextCount > cookedLastSeenRef.current) {
      const delta = nextCount - cookedLastSeenRef.current;
      setCookedDelta(delta);
      setPendingCooked(true);
      setCookedTotal(nextCount);
      if (!cookedToastShownRef.current) {
        showNotice('Cooked Dishes Updated', 'You have new dishes in your Cooked list.');
        cookedToastShownRef.current = true;
      }
      return;
    }

    setCookedTotal(nextCount);
  }, []);

  useEffect(() => {
    shoppingInitializedRef.current = false;
    cookedInitializedRef.current = false;
    shoppingLastSeenRef.current = 0;
    cookedLastSeenRef.current = 0;
    shoppingToastShownRef.current = false;
    cookedToastShownRef.current = false;
    setShoppingBadge(0);
    setShoppingDelta(0);
    setPendingShopping(false);
    setCookedTotal(0);
    setCookedDelta(0);
    setPendingCooked(false);

    if (!userId) return;

    let active = true;

    const loadShopping = async () => {
      const [{ data: saved }, { data: lib }] = await Promise.all([
        supabase
          .from('saved_dishes')
          .select('ingredients,suggested_sides')
          .eq('user_id', userId),
        supabase.from('user_library').select('*').eq('user_id', userId).maybeSingle(),
      ]);
      if (!active) return;
      const library = (lib as Record<string, string[]>) || {};
      const libSet = new Set<string>();
      Object.values(library).forEach((arr) => {
        if (Array.isArray(arr)) {
          arr.forEach((item) => libSet.add(norm(item)));
        }
      });

      const needed = new Set<string>();
      const appendIfNeeded = (raw?: string | null) => {
        if (!raw) return;
        const base = stripMeasurement(raw);
        const candidate = base || raw;
        const normalized = norm(candidate);
        if (!normalized) return;
        if (!libSet.size) {
          needed.add(candidate);
          return;
        }
        const exists = Array.from(libSet).some((value) => simpleMatch(candidate, value));
        if (!exists) needed.add(candidate);
      };

      (saved as { ingredients?: string[]; suggested_sides?: string[] }[] | null | undefined)?.forEach((row) => {
        row?.ingredients?.forEach((item) => appendIfNeeded(item));
        row?.suggested_sides?.forEach((item) => appendIfNeeded(item));
      });
      handleShoppingCount(needed.size);
    };

    const loadCooked = async () => {
      const { data } = await supabase
        .from('cooked_dishes')
        .select('id', { head: false, count: 'exact' })
        .eq('user_id', userId);
      if (!active) return;
      const count = Array.isArray(data) ? data.length : 0;
      handleCookedCount(count);
    };

    loadShopping();
    loadCooked();

    const channel = supabase
      .channel(`alerts-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'saved_dishes', filter: `user_id=eq.${userId}` },
        () => loadShopping()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_library', filter: `user_id=eq.${userId}` },
        () => loadShopping()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cooked_dishes', filter: `user_id=eq.${userId}` },
        () => loadCooked()
      )
      .subscribe();

    return () => {
      active = false;
      try {
        supabase.removeChannel(channel);
      } catch {
        /* ignore */
      }
    };
  }, [userId, handleShoppingCount, handleCookedCount]);

  const markShoppingSeen = useCallback(() => {
    shoppingLastSeenRef.current = shoppingBadge;
    setShoppingDelta(0);
    setPendingShopping(false);
    shoppingToastShownRef.current = false;
  }, [shoppingBadge]);

  const markCookedSeen = useCallback(() => {
    cookedLastSeenRef.current = cookedTotal;
    setCookedDelta(0);
    setPendingCooked(false);
    cookedToastShownRef.current = false;
  }, [cookedTotal]);

  const value: AlertContextValue = {
    shoppingBadge,
    shoppingDelta,
    cookedDelta,
    pendingShopping,
    pendingCooked,
    markShoppingSeen,
    markCookedSeen,
  };

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
}

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
};
