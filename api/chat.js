export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GROQ_API_KEY no configurada" });
  }

  try {
    const { system, messages } = req.body;

    // Groq usa formato OpenAI — agregar system message al inicio
    const groqMessages = [];
    if (system) {
      groqMessages.push({ role: "system", content: system });
    }
    groqMessages.push(...messages);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1000,
        temperature: 0.7,
        messages: groqMessages,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Groq error:", data.error);
      return res.status(500).json({ error: data.error.message });
    }

    // Convertir respuesta Groq → formato compatible con el frontend
    const text = data.choices?.[0]?.message?.content || "";
    res.status(200).json({
      content: [{ type: "text", text }],
    });
  } catch (err) {
    console.error("Chat API error:", err);
    res.status(500).json({ error: err.message });
  }
}