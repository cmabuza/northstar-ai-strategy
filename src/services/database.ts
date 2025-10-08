import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { validateStrategy, validateFeature, validateKPI } from '@/lib/validation';

type Strategy = Database['public']['Tables']['strategies']['Insert'];
type Feature = Database['public']['Tables']['features']['Insert'];
type KPI = Database['public']['Tables']['kpis']['Insert'];
type Implementation = Database['public']['Tables']['implementations']['Insert'];

export const databaseService = {
  /**
   * Save a new strategy to the database
   */
  async saveStrategy(okrText: string, productType: string, userId: string) {
    // Validate input
    validateStrategy({ okr: okrText, softwareContext: productType });
    
    if (!userId) {
      throw new Error('User must be authenticated to save strategies');
    }

    const { data, error } = await supabase
      .from('strategies')
      .insert({
        okr_text: okrText,
        product_type: productType,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Save multiple features linked to a strategy
   */
  async saveFeatures(strategyId: string, features: Omit<Feature, 'strategy_id'>[]) {
    // Validate each feature
    features.forEach(feature => {
      validateFeature(feature);
    });

    const featuresWithStrategy = features.map(feature => ({
      ...feature,
      strategy_id: strategyId,
    }));

    const { data, error } = await supabase
      .from('features')
      .insert(featuresWithStrategy)
      .select();

    if (error) throw error;
    return data;
  },

  /**
   * Save multiple KPIs linked to a feature
   */
  async saveKPIs(featureId: string, kpis: Omit<KPI, 'feature_id'>[]) {
    // Validate each KPI
    kpis.forEach(kpi => {
      validateKPI(kpi);
    });

    const kpisWithFeature = kpis.map(kpi => ({
      ...kpi,
      feature_id: featureId,
    }));

    const { data, error } = await supabase
      .from('kpis')
      .insert(kpisWithFeature)
      .select();

    if (error) throw error;
    return data;
  },

  /**
   * Save implementation details for a strategy
   */
  async saveImplementation(implementation: Implementation) {
    const { data, error } = await supabase
      .from('implementations')
      .insert(implementation)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Fetch previous strategies with their related data
   */
  async fetchStrategies(userId: string) {
    if (!userId) {
      throw new Error('User must be authenticated to fetch strategies');
    }

    const { data, error } = await supabase
      .from('strategies')
      .select(`
        *,
        features (
          *,
          kpis (*)
        ),
        implementations (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Fetch a single strategy with all related data
   */
  async fetchStrategy(strategyId: string) {
    const { data, error } = await supabase
      .from('strategies')
      .select(`
        *,
        features (
          *,
          kpis (*)
        ),
        implementations (*)
      `)
      .eq('id', strategyId)
      .single();

    if (error) throw error;
    return data;
  },
};
