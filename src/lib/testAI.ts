import { supabase } from "@/integrations/supabase/client";

export const testAIConnection = async () => {
  try {
    console.log('Testing AI connection...');
    
    const { data, error } = await supabase.functions.invoke('generate-features', {
      body: { 
        prompt: 'Test OKR: Increase user engagement by 50%\n\nSoftware Context: A mobile fitness app',
        type: 'features' 
      }
    });

    if (error) {
      console.error('AI connection test failed:', error);
      return { success: false, error: error.message };
    }

    console.log('AI connection test successful:', data);
    return { success: true, data };
  } catch (error) {
    console.error('AI connection test error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
