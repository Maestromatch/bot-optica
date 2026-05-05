export default async function handler(req, res) {
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Falta la imagen (imageBase64)' });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY no configurada' });
    }

    const payload = {
      model: "llama-3.2-11b-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analiza esta imagen de una receta óptica y extrae la información. Extrae: Fecha de emisión de la receta, Ojo Derecho (OD) [Esfera, Cilindro, Eje], Ojo Izquierdo (OI) [Esfera, Cilindro, Eje], y Distancia Pupilar (DP) o Adición si están presentes. Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura: {\"fecha\": \"\", \"OD\": {\"esfera\": \"\", \"cilindro\": \"\", \"eje\": \"\"}, \"OI\": {\"esfera\": \"\", \"cilindro\": \"\", \"eje\": \"\"}, \"adicion\": \"\", \"dp\": \"\"}. No devuelvas ningún texto extra, solo el JSON puro."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 1024,
    };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || "Error en Groq API");
    }

    const rawContent = data.choices[0].message.content;
    
    // Limpiar el JSON si viene con bloque de código markdown
    let jsonString = rawContent;
    if (jsonString.includes('```')) {
      jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    const parsedJson = JSON.parse(jsonString);

    res.status(200).json({ success: true, data: parsedJson });
  } catch (error) {
    console.error("Error en vision OCR:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
