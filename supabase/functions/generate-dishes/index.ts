import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const { seasonings, vegetables, entrees, pastas, equipment } = body;

    console.log('Received request:', { seasonings, vegetables, entrees, pastas, equipment });

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

    const prompt = `You are a creative chef AI. Generate exactly 5 unique and delicious dish ideas based on the following:\n\nAvailable Ingredients: ${ingredientsList}\nAvailable Equipment: ${equipmentList}\n\nFor each dish, provide:\n1. A creative and appetizing dish title\n2. The cuisine type (e.g., Italian, Asian, Mexican, American, Mediterranean)\n3. Approximate cooking time (e.g., "20 mins", "45 mins", "1 hour")\n4. A complete list of ingredients including the provided ingredients PLUS common pantry staples (oil, butter, flour, sugar, etc.)\n5. Detailed step-by-step preparation and cooking instructions\n\nReturn the response as a JSON array with exactly 5 dishes. Each dish should have this structure:\n{\n  "title": "Dish Name",\n  "cuisine_type": "Cuisine Type",\n  "cooking_time": "30 mins",\n  "ingredients": ["ingredient 1", "ingredient 2", ...],\n  "instructions": "Detailed step-by-step instructions..."\n}\n\nMake sure the dishes are creative, practical, and use the available equipment. Include cooking times and temperatures where relevant in the instructions.`;

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
            content: 'You are a helpful chef assistant that creates practical, delicious recipes. Always respond with valid JSON arrays.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 3000,
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

    const dishes = JSON.parse(content);

    return new Response(
      JSON.stringify({ dishes }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating dishes:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate dishes', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
