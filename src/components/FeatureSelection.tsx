import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Rocket, ArrowRight, ArrowLeft, Zap, Clock, RefreshCw, Edit3 } from "lucide-react";
import { Strategy, Feature } from "@/pages/Index";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FeatureSelectionProps {
  strategy: Strategy;
  onStrategyUpdate: (strategy: Strategy) => void;
  onNext: () => void;
  onBack: () => void;
  loading?: boolean;
}

const generateFeatures = async (okr: string, softwareContext?: string): Promise<Feature[]> => {
  const prompt = `OKR: ${okr}\n\nSoftware Context: ${softwareContext || 'Not specified'}\n\nGenerate 3 strategic features that would help achieve this OKR. Each feature should be practical and tailored to the context.`;
  
  const { data, error } = await supabase.functions.invoke('generate-features', {
    body: { prompt, type: 'features' }
  });

  if (error) throw error;
  if (!data?.features) throw new Error('No features returned from AI');

  return data.features.map((f: any, idx: number) => ({
    id: String(idx + 1),
    title: f.title,
    description: f.description,
    impact: f.impact,
    effort: f.effort
  }));
};

const getImpactColor = (impact: string) => {
  switch (impact) {
    case "High": return "bg-success text-success-foreground";
    case "Medium": return "bg-warning text-warning-foreground";
    case "Low": return "bg-muted text-muted-foreground";
    default: return "bg-muted text-muted-foreground";
  }
};

const getEffortColor = (effort: string) => {
  switch (effort) {
    case "High": return "bg-destructive text-destructive-foreground";
    case "Medium": return "bg-warning text-warning-foreground";
    case "Low": return "bg-success text-success-foreground";
    default: return "bg-muted text-muted-foreground";
  }
};

export const FeatureSelection = ({ strategy, onStrategyUpdate, onNext, onBack, loading }: FeatureSelectionProps) => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(strategy.selectedFeature || null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const loadFeatures = async () => {
      setIsLoading(true);
      try {
        const generatedFeatures = await generateFeatures(strategy.okr, strategy.softwareContext);
        setFeatures(generatedFeatures);
      } catch (error) {
        console.error('Error generating features:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to generate features. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadFeatures();
  }, [strategy.okr, strategy.softwareContext]);

  const handleFeatureSelect = (feature: Feature) => {
    setSelectedFeature(feature);
    onStrategyUpdate({ ...strategy, selectedFeature: feature });
  };

  const handleNext = () => {
    if (selectedFeature) {
      onNext();
    }
  };

  const handleRegenerate = async () => {
    setIsLoading(true);
    setSelectedFeature(null);
    try {
      const generatedFeatures = await generateFeatures(strategy.okr, strategy.softwareContext);
      setFeatures(generatedFeatures);
      toast({
        title: "Success",
        description: "New features generated successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to regenerate features. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditFeature = (feature: Feature) => {
    setEditingFeature(feature);
    setEditedTitle(feature.title);
    setEditedDescription(feature.description);
  };

  const handleSaveEdit = () => {
    if (editingFeature && editedTitle.trim() && editedDescription.trim()) {
      const updatedFeature = {
        ...editingFeature,
        title: editedTitle,
        description: editedDescription
      };
      
      const updatedFeatures = features.map(f => 
        f.id === editingFeature.id ? updatedFeature : f
      );
      setFeatures(updatedFeatures);
      
      if (selectedFeature?.id === editingFeature.id) {
        setSelectedFeature(updatedFeature);
        onStrategyUpdate({ ...strategy, selectedFeature: updatedFeature });
      }
      
      setEditingFeature(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow shadow-stellar animate-pulse">
            <Rocket className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Analyzing Your OKR</h2>
          <p className="text-lg text-muted-foreground">
            Our AI is generating strategic features tailored to your objectives...
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <div className="h-6 bg-muted rounded animate-pulse mb-2" />
                <div className="h-4 bg-muted/60 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted/40 rounded animate-pulse" />
                  <div className="h-4 bg-muted/40 rounded animate-pulse w-4/5" />
                  <div className="h-4 bg-muted/40 rounded animate-pulse w-3/5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow shadow-stellar">
          <Rocket className="h-8 w-8 text-primary-foreground" />
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Select Your Strategic Feature</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Based on your OKR, our AI has identified these high-impact features. Select the one that best aligns with your strategic priorities.
        </p>
        <div className="flex justify-center mt-4">
          <Button
            onClick={handleRegenerate}
            variant="outline"
            className="border-border/50 hover:bg-secondary"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerate Options
          </Button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {features.map((feature) => (
          <Card
            key={feature.id}
            className={cn(
              "cursor-pointer transition-all duration-300 hover:shadow-lg border-border/50 bg-card/80 backdrop-blur-sm",
              selectedFeature?.id === feature.id && "ring-2 ring-primary shadow-stellar scale-105"
            )}
            onClick={() => handleFeatureSelect(feature)}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg text-foreground leading-tight">
                  {feature.title}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditFeature(feature);
                    }}
                    className="h-6 w-6 p-0 hover:bg-secondary"
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  {selectedFeature?.id === feature.id && (
                    <div className="p-1.5 rounded-full bg-gradient-to-br from-primary to-primary-glow">
                      <div className="h-3 w-3 rounded-full bg-primary-foreground" />
                    </div>
                  )}
                </div>
              </div>
              <CardDescription className="text-sm text-muted-foreground">
                {feature.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Badge className={cn("text-xs", getImpactColor(feature.impact))}>
                  <Zap className="w-3 h-3 mr-1" />
                  {feature.impact} Impact
                </Badge>
                <Badge className={cn("text-xs", getEffortColor(feature.effort))}>
                  <Clock className="w-3 h-3 mr-1" />
                  {feature.effort} Effort
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Feature Dialog */}
      <Dialog open={!!editingFeature} onOpenChange={() => setEditingFeature(null)}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Feature</DialogTitle>
            <DialogDescription>
              Customize the feature title and description to better match your needs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Feature Title
              </label>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:border-primary focus:outline-none"
                placeholder="Enter feature title..."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Feature Description
              </label>
              <Textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="min-h-24 bg-background border-border focus:border-primary"
                placeholder="Enter feature description..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingFeature(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={!editedTitle.trim() || !editedDescription.trim()}
                className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary-accent hover:to-primary text-primary-foreground"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Actions */}
      <div className="flex justify-between pt-6">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-border/50 hover:bg-secondary"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!selectedFeature || loading}
          className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary-accent hover:to-primary text-primary-foreground shadow-cosmic transition-all duration-200 hover:shadow-stellar"
        >
          {loading ? "Saving..." : "Continue to KPIs"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};