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
    Ayudas a los usuarios con consultas sobre tiempo registrado, contratos, clientes, proyectos y ESPECIALMENTE con datos de facturación y pagos.
    
    Contexto del usuario y datos del sistema:
    ${JSON.stringify(context, null, 2)}
    
    IMPORTANTE para consultas de pagos y deudas:
    - Si te preguntan sobre pagos de un cliente específico, usa los datos del contexto para dar información exacta
    - Para consultas de DEUDA: usa "_total_debt", "_debt_percentage", "_estimated_months_debt"
    - Para MESES DE DEUDA: usa "_estimated_months_debt" si está disponible
    - Menciona números específicos: cantidad de pagos, montos totales, fechas recientes, deuda pendiente
    - Si hay datos de "_payment_count" para un cliente, úsalo
    - Si hay datos de "_total_paid", "_total_debt", conviértelo a formato de moneda colombiana (COP)
    - Siempre incluye el número total de pagos encontrados
    - Para análisis de deuda, incluye: monto total del contrato/proyecto, monto pagado, monto pendiente, porcentaje de deuda
    
    Instrucciones de formato:
    - Responde en español de forma clara y concisa
    - Usa listas numeradas (1. 2. 3.) para pasos secuenciales
    - Usa viñetas (• ) para listas simples
    - Separa párrafos con saltos de línea dobles
    - Usa **texto** para destacar elementos importantes
    - Para montos, usa formato: $X,XXX,XXX COP
    - Mantén respuestas estructuradas y profesionales
    
    Instrucciones de contenido:
    - Si tienes datos específicos en el contexto, úsalos para dar respuestas exactas
    - Proporciona datos específicos cuando sea posible
    - Para consultas de pagos, siempre incluye: número de pagos, monto total si disponible
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

    // Get payments data if mentioned
    if (messageTokens.includes('pago') || messageTokens.includes('payment') || messageTokens.includes('facturación') || messageTokens.includes('billing')) {
      try {
        const { data: payments, error } = await supabase
          .from('payments')
          .select(`
            *,
            contract:contracts(contract_number, client:clients(name, company)),
            project:projects(name, client_name)
          `)
          .limit(50)
          .order('payment_date', { ascending: false });
        
        context.payments = payments || [];
        
        // Group payments by client for easy analysis
        if (payments) {
          const paymentsByClient = {};
          payments.forEach(payment => {
            const clientName = payment.contract?.client?.name || 
                             payment.contract?.client?.company || 
                             payment.project?.client_name || 
                             'Cliente desconocido';
            
            if (!paymentsByClient[clientName]) {
              paymentsByClient[clientName] = {
                totalAmount: 0,
                paymentCount: 0,
                payments: []
              };
            }
            
            paymentsByClient[clientName].totalAmount += parseFloat(payment.amount) || 0;
            paymentsByClient[clientName].paymentCount += 1;
            paymentsByClient[clientName].payments.push(payment);
          });
          
          context.payments_by_client = paymentsByClient;
        }
      } catch (error) {
        context.payments = [];
        context.payments_by_client = {};
      }
    }

    // Get specific client payment data if client name is mentioned
    const clientNames = ['vanti', 'terpel', 'aplyca', 'cliente']; // Add more as needed
    for (const clientName of clientNames) {
      if (messageTokens.includes(clientName.toLowerCase())) {
        try {
          // Get payments for specific client
          const { data: clientPayments, error } = await supabase
            .from('payments')
            .select(`
              *,
              contract:contracts(contract_number, client:clients(name, company)),
              project:projects(name, client_name)
            `)
            .or(`contract.client.name.ilike.%${clientName}%,contract.client.company.ilike.%${clientName}%,project.client_name.ilike.%${clientName}%`)
            .order('payment_date', { ascending: false });
          
          // Get contracts for debt calculation
          const { data: clientContracts, error: contractsError } = await supabase
            .from('contracts')
            .select(`
              *,
              client:clients!inner(name, company)
            `)
            .or(`client.name.ilike.%${clientName}%,client.company.ilike.%${clientName}%`);
          
          // Get projects for debt calculation  
          const { data: clientProjects, error: projectsError } = await supabase
            .from('projects')
            .select('*')
            .ilike('client_name', `%${clientName}%`);
          
          if (clientPayments) {
            context[`${clientName}_payments`] = clientPayments;
            context[`${clientName}_payment_count`] = clientPayments.length;
            context[`${clientName}_total_paid`] = clientPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
          }
          
          if (clientContracts) {
            context[`${clientName}_contracts`] = clientContracts;
            // Calculate total contract value and billed amount
            let totalContractValue = 0;
            let totalBilledAmount = 0;
            
            clientContracts.forEach(contract => {
              const contractValue = (parseFloat(contract.total_hours) || 0) * (parseFloat(contract.hourly_rate) || 0);
              const billedAmount = parseFloat(contract.billed_amount) || 0;
              
              totalContractValue += contractValue;
              totalBilledAmount += billedAmount;
            });
            
            context[`${clientName}_total_contract_value`] = totalContractValue;
            context[`${clientName}_total_billed`] = totalBilledAmount;
            context[`${clientName}_pending_amount`] = totalContractValue - totalBilledAmount;
          }
          
          if (clientProjects) {
            context[`${clientName}_projects`] = clientProjects;
            // Calculate project totals
            let totalProjectValue = 0;
            let totalProjectPaid = 0;
            
            clientProjects.forEach(project => {
              const projectValue = parseFloat(project.total_amount) || 
                ((parseFloat(project.hourly_rate) || 0) * (parseFloat(project.estimated_hours) || 0));
              const paidAmount = parseFloat(project.paid_amount) || 0;
              
              totalProjectValue += projectValue;
              totalProjectPaid += paidAmount;
            });
            
            context[`${clientName}_total_project_value`] = totalProjectValue;
            context[`${clientName}_project_paid`] = totalProjectPaid;
            context[`${clientName}_project_pending`] = totalProjectValue - totalProjectPaid;
          }
          
          // Calculate debt analysis
          const totalValue = (context[`${clientName}_total_contract_value`] || 0) + (context[`${clientName}_total_project_value`] || 0);
          const totalPaid = context[`${clientName}_total_paid`] || 0;
          const totalPending = totalValue - totalPaid;
          
          context[`${clientName}_total_debt`] = totalPending;
          context[`${clientName}_debt_percentage`] = totalValue > 0 ? (totalPending / totalValue) * 100 : 0;
          
          // Estimate months of debt based on average monthly contract values
          if (clientContracts && clientContracts.length > 0) {
            const avgMonthlyValue = totalValue / (clientContracts.length * 12); // Assuming yearly contracts
            context[`${clientName}_estimated_months_debt`] = avgMonthlyValue > 0 ? Math.ceil(totalPending / avgMonthlyValue) : 0;
          }
          
        } catch (error) {
          // Continue if error
        }
        break;
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
  
  if (messageTokens.includes('pago') || messageTokens.includes('facturación') || messageTokens.includes('payment') || messageTokens.includes('billing')) {
    return "Para consultar información de pagos y facturación, ve a la sección 'Facturación' en el menú principal. Ahí encontrarás todos los pagos organizados por cliente, con historial detallado y estados de pago.";
  }
  
  // Check for specific client names
  if (messageTokens.includes('vanti')) {
    return "Para consultar información específica sobre Vanti, ve a la sección 'Facturación' y busca los pagos de este cliente, o utiliza la búsqueda en 'Clientes' para ver todos sus datos.";
  }
  
  if (messageTokens.includes('terpel')) {
    return "Para consultar información específica sobre Terpel, ve a la sección 'Facturación' y busca los pagos de este cliente, o utiliza la búsqueda en 'Clientes' para ver todos sus datos.";
  }
  
  if (messageTokens.includes('deuda') || messageTokens.includes('debe') || messageTokens.includes('pendiente') || messageTokens.includes('debt')) {
    return "Para consultar información sobre deudas pendientes, ve a la sección 'Facturación' donde puedes ver el estado de pagos por cliente. También puedo ayudarte a calcular montos pendientes si me especificas el cliente.";
  }
  
  if (messageTokens.includes('meses') && (messageTokens.includes('deuda') || messageTokens.includes('debe'))) {
    return "Para calcular meses de deuda, necesito acceder a la información específica del cliente. Ve a 'Facturación' para ver el historial detallado de pagos y contratos.";
  }
  
  return "¡Hola! Puedo ayudarte con consultas sobre tiempo registrado, contratos, clientes, proyectos y especialmente con datos de facturación, pagos y análisis de deudas. También puedo guiarte para crear nuevos elementos. ¿Qué necesitas?";
};