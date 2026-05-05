export default async function handler(req, res) {
  // Configuración CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message } = req.body;

    // Vapi.ai Server URL Webhook Structure (Ejemplo)
    if (message && message.type === 'call-report') {
      const callId = message.call.id;
      const transcript = message.transcript;
      const recordingUrl = message.recordingUrl;
      const status = message.call.status;
      
      console.log(`Llamada Finalizada [${callId}]: ${status}`);
      
      // Aquí se conectará con Supabase para guardar el registro de la llamada
      // await supabase.from('llamadas_ia').insert([...])

      return res.status(200).json({ success: true, status: 'Report received' });
    }

    // Function calling from Vapi (Ejemplo: Agendar Cita)
    if (message && message.type === 'function-call') {
      const { functionName, args } = message.functionCall;
      
      if (functionName === 'agendar_cita') {
        const { paciente_id, fecha, objetivo } = args;
        console.log(`IA intentando agendar cita para ${paciente_id} el ${fecha}`);
        
        // Simular éxito para la IA
        return res.status(200).json({
          results: [{
            toolCallId: message.toolCallId,
            result: `Cita agendada exitosamente para el ${fecha}.`
          }]
        });
      }
    }

    return res.status(200).json({ status: 'Received but not processed' });
  } catch (error) {
    console.error('Error in Voice Webhook:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
