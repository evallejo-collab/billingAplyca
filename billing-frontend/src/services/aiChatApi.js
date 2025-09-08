import { supabase } from '../config/supabase';

// Direct OpenAI API call using fetch (no SDK needed)
const callOpenAI = async (messages) => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  return await response.json();
};

export const processAIQuery = async (message, userId) => {
  try {
    // Check if OpenAI API key is available
    if (!import.meta.env.VITE_OPENAI_API_KEY) {
      return {
        success: false,
        error: 'El servicio de IA no está disponible. Usando respuestas básicas.'
      };
    }

    // Get relevant data from database based on the message context
    const context = await getRelevantData(message, userId);
    
    // Create system prompt with context
    const systemPrompt = `Eres un asistente especializado en el sistema de gestión de Aplyca. 
    Ayudas a los usuarios con consultas sobre tiempo registrado, contratos, clientes y proyectos.
    
    Contexto del usuario:
    ${JSON.stringify(context, null, 2)}
    
    Instrucciones de formato:
    - Responde en español de forma clara y concisa
    - Usa listas numeradas (1. 2. 3.) para pasos secuenciales
    - Usa viñetas (• ) para listas simples
    - Separa párrafos con saltos de línea dobles
    - Usa **texto** para destacar elementos importantes
    - Mantén respuestas estructuradas y profesionales
    
    Instrucciones de contenido:
    - Si no tienes suficiente información, pide aclaraciones
    - Proporciona datos específicos cuando sea posible
    - Sé amigable y profesional
    - Para crear elementos, usa pasos numerados claros
    - Si la consulta no está relacionada con el sistema, redirige educadamente
    
    Para acciones de creación, usa EXACTAMENTE este formato:

**Para crear un [elemento]:**

1. Ve a la sección "[Sección]" en el menú
2. Haz clic en "[Botón específico]"
3. Completa la información requerida
4. Guarda los cambios

Ejemplo de respuesta correcta:
**Para crear un nuevo cliente:**

1. Ve a la sección "Clientes" en el menú principal
2. Haz clic en el botón "Nuevo Cliente" 
3. Completa la información requerida (nombre, email, empresa)
4. Guarda el cliente
    
    Ejemplos:
    - Crear cliente → "Clientes" → "Nuevo Cliente"
    - Crear contrato → "Contratos" → "Nuevo Contrato"  
    - Crear proyecto → "Proyectos" → "Nuevo Proyecto"
    - Registrar tiempo → "Registro de Tiempo" → "Nueva Entrada"`;

    // Call OpenAI API directly
    const response = await callOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ]);

    return {
      success: true,
      response: response.choices[0].message.content
    };

  } catch (error) {
    return {
      success: false,
      error: 'Lo siento, ocurrió un error procesando tu consulta. Inténtalo de nuevo.'
    };
  }
};

const getRelevantData = async (message, userId) => {
  const context = {};
  
  try {
    // Determine what data to fetch based on message content
    const messageTokens = message.toLowerCase();
    
    // Get user's recent time entries - skip if schema issues
    if (messageTokens.includes('tiempo') || messageTokens.includes('horas') || messageTokens.includes('registr')) {
      try {
        // Try different possible column names for user reference
        let timeEntries = null;
        
        // First try with 'created_by' (most likely)
        try {
          const { data, error } = await supabase
            .from('time_entries')
            .select('*')
            .eq('created_by', userId)
            .limit(10)
            .order('created_at', { ascending: false });
          
          if (!error) timeEntries = data;
        } catch (e) {
          // Try with 'employee_id' if created_by doesn't work
          try {
            const { data, error } = await supabase
              .from('time_entries')
              .select('*')
              .eq('employee_id', userId)
              .limit(10)
              .order('created_at', { ascending: false });
              
            if (!error) timeEntries = data;
          } catch (e2) {
            // Schema not compatible, skip time entries
          }
        }
        
        context.recent_time_entries = timeEntries || [];
      } catch (error) {
        context.recent_time_entries = [];
      }
    }

    // Get contracts if mentioned
    if (messageTokens.includes('contrato') || messageTokens.includes('contract')) {
      try {
        const { data: contracts, error } = await supabase
          .from('contracts')
          .select('*, client:clients(name)')
          .limit(10)
          .order('created_at', { ascending: false });
        
        context.contracts = contracts || [];
      } catch (error) {
        context.contracts = [];
      }
    }

    // Get clients if mentioned
    if (messageTokens.includes('cliente') || messageTokens.includes('client')) {
      try {
        const { data: clients, error } = await supabase
          .from('clients')
          .select('id, name, email, company')
          .limit(10)
          .order('created_at', { ascending: false });
        
        context.clients = clients || [];
      } catch (error) {
        context.clients = [];
      }
    }

    // Get projects if mentioned
    if (messageTokens.includes('proyecto') || messageTokens.includes('project')) {
      try {
        const { data: projects, error } = await supabase
          .from('projects')
          .select('*, client:clients(name)')
          .limit(10)
          .order('created_at', { ascending: false });
        
        context.projects = projects || [];
      } catch (error) {
        context.projects = [];
      }
    }

    // Add current date for time-based queries
    context.current_date = new Date().toISOString();
    
    return context;
  } catch (error) {
    return context;
  }
};

// Fallback responses for when AI is not available
export const getFallbackResponse = (message) => {
  const messageTokens = message.toLowerCase();
  
  // Creation commands
  if (messageTokens.includes('crear') || messageTokens.includes('nuevo') || messageTokens.includes('agregar')) {
    if (messageTokens.includes('cliente')) {
      return "Para crear un nuevo cliente:\n1. Ve a la sección 'Clientes' en el menú\n2. Click en el botón 'Nuevo Cliente'\n3. Completa la información requerida (nombre, email, empresa, etc.)\n4. Guarda el cliente";
    }
    if (messageTokens.includes('contrato')) {
      return "Para crear un nuevo contrato:\n1. Ve a 'Contratos' → 'Nuevo Contrato'\n2. Selecciona el cliente\n3. Completa los detalles del contrato\n4. Agrega el enlace de Google Drive si tienes el documento";
    }
    if (messageTokens.includes('proyecto')) {
      return "Para crear un proyecto:\n1. Ve a 'Proyectos' → 'Nuevo Proyecto'\n2. Asigna cliente y contrato\n3. Define el alcance y fechas\n4. Guarda el proyecto";
    }
    return "Puedo ayudarte a crear clientes, contratos o proyectos. ¿Qué específicamente quieres crear?";
  }
  
  if (messageTokens.includes('tiempo') || messageTokens.includes('horas')) {
    return "Para consultar tu tiempo registrado, ve a la sección 'Registro de Tiempo' en el menú principal. Ahí podrás ver todas tus entradas de tiempo organizadas por fecha y proyecto.";
  }
  
  if (messageTokens.includes('contrato')) {
    return "Puedes revisar todos los contratos en la sección 'Contratos' del menú. Ahí encontrarás información sobre contratos activos, vencidos y sus detalles.";
  }
  
  if (messageTokens.includes('cliente')) {
    return "Para información sobre clientes, dirígete a la sección 'Clientes' donde puedes ver todos los clientes registrados y sus detalles de contacto.";
  }
  
  if (messageTokens.includes('proyecto')) {
    return "Los proyectos están organizados en la sección 'Proyectos' del menú principal. Ahí puedes ver el estado de cada proyecto y sus métricas.";
  }
  
  return "¡Hola! Puedo ayudarte con consultas sobre tiempo registrado, contratos, clientes y proyectos. También puedo guiarte para crear nuevos elementos. ¿Qué necesitas?";
};