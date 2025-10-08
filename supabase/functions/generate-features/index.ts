import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, type } = await req.json();
    console.log('=== REQUEST START ===');
    console.log('Prompt:', prompt);
    console.log('Type:', type);
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
      systemPrompt = 'You are a product implementation expert. Create EXACTLY 4 implementation phases with specific tasks and deliverables, plus tracking events for analytics. You must return steps and trackingEvents arrays. Do not return KPIs.';
      toolDefinition = {
        type: 'function',
        function: {
          name: 'generate_implementation',
          description: 'Generate a 4-phase implementation plan with tracking events. Must include steps array and trackingEvents array.',
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

    const requestBody = {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      tools: [toolDefinition],
      tool_choice: { type: 'function', function: { name: toolDefinition.function.name } }
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

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

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-features function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
