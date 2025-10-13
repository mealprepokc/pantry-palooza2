import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const body = await req.json();
    const { seasonings = [], vegetables = [], entrees = [], pastas = [], equipment = [], filters = {} } = body || {};
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

    const ingredientsList = [
      ...seasonings,
      ...vegetables,
      ...entrees,
      ...pastas,
    ].join(', ');

    const equipmentList = equipment.join(', ');

    const strictnessNote = mode === 'strict'
      ? `STRICT mode: Only use ingredients from the provided list (plus basic pantry staples like salt, pepper, oil, water). Do NOT introduce other ingredients.`
      : `LOOSE mode: Prefer the provided ingredients, but you may introduce reasonable additions or substitutes if they significantly improve the dish. Keep added items minimal and practical.`;

    const timeNote = maxTimeMinutes && Number(maxTimeMinutes) > 0
      ? `Target total cooking time for each dish: at most ${maxTimeMinutes} minutes.`
      : `No hard time limit; choose appropriate times.`;

    const mealGuidance = mealType === 'Breakfast'
      ? `Breakfast guidance: Favor quick, lighter preparations. Prefer eggs, dairy, breads, grains, fruits, and produce (e.g., omelets, breakfast bowls, toasts, yogurt parfaits, pancakes). Keep flavors bright and morning-appropriate.`
      : mealType === 'Lunch'
      ? `Lunch guidance: Aim for balanced, portable or quick dishes (salads, bowls, sandwiches, wraps, pastas). Use produce heavily; proteins can be lighter. Avoid heavy dinner-style stews unless clearly lunch-appropriate.`
      : `Dinner guidance: Heartier mains welcome. Favor proteins with sides, pastas, grains. Depth of flavor (roasting, searing, sauces) is encouraged while respecting the time constraint.`;

    const prompt = `You are a creative chef AI. Generate exactly 10 unique and delicious ${mealType.toLowerCase()} dish ideas based on the following. Prioritize using the provided ingredients list.

Available Ingredients: ${ingredientsList}
Available Equipment: ${equipmentList || 'Any'}
Servings: ${servings}
${timeNote}
${strictnessNote}
${mealGuidance}

For each dish, provide:
1. A creative and appetizing dish title
2. The cuisine type (e.g., Italian, Asian, Mexican, American, Mediterranean)
3. Approximate cooking time formatted strictly as "NN mins" (numeric minutes only, e.g., "20 mins", "45 mins")
4. A complete list of ingredients with MEASUREMENTS and UNITS, scaled for ${servings} servings (e.g., "2 cups chopped spinach", "1 lb chicken breast", "1 tbsp olive oil") while respecting the strictness rule
5. Detailed step-by-step preparation and cooking instructions, broken into an array of 4-6 clear steps
6. A calories_per_serving number (estimated kcal per serving)

Return the response strictly as a JSON object of the form {
  "dishes": [
    {
      "title": "Dish Name",
      "cuisine_type": "Cuisine Type",
      "cooking_time": "30 mins",
      "ingredients": ["2 cups ...", "1 lb ...", ...],
      "instructions": ["Step 1", "Step 2", ...],
      "calories_per_serving": 520
    }
  ]
} where the dishes array contains exactly 10 entries.

Make sure the dishes are creative, practical, and use the available equipment when relevant. Include cooking temperatures where relevant.`;

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
        temperature: 0.8,
        max_tokens: 6000,
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
                  minItems: 10,
                  maxItems: 10,
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
      throw new Error('OpenAI API request failed');
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

    return new Response(
      JSON.stringify({ dishes: dishesWithCost }),
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
