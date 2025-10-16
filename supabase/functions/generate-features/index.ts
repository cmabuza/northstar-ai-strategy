import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  checkRateLimit,
  sanitizePromptInput,
  detectThreats,
  validatePayloadSize,
  validatePromptLength,
  extractUserId,
  getSecurityHeaders,
  validateRequestType,
  getRateLimitHeaders,
  logSecurityEvent,
} from '../_shared/security.ts';

// Version 4.0 - Added comprehensive security protection
// Protects against: Rate Limiting, SSRF, DoS, XSS, SQL Injection, Prompt Injection

const corsHeaders = getSecurityHeaders();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let userId = 'anonymous';
  let requestBody: any;

  try {
    // 1. AUTHENTICATION & RATE LIMITING
    // Extract user ID from auth token
    const authHeader = req.headers.get('authorization');
    const extractedUserId = extractUserId(authHeader);

    if (!extractedUserId) {
      logSecurityEvent('anonymous', 'invalid_request', { reason: 'Missing or invalid auth token' });
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: corsHeaders }
      );
    }

    userId = extractedUserId;

    // Check rate limits
    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      logSecurityEvent(userId, 'rate_limit', {
        reason: rateLimitCheck.reason,
        retryAfter: rateLimitCheck.retryAfter,
      });

      return new Response(
        JSON.stringify({
          error: rateLimitCheck.reason || 'Rate limit exceeded',
          retryAfter: rateLimitCheck.retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Retry-After': rateLimitCheck.retryAfter?.toString() || '60',
          },
        }
      );
    }

    // 2. DOS PROTECTION - Payload size validation
    // Parse request with size limit
    const rawBody = await req.text();
    if (rawBody.length > 50000) {
      logSecurityEvent(userId, 'invalid_request', {
        reason: 'Payload too large',
        size: rawBody.length,
      });
      return new Response(
        JSON.stringify({ error: 'Request payload too large (max 50KB)' }),
        { status: 413, headers: corsHeaders }
      );
    }

    try {
      requestBody = JSON.parse(rawBody);
    } catch (parseError) {
      logSecurityEvent(userId, 'invalid_request', { reason: 'Invalid JSON' });
      return new Response(
        JSON.stringify({ error: 'Invalid JSON format' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const payloadCheck = validatePayloadSize(requestBody);
    if (!payloadCheck.valid) {
      logSecurityEvent(userId, 'invalid_request', {
        reason: payloadCheck.reason,
        size: payloadCheck.size,
      });
      return new Response(
        JSON.stringify({ error: payloadCheck.reason }),
        { status: 413, headers: corsHeaders }
      );
    }

    // Extract and validate request parameters
    const { prompt, type } = requestBody;
    // 3. VALIDATION - Type parameter
    const typeValidation = validateRequestType(type);
    if (!typeValidation.valid) {
      logSecurityEvent(userId, 'invalid_request', { reason: typeValidation.reason });
      return new Response(
        JSON.stringify({ error: typeValidation.reason }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 4. VALIDATION - Prompt length and content
    if (!prompt || typeof prompt !== 'string') {
      logSecurityEvent(userId, 'invalid_request', { reason: 'Missing or invalid prompt' });
      return new Response(
        JSON.stringify({ error: 'Prompt is required and must be a string' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const promptLengthCheck = validatePromptLength(prompt);
    if (!promptLengthCheck.valid) {
      logSecurityEvent(userId, 'invalid_request', {
        reason: promptLengthCheck.reason,
        length: promptLengthCheck.length,
      });
      return new Response(
        JSON.stringify({ error: promptLengthCheck.reason }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 5. THREAT DETECTION - XSS, SSRF, Prompt Injection
    const threats = detectThreats(prompt);
    if (threats.length > 0) {
      logSecurityEvent(userId, 'threat_detected', {
        threats,
        promptPreview: prompt.substring(0, 100),
      });
      return new Response(
        JSON.stringify({
          error: 'Security threat detected in input',
          details: threats,
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 6. INPUT SANITIZATION - Sanitize prompt to remove dangerous characters
    const sanitizedPrompt = sanitizePromptInput(prompt);

    console.log('=== REQUEST START ===');
    console.log('User ID:', userId);
    console.log('Type:', type);
    console.log('Original Prompt Length:', prompt.length);
    console.log('Sanitized Prompt Length:', sanitizedPrompt.length);
    console.log('===================');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let systemPrompt = '';
    let toolDefinition: any = {};

    if (type === 'features') {
      systemPrompt = 'You are a product strategy expert. Analyze the OKR and software context to generate 3 strategic features that would help achieve the objective. Each feature should be practical, impactful, and tailored to the specific context.';
      toolDefinition = {
        type: 'function',
        function: {
          name: 'generate_features',
          description: 'Generate product features based on OKR and software context',
          parameters: {
            type: 'object',
            properties: {
              features: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Clear, actionable feature name' },
                    description: { type: 'string', description: 'Detailed description of the feature and its value' },
                    impact: { type: 'string', enum: ['Low', 'Medium', 'High'], description: 'Expected business impact' },
                    effort: { type: 'string', enum: ['Low', 'Medium', 'High'], description: 'Implementation effort required' }
                  },
                  required: ['title', 'description', 'impact', 'effort'],
                  additionalProperties: false
                },
                minItems: 3,
                maxItems: 3
              }
            },
            required: ['features'],
            additionalProperties: false
          }
        }
      };
    } else if (type === 'kpis') {
      systemPrompt = 'You are a KPI and metrics expert. Generate 6 relevant, measurable KPIs that would track the success of the specified feature. Each KPI should be specific, measurable, and aligned with the feature goals.';
      toolDefinition = {
        type: 'function',
        function: {
          name: 'generate_kpis',
          description: 'Generate KPIs for a specific feature',
          parameters: {
            type: 'object',
            properties: {
              kpis: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Clear KPI name' },
                    description: { type: 'string', description: 'Detailed explanation of what this KPI measures and why it matters' }
                  },
                  required: ['name', 'description'],
                  additionalProperties: false
                },
                minItems: 6,
                maxItems: 6
              }
            },
            required: ['kpis'],
            additionalProperties: false
          }
        }
      };
    } else if (type === 'implementation') {
      console.log('🚀 IMPLEMENTATION TYPE DETECTED - Will use generate_implementation tool');
      systemPrompt = `CRITICAL: You are generating an IMPLEMENTATION PLAN, NOT KPIs or features.
You must create EXACTLY 4 implementation phases with tasks and deliverables.
You must also create tracking events for analytics.

REQUIRED OUTPUT STRUCTURE:
{
  "steps": [
    { "phase": "Phase 1: Foundation", "duration": "Week 1-2", "tasks": ["task1", "task2", "task3"], "deliverables": ["deliverable1", "deliverable2"] }
  ],
  "trackingEvents": [
    { "event": "event_name", "description": "what it tracks", "parameters": ["param1", "param2"] }
  ]
}

FORBIDDEN: Do NOT return kpis, features, or any other structure.
This is about HOW to implement the feature step-by-step, NOT what to measure.`;
      
      toolDefinition = {
        type: 'function',
        function: {
          name: 'generate_implementation',
          description: 'Generate a detailed 4-phase implementation plan showing HOW to build the feature. This is NOT for generating KPIs or features. Must return a steps array (4 phases with tasks/deliverables) and a trackingEvents array (analytics events). DO NOT use this for KPI generation.',
          parameters: {
            type: 'object',
            properties: {
              steps: {
                type: 'array',
                description: 'Array of 4 implementation phases',
                items: {
                  type: 'object',
                  properties: {
                    phase: { type: 'string', description: 'Phase name (e.g., "Phase 1: Foundation")' },
                    duration: { type: 'string', description: 'Time duration (e.g., "Week 1-2")' },
                    tasks: { 
                      type: 'array', 
                      items: { type: 'string' },
                      description: 'List of specific tasks to complete',
                      minItems: 3
                    },
                    deliverables: { 
                      type: 'array', 
                      items: { type: 'string' },
                      description: 'Key deliverables for this phase',
                      minItems: 2
                    }
                  },
                  required: ['phase', 'duration', 'tasks', 'deliverables'],
                  additionalProperties: false
                },
                minItems: 4,
                maxItems: 4
              },
              trackingEvents: {
                type: 'array',
                description: 'Analytics events for Power BI tracking',
                items: {
                  type: 'object',
                  properties: {
                    event: { type: 'string', description: 'Event name in snake_case (e.g., "challenge_submitted")' },
                    description: { type: 'string', description: 'What this event tracks' },
                    parameters: { 
                      type: 'array', 
                      items: { type: 'string' },
                      description: 'Parameters to capture (e.g., "user_id", "challenge_id")',
                      minItems: 2
                    }
                  },
                  required: ['event', 'description', 'parameters'],
                  additionalProperties: false
                },
                minItems: 4
              }
            },
            required: ['steps', 'trackingEvents'],
            additionalProperties: false
          }
        }
      };
    }

    console.log('Tool definition name:', toolDefinition.function.name);
    console.log('System prompt:', systemPrompt);

    // Pre-flight validation
    if (type === 'implementation' && toolDefinition.function.name !== 'generate_implementation') {
      throw new Error('Configuration error: Wrong tool definition for implementation type');
    }
    if (type === 'kpis' && toolDefinition.function.name !== 'generate_kpis') {
      throw new Error('Configuration error: Wrong tool definition for kpis type');
    }
    if (type === 'features' && toolDefinition.function.name !== 'generate_features') {
      throw new Error('Configuration error: Wrong tool definition for features type');
    }
    console.log('✅ Pre-flight check passed:', toolDefinition.function.name);

    // Add example structure for implementation requests
    let userMessage = sanitizedPrompt;
    if (type === 'implementation') {
      userMessage += `\n\nREMINDER: Return ONLY the implementation plan structure with steps and trackingEvents. Do NOT return KPIs.`;
    }

    const aiRequestBody = {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      tools: [toolDefinition],
      tool_choice: { type: 'function', function: { name: toolDefinition.function.name } }
    };

    console.log('AI Request prepared for type:', type);

    // 7. SSRF PROTECTION - Only allow requests to approved AI gateway
    const aiGatewayUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';

    // Create abort controller for timeout (DoS protection)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let response: Response;
    try {
      response = await fetch(aiGatewayUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(aiRequestBody),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        logSecurityEvent(userId, 'invalid_request', { reason: 'Request timeout' });
        return new Response(
          JSON.stringify({ error: 'Request timeout - operation took too long' }),
          { status: 504, headers: corsHeaders }
        );
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('=== AI RESPONSE ===');
    console.log('Full response:', JSON.stringify(data, null, 2));
    console.log('==================');

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error('No tool call in response');
      console.error('Choices:', data.choices);
      throw new Error('No structured response from AI');
    }

    console.log('Tool call function name:', toolCall.function.name);
    console.log('Tool call arguments:', toolCall.function.arguments);

    const result = JSON.parse(toolCall.function.arguments);
    console.log('=== PARSED RESULT ===');
    console.log(JSON.stringify(result, null, 2));
    console.log('====================');

    // Validate the result matches the expected type
    if (type === 'implementation') {
      if (!result.steps || !result.trackingEvents) {
        console.error('ERROR: Implementation type but got wrong structure:', result);
        throw new Error('AI returned wrong structure for implementation. Expected steps and trackingEvents arrays.');
      }
      console.log('✅ Implementation validation passed');
    } else if (type === 'kpis') {
      if (!result.kpis) {
        console.error('ERROR: KPI type but got wrong structure:', result);
        throw new Error('AI returned wrong structure for KPIs. Expected kpis array.');
      }
    } else if (type === 'features') {
      if (!result.features) {
        console.error('ERROR: Features type but got wrong structure:', result);
        throw new Error('AI returned wrong structure for features. Expected features array.');
      }
    }

    // Log successful request
    logSecurityEvent(userId, 'success', {
      type,
      promptLength: sanitizedPrompt.length,
      resultSize: JSON.stringify(result).length,
    });

    // Add rate limit headers to response
    const rateLimitHeaders = getRateLimitHeaders(userId);

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          ...rateLimitHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error in generate-features function:', error);

    // Log error event
    if (userId && userId !== 'anonymous') {
      logSecurityEvent(userId, 'invalid_request', {
        error: error.message || 'Unknown error',
        stack: error.stack,
      });
    }

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
