import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  number: number;
  title: string;
  icon: LucideIcon;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export const StepIndicator = ({ steps, currentStep }: StepIndicatorProps) => {
  return (
    <div className="relative">
      {/* Progress Line */}
      <div className="absolute top-6 left-0 right-0 h-0.5 bg-border -z-10">
        <div 
          className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-500 ease-out"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <div className="flex justify-between">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;
          
          return (
            <div key={step.number} className="flex flex-col items-center">
              {/* Step Circle */}
              <div
                className={cn(
                  "relative flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isActive && "border-primary bg-gradient-to-br from-primary to-primary-glow shadow-cosmic scale-110",
                  isCompleted && "border-success bg-success",
                  !isActive && !isCompleted && "border-border bg-card"
                )}
              >
                <Icon 
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isActive && "text-primary-foreground",
                    isCompleted && "text-success-foreground",
                    !isActive && !isCompleted && "text-muted-foreground"
                  )} 
                />
                
                {/* Glow effect for active step */}
                {isActive && (
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-primary-glow opacity-20 blur-lg" />
                )}
              </div>
              
              {/* Step Label */}
              <div className="mt-3 text-center">
                <p
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isActive && "text-primary",
                    isCompleted && "text-success",
                    !isActive && !isCompleted && "text-muted-foreground"
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">Step {step.number}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};