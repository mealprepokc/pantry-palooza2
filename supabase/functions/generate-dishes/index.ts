import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.45.3";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    let body: any = null;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('Invalid JSON body:', parseError);
      return new Response(
        JSON.stringify({ error: 'invalid_request', message: 'Request body must be valid JSON.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    const { seasonings = [], vegetables = [], entrees = [], pastas = [], equipment = [], filters = {}, userId, forceRefresh = false } = body || {};
    const { mealType = 'Dinner', servings = 2, maxTimeMinutes = null, mode = 'strict' } = filters as {
      mealType?: 'Breakfast' | 'Lunch' | 'Dinner';
      servings?: number;
      maxTimeMinutes?: number | null;
      mode?: 'strict' | 'loose';
    };

    console.log('Received request:', { seasonings, vegetables, entrees, pastas, equipment, filters: { mealType, servings, maxTimeMinutes, mode } });

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      console.error('OpenAI API key is missing');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your Supabase edge function secrets.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Supabase service credentials missing');
      return new Response(
        JSON.stringify({ error: 'Service configuration missing' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const normalizeArray = (values: unknown[]): string[] =>
      (Array.isArray(values) ? values : [])
        .map((entry) => String(entry || '').trim().toLowerCase())
        .filter((entry) => entry.length > 0)
        .sort((a, b) => a.localeCompare(b));

    const normalizedSeasonings = normalizeArray(seasonings);
    const normalizedVegetables = normalizeArray(vegetables);
    const normalizedEntrees = normalizeArray(entrees);
    const normalizedPastas = normalizeArray(pastas);
    const normalizedEquipment = normalizeArray(equipment);

    const requestFingerprint = {
      seasonings: normalizedSeasonings,
      vegetables: normalizedVegetables,
      entrees: normalizedEntrees,
      pastas: normalizedPastas,
      equipment: normalizedEquipment,
      mealType,
      servings,
      mode,
      dietary: filters?.dietary ?? null,
      maxTimeMinutes: maxTimeMinutes ?? null,
    };

    const requestHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(requestFingerprint)));
    const requestHashHex = Array.from(new Uint8Array(requestHash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const ingredientsList = [
      ...normalizedSeasonings,
      ...normalizedVegetables,
      ...normalizedEntrees,
      ...normalizedPastas,
    ].join(', ');

    const equipmentList = normalizedEquipment.join(', ');

    const strictnessNote = mode === 'strict'
      ? 'STRICT mode: Only use listed ingredients plus basic pantry staples (salt, pepper, oil, water).'
      : 'LOOSE mode: Prefer listed ingredients; minor sensible additions allowed.';

    const timeNote = maxTimeMinutes && Number(maxTimeMinutes) > 0
      ? `Max cooking time: ${maxTimeMinutes} minutes.`
      : 'Choose practical cooking times.';

    const mealGuidance = mealType === 'Breakfast'
      ? 'Keep flavors bright and morning friendly.'
      : mealType === 'Lunch'
      ? 'Favor balanced, portable or quick dishes.'
      : 'Heartier mains welcome with satisfying sides.';

    const prompt = `Generate exactly 5 unique ${mealType.toLowerCase()} dishes using primarily the provided ingredients.

ingredients: [${ingredientsList}]
equipment: [${equipmentList || 'any'}]
servings: ${servings}
mode: ${strictnessNote}
time: ${timeNote}
guidance: ${mealGuidance}

Each dish must include:
1. Title.
2. Cuisine type.
3. Cooking time formatted "NN mins".
4. Ingredient list of concise strings with measurements.
5. 3-4 instruction steps, each <= 20 words.
6. calories_per_serving (integer).

Respond with JSON only.`;

    const applyRateLimit = async () => {
      if (!userId) return { allowed: true, reason: null };
      const windowMinutes = 60;
      const maxRequests = 6;
      const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

      const { data, error } = await supabaseAdmin
        .from('user_generation_events')
        .select('id, created_at')
        .eq('user_id', userId)
        .gte('created_at', cutoff);

      if (error) {
        console.warn('Rate limit lookup failed', error);
        return { allowed: true, reason: null };
      }

      if ((data?.length || 0) >= maxRequests) {
        return { allowed: false, reason: `Limit ${maxRequests} per ${windowMinutes} minutes reached.` };
      }

      const insertResult = await supabaseAdmin
        .from('user_generation_events')
        .insert({ user_id: userId, request_hash: requestHashHex });

      if (insertResult.error) {
        console.warn('Failed to record generation event', insertResult.error);
      }

      return { allowed: true, reason: null };
    };

    if (!forceRefresh) {
      const { data: cached, error: cacheError } = await supabaseAdmin
        .from('generated_dish_cache')
        .select('payload, expires_at')
        .eq('user_id', userId)
        .eq('request_hash', requestHashHex)
        .maybeSingle();

      if (cacheError) {
        console.warn('Failed to query cache', cacheError);
      }

      if (cached?.payload && cached.expires_at && new Date(cached.expires_at).getTime() > Date.now()) {
        return new Response(
          JSON.stringify({ dishes: cached.payload, source: 'cache' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    const rateLimit = await applyRateLimit();
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'rate_limit_exceeded', message: rateLimit.reason }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful chef assistant that creates practical, delicious recipes. Always respond with valid JSON following the provided schema.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.6,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'generate_dishes_response',
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['dishes'],
              properties: {
                dishes: {
                  type: 'array',
                  minItems: 5,
                  maxItems: 5,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['title', 'cuisine_type', 'cooking_time', 'ingredients', 'instructions', 'calories_per_serving'],
                    properties: {
                      title: { type: 'string' },
                      cuisine_type: { type: 'string' },
                      cooking_time: { type: 'string' },
                      ingredients: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      instructions: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      calories_per_serving: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API request failed: ${errorText}`);
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const parsed = JSON.parse(content);
    const dishes = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { dishes?: unknown }).dishes)
      ? (parsed as { dishes: unknown[] }).dishes
      : [];

    const normalizeInstructions = (value: unknown): string[] => {
      if (!value) return [];
      if (Array.isArray(value)) {
        return value
          .flatMap((entry) => normalizeInstructions(entry))
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0);
      }
      if (typeof value === 'string') {
        return value
          .split(/\r?\n+/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
      }
      if (typeof value === 'object') {
        const textLike = (value as { steps?: unknown; text?: unknown }).text;
        if (typeof textLike === 'string') return normalizeInstructions(textLike);
        if (Array.isArray((value as { steps?: unknown }).steps)) return normalizeInstructions((value as { steps?: unknown }).steps);
      }
      return [String(value)].filter((entry) => entry.trim().length > 0);
    };

    const sanitizeCalories = (value: unknown): number | null => {
      const num = Number(value);
      if (!Number.isFinite(num)) return null;
      return Math.max(0, Math.round(num));
    };

    const normalizedDishes = (Array.isArray(dishes) ? dishes : [])
      .slice(0, 10)
      .map((dish: Record<string, unknown>) => {
        const ingredients = Array.isArray(dish.ingredients) ? dish.ingredients : [];
        return {
          title: String(dish.title ?? dish.name ?? 'Untitled Dish'),
          cuisine_type: String(dish.cuisine_type ?? dish.cuisineType ?? ''),
          cooking_time: String(dish.cooking_time ?? dish.cook_time ?? dish.cookingTime ?? ''),
          ingredients: ingredients.map((entry) => String(entry)).filter((entry) => entry.trim().length > 0),
          instructions: normalizeInstructions(dish.instructions),
          calories_per_serving: sanitizeCalories(dish.calories_per_serving ?? (dish as any)?.caloriesPerServing ?? (dish as any)?.calories),
        };
      });

    // --- Server-side cost estimation --------------------------------------
    // Lightweight price map ($ per base unit)
    const PRICE_MAP: Record<string, { per: 'lb' | 'unit' | 'cup' | 'tbsp' | 'tsp'; price: number }> = {
      // proteins
      chicken: { per: 'lb', price: 5.0 },
      beef: { per: 'lb', price: 6.5 },
      turkey: { per: 'lb', price: 5.5 },
      pork: { per: 'lb', price: 5.0 },
      salmon: { per: 'lb', price: 9.5 },
      shrimp: { per: 'lb', price: 8.5 },
      tofu: { per: 'lb', price: 3.0 },
      egg: { per: 'unit', price: 0.35 },
      bacon: { per: 'lb', price: 7.0 },
      sausage: { per: 'lb', price: 6.0 },

      // carbs / grains / breads
      rice: { per: 'cup', price: 0.5 },
      pasta: { per: 'cup', price: 0.6 },
      potato: { per: 'unit', price: 0.6 },
      bread: { per: 'unit', price: 0.5 },

      // produce (very approximate per unit or cup)
      tomato: { per: 'unit', price: 0.7 },
      onion: { per: 'unit', price: 0.6 },
      pepper: { per: 'unit', price: 0.8 },
      spinach: { per: 'cup', price: 0.9 },
      lettuce: { per: 'cup', price: 0.7 },
      cucumber: { per: 'unit', price: 0.9 },
      avocado: { per: 'unit', price: 1.5 },
      carrot: { per: 'unit', price: 0.3 },
      broccoli: { per: 'cup', price: 1.0 },
      mushroom: { per: 'cup', price: 1.2 },

      // dairy / condiments
      cheese: { per: 'cup', price: 2.0 },
      milk: { per: 'cup', price: 0.5 },
      yogurt: { per: 'cup', price: 1.0 },
      butter: { per: 'tbsp', price: 0.2 },
      oil: { per: 'tbsp', price: 0.15 },
      oliveoil: { per: 'tbsp', price: 0.2 },
      mayo: { per: 'tbsp', price: 0.15 },
    };

    const UNIT_TO_CUP = { tbsp: 1 / 16, tsp: 1 / 48 } as const; // 16 tbsp per cup; 48 tsp per cup

    function estimateLineCost(line: string): number {
      // Example lines: "2 cups chopped spinach", "1 lb chicken breast", "1 tbsp olive oil", "2 eggs"
      const s = line.toLowerCase();
      // quantity (support fractions like 1/2, decimals, whole numbers)
      const qtyMatch = s.match(/(?:(\d+\s+)?(\d+\/\d+)|\d+\.\d+|\d+)/);
      let qty = 1;
      if (qtyMatch) {
        const raw = qtyMatch[0].trim();
        if (raw.includes('/')) {
          const [a, b] = raw.split('/').map(Number);
          qty = b ? a / b : 1;
        } else {
          qty = parseFloat(raw);
        }
      }

      // units
      let unit: 'lb' | 'unit' | 'cup' | 'tbsp' | 'tsp' | null = null;
      if (/(\blb\b|pound)/.test(s)) unit = 'lb';
      else if (/\bcup\b|\bcups\b/.test(s)) unit = 'cup';
      else if (/\btbsp\b|tablespoon/.test(s)) unit = 'tbsp';
      else if (/\btsp\b|teaspoon/.test(s)) unit = 'tsp';
      else if (/\begg\b|\beggs\b|\bclove\b|\bcloves\b|\bcan\b|\bcans\b|\bloaf\b|\bslice\b/.test(s)) unit = 'unit';

      // commodity keyword
      const keys = Object.keys(PRICE_MAP);
      const hit = keys.find((k) => s.includes(k) || s.includes(k.replace('oliveoil', 'olive oil')));
      if (!hit) {
        // fallback minimal buffer for unknowns
        return 0.2 * qty;
      }

      const base = PRICE_MAP[hit];
      let cost = 0;
      if (base.per === 'lb') {
        // If no lb unit, assume ~0.3 lb per quantity
        const pounds = unit === 'lb' ? qty : qty * 0.3;
        cost = pounds * base.price;
      } else if (base.per === 'unit') {
        cost = qty * base.price;
      } else if (base.per === 'cup') {
        let cups = qty;
        if (unit === 'tbsp') cups = qty * UNIT_TO_CUP.tbsp;
        else if (unit === 'tsp') cups = qty * UNIT_TO_CUP.tsp;
        cost = cups * base.price;
      } else if (base.per === 'tbsp') {
        let tbsp = qty;
        if (unit === 'tsp') tbsp = qty / 3;
        else if (unit === 'cup') tbsp = qty * 16;
        cost = tbsp * base.price;
      } else if (base.per === 'tsp') {
        let tsp = qty;
        if (unit === 'tbsp') tsp = qty * 3;
        else if (unit === 'cup') tsp = qty * 48;
        cost = tsp * base.price;
      }
      return Math.max(0, cost);
    }

    const dishesWithCost = normalizedDishes.map((d) => {
      try {
        const lines: string[] = Array.isArray(d.ingredients) ? d.ingredients : [];
        const total = lines.reduce((sum, line) => sum + estimateLineCost(String(line)), 0);
        const servingsNum = typeof servings === 'number' && servings > 0 ? servings : 2;
        const per = total / servingsNum;
        return {
          ...d,
          total_cost_usd: Math.round(total * 100) / 100,
          cost_per_serving_usd: Math.round(per * 100) / 100,
          servings: servingsNum,
        };
      } catch (_) {
        return { ...d, servings };
      }
    });

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString();

    if (userId) {
      const cachePayload = dishesWithCost.map((dish) => ({ ...dish }));
      const upsertResult = await supabaseAdmin
        .from('generated_dish_cache')
        .upsert(
          {
            user_id: userId,
            cache_key: requestHashHex,
            request_hash: requestHashHex,
            meal_type: mealType,
            servings,
            payload: cachePayload,
            expires_at: expiresAt,
          },
          {
            onConflict: 'user_id,request_hash',
          }
        );

      if (upsertResult.error) {
        console.warn('Failed to upsert cache entry', upsertResult.error);
      }
    }

    return new Response(
      JSON.stringify({ dishes: dishesWithCost, source: 'live' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error generating dishes:', message);
    return new Response(
      JSON.stringify({ error: 'Failed to generate dishes', details: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
