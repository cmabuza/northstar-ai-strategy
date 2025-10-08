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
    console.log('Generating content with prompt:', prompt, 'type:', type);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = type === 'features' 
      ? 'You are a product strategy expert. Generate features based on the OKR provided. Return a JSON array of features with title, description, impact (low/medium/high), and effort (low/medium/high).'
      : 'You are a KPI expert. Generate relevant KPIs for the feature provided. Return a JSON array of KPIs with name and description.';

    const body: any = {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
    };

    // Use tool calling for structured output
    if (type === 'features') {
      body.tools = [{
        type: 'function',
        function: {
          name: 'generate_features',
          description: 'Generate product features based on OKR',
          parameters: {
            type: 'object',
            properties: {
              features: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    impact: { type: 'string', enum: ['low', 'medium', 'high'] },
                    effort: { type: 'string', enum: ['low', 'medium', 'high'] }
                  },
                  required: ['title', 'description', 'impact', 'effort'],
                  additionalProperties: false
                }
              }
            },
            required: ['features'],
            additionalProperties: false
          }
        }
      }];
      body.tool_choice = { type: 'function', function: { name: 'generate_features' } };
    } else {
      body.tools = [{
        type: 'function',
        function: {
          name: 'generate_kpis',
          description: 'Generate KPIs for a feature',
          parameters: {
            type: 'object',
            properties: {
              kpis: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' }
                  },
                  required: ['name', 'description'],
                  additionalProperties: false
                }
              }
            },
            required: ['kpis'],
            additionalProperties: false
          }
        }
      }];
      body.tool_choice = { type: 'function', function: { name: 'generate_kpis' } };
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
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
    console.log('AI response:', JSON.stringify(data));

    // Extract structured output from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log('Parsed result:', result);

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
