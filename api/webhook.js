import { createClient } from "@supabase/supabase-js";

// Inicializar Supabase en el backend (Serverless)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; // Token de Meta API
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID; // ID del número de WhatsApp

// Prompts Base
const PROMPT_REGISTRADO = (paciente) => `
Eres 'Aukén', el asistente virtual experto de Óptica Visión Clara.
Estás hablando con el paciente ${paciente.nombre} (RUT: ${paciente.rut}).
Tu tono es cálido, profesional y proactivo.
Datos del paciente:
- Última visita: ${paciente.fecha_ultima_visita || 'No registrada'}
- Próximo control: ${paciente.fecha_proximo_control || 'No programado'}
- Receta OD (Ojo Derecho): Esfera ${paciente.od_esfera}, Cilindro ${paciente.od_cilindro}, Eje ${paciente.od_eje}
- Receta OI (Ojo Izquierdo): Esfera ${paciente.oi_esfera}, Cilindro ${paciente.oi_cilindro}, Eje ${paciente.oi_eje}

Objetivo: Atender sus dudas sobre su receta, recordar controles pendientes, e invitar a agendar una evaluación visual computarizada. Sé conversacional y breve, ideal para WhatsApp.
`;

const PROMPT_NUEVO_LEAD = `
Eres 'Aukén', el asistente virtual experto de Óptica GlowVision.
Estás hablando con un número nuevo que no está en nuestra base de datos.
Tus objetivos principales son:
1. Darle la bienvenida EXACTAMENTE con esta frase: "Bienvenido a optica GlowVision :D" y luego presentarte.
2. Si menciona que quiere registrarse, participar en un "operativo" de salud visual, o agendar una cita, debes captar sus datos amablemente.
3. Pídele: Nombre completo, RUT y de qué comuna nos escribe.
4. Una vez que te entregue esos 3 datos, debes responder EXACTAMENTE incluyendo esta etiqueta secreta al final de tu mensaje (reemplazando los datos):
[REGISTER: Nombre Completo | RUT | Comuna]

Ejemplo de respuesta exitosa:
"Bienvenido a optica GlowVision :D. ¡Perfecto Juan! Ya te tengo anotado. Te contactaremos cuando tengamos un operativo en Maipú. [REGISTER: Juan Pérez | 11.222.333-4 | Maipú]"

Mantén respuestas cortas y amables, optimizadas para WhatsApp.
`;

export default async function handler(req, res) {
  // 1. Verificación de Webhook (Requisito de Meta API)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: "Verificación fallida" });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // 2. Extraer el mensaje entrante de WhatsApp
    const body = req.body;
    if (!body.object || !body.entry?.[0]?.changes?.[0]?.value?.messages) {
      return res.status(200).send("No message"); // Responder 200 rápido para que Meta no reintente
    }

    const messageObj = body.entry[0].changes[0].value.messages[0];
    const userPhone = messageObj.from; // Número de teléfono del cliente
    const textMessage = messageObj.text?.body;

    if (!textMessage) return res.status(200).send("Not a text message");

    // 3. Buscar paciente en Supabase
    const { data: paciente } = await supabase
      .from("pacientes")
      .select("*")
      .eq("telefono", userPhone)
      .single();

    // 4. Seleccionar el Prompt adecuado
    const systemPrompt = paciente ? PROMPT_REGISTRADO(paciente) : PROMPT_NUEVO_LEAD;

    // 5. Consultar a Groq (LLM)
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": \`Bearer \${GROQ_API_KEY}\`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: textMessage }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const groqData = await groqResponse.json();
    let aiReply = groqData.choices?.[0]?.message?.content || "Hubo un error al procesar tu mensaje.";

    // 6. Lógica de Captura de Leads (Operativos)
    const registerMatch = aiReply.match(/\\[REGISTER:\s*(.*?)\s*\\|\\s*(.*?)\s*\\|\\s*(.*?)\s*\\]/);
    if (registerMatch && !paciente) {
      const [_, nombre, rut, comuna] = registerMatch;
      
      // Guardar el nuevo lead en Supabase
      await supabase.from("pacientes").insert({
        nombre: nombre.trim(),
        rut: rut.trim(),
        telefono: userPhone,
        notas_clinicas: \`Paciente captado por WhatsApp. Comuna de interés: \${comuna.trim()} (Posible Operativo)\`,
        producto_actual: "Operativo Visual",
        fecha_ultima_visita: new Date().toISOString().split('T')[0]
      });

      // Limpiar la etiqueta secreta antes de enviar el mensaje al cliente
      aiReply = aiReply.replace(/\\[REGISTER:.*\\]/g, "").trim();
    }

    // 7. Enviar la respuesta de vuelta a WhatsApp vía Meta API
    if (WHATSAPP_TOKEN && PHONE_NUMBER_ID) {
      await fetch(`https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: userPhone,
          type: "text",
          text: { body: aiReply }
        })
      });
    }

    // Por ahora solo lo imprimimos en la consola de Vercel para pruebas
    console.log(`Respuesta generada para ${userPhone}: ${aiReply}`);

    // Meta requiere un status 200 rápido para saber que recibimos el mensaje
    res.status(200).send("EVENT_RECEIVED");

  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
