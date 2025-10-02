// Netlify Function: Proxy OpenAI requests server-side to keep OPENAI_API_KEY secret
// Set OPENAI_API_KEY in Netlify dashboard (Site settings -> Environment variables)

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server misconfiguration: OPENAI_API_KEY not set' }),
    };
  }

  try {
    const url = 'https://api.openai.com/v1/chat/completions';
    const body = event.body ? JSON.parse(event.body) : {};

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await resp.text();

    return {
      statusCode: resp.status,
      headers: { 'Content-Type': resp.headers.get('content-type') || 'application/json' },
      body: data,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'OpenAI proxy error', details: String(err) }),
    };
  }
};
