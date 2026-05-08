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
Eres 'Aukén', el asistente virtual experto de Óptica Glow Vision. Nuestro slogan es "calidad que inspira".
Estás hablando con el paciente ${paciente.nombre} (RUT: ${paciente.rut}).
Tu tono es cálido, profesional y proactivo. Eres un crack en ventas y atención al cliente.

Información de la Óptica:
- Dirección: Caupolicán #763, Punitaqui.
- Horario de atención: 11:30 a 18:30 hrs.
- Teléfono Humano/Administración: +56 9 5493 2802

Datos del paciente:
- Última visita: ${paciente.fecha_ultima_visita || 'No registrada'}
- Próximo control: ${paciente.fecha_proximo_control || 'No programado'}
- Comuna / Notas: ${paciente.notas_clinicas || 'Sin notas'}

Objetivo: 
1. Saludarlo por su nombre y hacerle sentir especial por ya ser cliente de Glow Vision.
2. Si nos escribe por un operativo, confirma que ya lo tenemos en la base de datos y que le daremos prioridad.
3. Si hace preguntas complejas o médicas que no sabes responder, derívalo amablemente indicando que el equipo humano lo contactará pronto desde nuestro número de administración o pídele que escriba al +56954932802.
4. Recuerda siempre nuestra promoción estrella: "¡Examen visual GRATIS al comprar tus lentes!".
Sé conversacional, empático y breve, ideal para WhatsApp.
`;

const PROMPT_NUEVO_LEAD = `
Eres 'Aukén', el asistente virtual experto de Óptica Glow Vision. Nuestro slogan es "calidad que inspira".
Tu personalidad es cálida, vendedora y muy amable. Hablas de forma concisa y natural, ideal para WhatsApp. Usa emojis sin exagerar.

Información de la Óptica:
- Dirección: Caupolicán #763, Punitaqui.
- Horario de atención: 11:30 a 18:30 hrs.
- Teléfono Humano/Administración: +56 9 5493 2802

Objetivos principales:
1. Dar la bienvenida e informar nuestro GRAN GANCHO comercial: "¡Te damos el Examen Visual totalmente GRATIS si compras tus lentes con nosotros!"
2. El usuario suele escribirnos porque vio un anuncio en Facebook/Instagram sobre un "Operativo Visual" en su comuna.
3. Para reservar su cupo en el operativo, debes captar sus datos amablemente (pídelos poco a poco, no parezcas un robot interrogador): Nombre completo, RUT y de qué comuna nos escribe.
4. Si hacen preguntas complejas (médicas muy específicas o reclamos), derívalos cortésmente indicando que un asesor humano revisará el caso o pídele que escriba directamente a la administración al +56954932802.
5. Una vez que te entregue los 3 datos (Nombre, RUT, Comuna), confírmale que su cupo está asegurado y debes responder EXACTAMENTE incluyendo esta etiqueta secreta al final de tu mensaje (reemplazando los datos):
[REGISTER: Nombre Completo | RUT | Comuna]

Ejemplo de flujo exitoso:
Usuario: Hola, vi el anuncio del operativo.
Aukén: ¡Hola! Bienvenido a Óptica Glow Vision 😎, calidad que inspira. Qué alegría saludarte. Te cuento que tenemos una promoción genial: ¡El examen visual es 100% GRATIS si haces tus lentes con nosotros! 🎉 Para revisar los cupos del operativo, ¿de qué comuna nos escribes?
Usuario: De Punitaqui.
Aukén: ¡Perfecto! Para dejar anotado tu cupo en Punitaqui, ¿me podrías indicar tu nombre completo y RUT por favor?
Usuario: Juan Pérez, 11.222.333-4
Aukén: ¡Súper Juan! Ya te tengo anotado y tu cupo está reservado. Te estaremos avisando la fecha exacta y ubicación unos días antes. ¡Nos vemos en Caupolicán #763! [REGISTER: Juan Pérez | 11.222.333-4 | Punitaqui]
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
    const msgType = messageObj.type;
    let textMessage = "";

    if (msgType === "image") {
      const mediaId = messageObj.image.id;
      // PASOS FUTUROS PARA LECTURA DE RECETAS EN WHATSAPP:
      // 1. Obtener la URL de la imagen usando la API Graph de Meta: GET /v21.0/${mediaId}
      // 2. Descargar la imagen y convertirla a Base64.
      // 3. Pasarla por Groq Vision IA (Llama 3.2 Vision).
      // 4. Extraer Fecha, Esfera, Cilindro, etc.
      // 5. Guardar en la Ficha Clínica del paciente y agendar seguimiento a 12 meses.
      textMessage = "[SISTEMA: El paciente ha enviado una imagen. En futuras versiones la Visión IA la procesará automáticamente.]";
    } else if (msgType === "text") {
      textMessage = messageObj.text?.body;
    } else {
      return res.status(200).send("Not a supported message type");
    }

    if (!textMessage) return res.status(200).send("Empty message");

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
        "Authorization": `Bearer ${GROQ_API_KEY}`,
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
    const registerMatch = aiReply.match(/\[REGISTER:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\]/);
    if (registerMatch && !paciente) {
      const [_, nombre, rut, comuna] = registerMatch;
      
      // Guardar el nuevo lead en Supabase
      await supabase.from("pacientes").insert({
        nombre: nombre.trim(),
        rut: rut.trim(),
        telefono: userPhone,
        notas_clinicas: `Paciente captado por WhatsApp. Comuna de interés: ${comuna.trim()} (Posible Operativo)`,
        producto_actual: "Operativo Visual",
        fecha_ultima_visita: new Date().toISOString().split('T')[0]
      });

      // Limpiar la etiqueta secreta antes de enviar el mensaje al cliente
      aiReply = aiReply.replace(/\[REGISTER:.*\]/g, "").trim();
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
