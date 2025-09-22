import { useState } from "react";
import { Rocket, Target, BarChart3, Download } from "lucide-react";
import { StepIndicator } from "@/components/StepIndicator";
import { OKRInput } from "@/components/OKRInput";
import { FeatureSelection } from "@/components/FeatureSelection";
import { KPISelection } from "@/components/KPISelection";
import { ImplementationPlan } from "@/components/ImplementationPlan";

export interface Strategy {
  okr: string;
  selectedFeature?: Feature;
  selectedKPIs?: KPI[];
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  impact: "High" | "Medium" | "Low";
  effort: "High" | "Medium" | "Low";
}

export interface KPI {
  id: string;
  name: string;
  description: string;
  selected: boolean;
}

const Index = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [strategy, setStrategy] = useState<Strategy>({ okr: "" });

  const steps = [
    { number: 1, title: "Define OKR", icon: Target },
    { number: 2, title: "Select Feature", icon: Rocket },
    { number: 3, title: "Choose KPIs", icon: BarChart3 },
    { number: 4, title: "Implementation", icon: Download },
  ];

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/30">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-glow shadow-cosmic">
              <Rocket className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">North Star Nav</h1>
              <p className="text-sm text-muted-foreground">AI-Powered Product Strategy Engine</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <StepIndicator steps={steps} currentStep={currentStep} />
        </div>

        {/* Step Content */}
        <div className="mx-auto max-w-4xl">
          {currentStep === 1 && (
            <OKRInput
              strategy={strategy}
              onStrategyUpdate={setStrategy}
              onNext={handleNext}
            />
          )}
          
          {currentStep === 2 && (
            <FeatureSelection
              strategy={strategy}
              onStrategyUpdate={setStrategy}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 3 && (
            <KPISelection
              strategy={strategy}
              onStrategyUpdate={setStrategy}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 4 && (
            <ImplementationPlan
              strategy={strategy}
              onBack={handleBack}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;