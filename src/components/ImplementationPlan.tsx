import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, ArrowLeft, Calendar, Code, BarChart3, Database, CheckCircle2 } from "lucide-react";
import { Strategy } from "@/pages/Index";

interface ImplementationPlanProps {
  strategy: Strategy;
  onBack: () => void;
  loading?: boolean;
}

interface ImplementationStep {
  phase: string;
  duration: string;
  tasks: string[];
  deliverables: string[];
}

interface TrackingEvent {
  event: string;
  description: string;
  parameters: string[];
}

const generateImplementationPlan = (strategy: Strategy) => {
  const steps: ImplementationStep[] = [
    {
      phase: "Planning & Design",
      duration: "Week 1-2",
      tasks: [
        "Define technical requirements and architecture",
        "Create user experience mockups and wireframes",
        "Set up tracking infrastructure and analytics",
        "Plan integration points with existing systems"
      ],
      deliverables: [
        "Technical specification document",
        "UI/UX design system",
        "Analytics implementation plan"
      ]
    },
    {
      phase: "Development",
      duration: "Week 3-6",
      tasks: [
        "Implement core feature functionality",
        "Build analytics tracking events",
        "Create Power BI dashboard templates",
        "Develop API endpoints for data collection"
      ],
      deliverables: [
        "Feature implementation",
        "Tracking event library",
        "Dashboard templates"
      ]
    },
    {
      phase: "Testing & Integration",
      duration: "Week 7-8",
      tasks: [
        "Conduct user acceptance testing",
        "Validate analytics data accuracy",
        "Test Power BI dashboard connectivity",
        "Performance optimization and security review"
      ],
      deliverables: [
        "Test results and bug fixes",
        "Validated analytics pipeline",
        "Performance benchmarks"
      ]
    },
    {
      phase: "Launch & Monitoring",
      duration: "Week 9-10",
      tasks: [
        "Deploy feature to production",
        "Monitor initial user adoption",
        "Validate KPI tracking accuracy",
        "Iterate based on early feedback"
      ],
      deliverables: [
        "Production deployment",
        "Real-time monitoring dashboard",
        "Initial performance report"
      ]
    }
  ];

  const trackingEvents: TrackingEvent[] = strategy.selectedKPIs?.map((kpi, index) => ({
    event: `track_${kpi.name.toLowerCase().replace(/\s+/g, '_')}`,
    description: `Track ${kpi.name} metric`,
    parameters: [
      "user_id",
      "feature_id", 
      "timestamp",
      "value",
      ...(index % 2 === 0 ? ["session_id"] : ["page_url"])
    ]
  })) || [];

  return { steps, trackingEvents };
};

export const ImplementationPlan = ({ strategy, onBack, loading }: ImplementationPlanProps) => {
  const [plan, setPlan] = useState<{ steps: ImplementationStep[], trackingEvents: TrackingEvent[] }>({ steps: [], trackingEvents: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      const generatedPlan = generateImplementationPlan(strategy);
      setPlan(generatedPlan);
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [strategy]);

  const handleExport = () => {
    const exportData = {
      okr: strategy.okr,
      selectedFeature: strategy.selectedFeature,
      selectedKPIs: strategy.selectedKPIs,
      implementationPlan: plan,
      generatedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'north-star-strategy-plan.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow shadow-stellar animate-pulse">
            <Download className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Generating Implementation Plan</h2>
          <p className="text-lg text-muted-foreground">
            Creating your customized roadmap with Power BI integration...
          </p>
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <div className="h-6 bg-muted rounded animate-pulse mb-2" />
                <div className="h-4 bg-muted/60 rounded animate-pulse w-1/3" />
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
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-success to-success/80 shadow-stellar">
          <CheckCircle2 className="h-8 w-8 text-success-foreground" />
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Implementation Plan Ready</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Your comprehensive roadmap with tracking events and Power BI integration details.
        </p>
      </div>

      {/* Strategy Summary */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/10 to-primary-glow/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Strategy Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-foreground mb-1">OKR</h4>
            <p className="text-sm text-muted-foreground">{strategy.okr}</p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-1">Selected Feature</h4>
            <p className="text-sm text-muted-foreground">{strategy.selectedFeature?.title}</p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-1">KPIs ({strategy.selectedKPIs?.length})</h4>
            <div className="flex flex-wrap gap-2">
              {strategy.selectedKPIs?.map((kpi) => (
                <Badge key={kpi.id} variant="secondary" className="text-xs">
                  {kpi.name}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Timeline */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Implementation Timeline
        </h3>
        
        <div className="space-y-4">
          {plan.steps.map((step, index) => (
            <Card key={index} className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-foreground">{step.phase}</CardTitle>
                  <Badge variant="outline" className="border-primary/50 text-primary">
                    {step.duration}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                    <Code className="h-4 w-4 text-primary" />
                    Tasks
                  </h5>
                  <ul className="space-y-1">
                    {step.tasks.map((task, taskIndex) => (
                      <li key={taskIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-foreground mb-2">Deliverables</h5>
                  <div className="flex flex-wrap gap-2">
                    {step.deliverables.map((deliverable, deliverableIndex) => (
                      <Badge key={deliverableIndex} variant="secondary" className="text-xs">
                        {deliverable}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Tracking Events */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Analytics Tracking Events
        </h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          {plan.trackingEvents.map((event, index) => (
            <Card key={index} className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-foreground font-mono">
                  {event.event}
                </CardTitle>
                <CardDescription className="text-sm">
                  {event.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <h5 className="font-medium text-foreground mb-2 text-sm">Parameters</h5>
                  <div className="flex flex-wrap gap-1">
                    {event.parameters.map((param, paramIndex) => (
                      <Badge key={paramIndex} variant="outline" className="text-xs font-mono">
                        {param}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Power BI Integration */}
      <Card className="border-warning/20 bg-gradient-to-r from-warning/10 to-warning/5 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Database className="h-5 w-5 text-warning" />
            Power BI Integration
          </CardTitle>
          <CardDescription>
            Connect your tracking data to Power BI for real-time analytics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-foreground mb-1">Data Source</h5>
              <p className="text-muted-foreground">Supabase Analytics Tables</p>
            </div>
            <div>
              <h5 className="font-medium text-foreground mb-1">Refresh Rate</h5>
              <p className="text-muted-foreground">Real-time (15min intervals)</p>
            </div>
            <div>
              <h5 className="font-medium text-foreground mb-1">Dashboard Templates</h5>
              <p className="text-muted-foreground">KPI Overview, User Journey, Feature Performance</p>
            </div>
            <div>
              <h5 className="font-medium text-foreground mb-1">Export Format</h5>
              <p className="text-muted-foreground">REST API, DirectQuery, JSON</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
          onClick={handleExport}
          className="bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 text-success-foreground shadow-cosmic transition-all duration-200"
        >
          <Download className="mr-2 h-4 w-4" />
          Export Plan
        </Button>
      </div>
    </div>
  );
};