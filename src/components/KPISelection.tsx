import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart3, ArrowRight, ArrowLeft, TrendingUp } from "lucide-react";
import { Strategy, KPI } from "@/pages/Index";

interface KPISelectionProps {
  strategy: Strategy;
  onStrategyUpdate: (strategy: Strategy) => void;
  onNext: () => void;
  onBack: () => void;
}

// Generate KPIs based on selected feature
const generateKPIs = (featureTitle: string): KPI[] => {
  const baseKPIs = [
    {
      id: "1",
      name: "User Adoption Rate",
      description: "Percentage of active users engaging with the new feature within 30 days",
      selected: false
    },
    {
      id: "2",
      name: "Feature Engagement Score",
      description: "Average daily interactions per user with the feature",
      selected: false
    },
    {
      id: "3",
      name: "Time to Value",
      description: "Average time for users to achieve their first meaningful outcome",
      selected: false
    },
    {
      id: "4",
      name: "User Satisfaction (NPS)",
      description: "Net Promoter Score specifically related to the feature experience",
      selected: false
    },
    {
      id: "5",
      name: "Conversion Rate Impact",
      description: "Lift in conversion rate attributed to the feature implementation",
      selected: false
    },
    {
      id: "6",
      name: "Support Ticket Reduction",
      description: "Decrease in related support requests after feature deployment",
      selected: false
    }
  ];

  // Customize KPIs based on feature type
  if (featureTitle.toLowerCase().includes("analytics") || featureTitle.toLowerCase().includes("dashboard")) {
    baseKPIs[1].name = "Dashboard Usage Frequency";
    baseKPIs[1].description = "Number of times users access and interact with analytics dashboards";
    baseKPIs[4].name = "Data-Driven Decisions";
    baseKPIs[4].description = "Percentage of business decisions made using dashboard insights";
  }

  if (featureTitle.toLowerCase().includes("onboarding")) {
    baseKPIs[2].name = "Onboarding Completion Rate";
    baseKPIs[2].description = "Percentage of users who complete the full onboarding flow";
    baseKPIs[5].name = "Early Engagement Rate";
    baseKPIs[5].description = "Percentage of users active within first 7 days";
  }

  if (featureTitle.toLowerCase().includes("payment")) {
    baseKPIs[0].name = "Payment Success Rate";
    baseKPIs[4].name = "Transaction Volume";
    baseKPIs[5].name = "Payment Method Adoption";
  }

  return baseKPIs;
};

export const KPISelection = ({ strategy, onStrategyUpdate, onNext, onBack }: KPISelectionProps) => {
  const [kpis, setKPIs] = useState<KPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate AI processing
    setIsLoading(true);
    const timer = setTimeout(() => {
      const generatedKPIs = generateKPIs(strategy.selectedFeature?.title || "");
      setKPIs(generatedKPIs);
      setIsLoading(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [strategy.selectedFeature]);

  const handleKPIToggle = (kpiId: string) => {
    setKPIs(prevKPIs => 
      prevKPIs.map(kpi => 
        kpi.id === kpiId ? { ...kpi, selected: !kpi.selected } : kpi
      )
    );
  };

  const handleNext = () => {
    const selectedKPIs = kpis.filter(kpi => kpi.selected);
    onStrategyUpdate({ ...strategy, selectedKPIs });
    onNext();
  };

  const selectedCount = kpis.filter(kpi => kpi.selected).length;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow shadow-stellar animate-pulse">
            <BarChart3 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Generating KPIs</h2>
          <p className="text-lg text-muted-foreground">
            Creating relevant metrics for "{strategy.selectedFeature?.title}"...
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-4 h-4 bg-muted rounded animate-pulse mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted/60 rounded animate-pulse w-4/5" />
                  </div>
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
          <BarChart3 className="h-8 w-8 text-primary-foreground" />
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Choose Your KPIs</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Select the key performance indicators that will help you measure the success of "{strategy.selectedFeature?.title}".
        </p>
      </div>

      {/* Feature Context */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary-glow/5 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">Selected Feature</p>
              <p className="text-sm text-muted-foreground">{strategy.selectedFeature?.title}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Available KPIs</h3>
          <p className="text-sm text-muted-foreground">
            {selectedCount} selected
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          {kpis.map((kpi) => (
            <Card 
              key={kpi.id}
              className={`cursor-pointer transition-all duration-200 border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-md ${
                kpi.selected ? 'ring-2 ring-primary bg-primary/5' : ''
              }`}
              onClick={() => handleKPIToggle(kpi.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={kpi.selected}
                    onChange={() => handleKPIToggle(kpi.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground mb-1">{kpi.name}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {kpi.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

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
          disabled={selectedCount === 0}
          className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary-accent hover:to-primary text-primary-foreground shadow-cosmic transition-all duration-200 hover:shadow-stellar"
        >
          Generate Implementation Plan
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};