import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, ArrowRight, Lightbulb } from "lucide-react";
import { Strategy } from "@/pages/Index";

interface OKRInputProps {
  strategy: Strategy;
  onStrategyUpdate: (strategy: Strategy) => void;
  onNext: () => void;
}

const sampleOKRs = [
  {
    company: "BillEaze",
    okr: "Increase enterprise client adoption by 50% this quarter",
    description: "Focus on B2B growth and enterprise features"
  },
  {
    company: "e-Tswane",
    okr: "Reduce monthly churn by 35% and increase MAU by 40%",
    description: "Improve retention and user engagement"
  },
  {
    company: "e-Joburg",
    okr: "Increase online payment volume by 60% while reducing costs by 20%",
    description: "Optimize payment processing efficiency"
  }
];

export const OKRInput = ({ strategy, onStrategyUpdate, onNext }: OKRInputProps) => {
  const [okrText, setOkrText] = useState(strategy.okr);
  const [softwareContext, setSoftwareContext] = useState(strategy.softwareContext);

  const handleSampleSelect = (sampleOKR: string) => {
    setOkrText(sampleOKR);
    onStrategyUpdate({ ...strategy, okr: sampleOKR });
  };

  const handleSubmit = () => {
    if (okrText.trim()) {
      onStrategyUpdate({ ...strategy, okr: okrText, softwareContext });
      onNext();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow shadow-stellar">
          <Target className="h-8 w-8 text-primary-foreground" />
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Define Your OKR</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Start by defining your Objective and Key Results. Our AI will analyze your goals and suggest strategic features to achieve them.
        </p>
      </div>

      {/* Sample OKRs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Lightbulb className="h-4 w-4 text-warning" />
          Quick Start Examples
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {sampleOKRs.map((sample) => (
            <Card 
              key={sample.company}
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-border/50 bg-card/80 backdrop-blur-sm"
              onClick={() => handleSampleSelect(sample.okr)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-foreground">{sample.company}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {sample.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  "{sample.okr}"
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Software Context */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Software Context</CardTitle>
          <CardDescription>
            Describe your software/product to help generate more tailored feature suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Example: A SaaS billing platform for B2B companies, or a mobile app for food delivery..."
            value={softwareContext}
            onChange={(e) => setSoftwareContext(e.target.value)}
            className="min-h-24 bg-background/50 border-border/50 focus:border-primary resize-none"
          />
        </CardContent>
      </Card>

      {/* OKR Input */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Enter Your OKR</CardTitle>
          <CardDescription>
            Describe your objective and key results in detail. Be specific about metrics and timeframes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Example: Increase monthly active users by 40% and reduce churn rate by 25% within Q2 2024..."
            value={okrText}
            onChange={(e) => setOkrText(e.target.value)}
            className="min-h-32 bg-background/50 border-border/50 focus:border-primary resize-none"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!okrText.trim()}
              className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary-accent hover:to-primary text-primary-foreground shadow-cosmic transition-all duration-200 hover:shadow-stellar"
            >
              Generate Features
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};