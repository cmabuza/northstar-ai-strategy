import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Rocket, Target, BarChart3, Download, History, X, FileJson, FileSpreadsheet, FileText, RotateCcw, LogOut } from "lucide-react";
import { StepIndicator } from "@/components/StepIndicator";
import { OKRInput } from "@/components/OKRInput";
import { FeatureSelection } from "@/components/FeatureSelection";
import { KPISelection } from "@/components/KPISelection";
import { ImplementationPlan } from "@/components/ImplementationPlan";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { exportToJSON, exportToCSV, exportToPDF } from "@/lib/exportUtils";

export interface Strategy {
  okr: string;
  softwareContext: string;
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
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [strategy, setStrategy] = useState<Strategy>({ okr: "", softwareContext: "" });
  const [strategyId, setStrategyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previousStrategies, setPreviousStrategies] = useState<any[]>([]);
  const { toast } = useToast();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/30 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  useEffect(() => {
    if (user) {
      loadPreviousStrategies();
    }
  }, [user]);

  const loadPreviousStrategies = async () => {
    if (!user) return;
    
    try {
      const data = await databaseService.fetchStrategies(user.id);
      setPreviousStrategies(data || []);
    } catch (error) {
      console.error('Error loading strategies:', error);
    }
  };

  const steps = [
    { number: 1, title: "Define OKR", icon: Target },
    { number: 2, title: "Select Feature", icon: Rocket },
    { number: 3, title: "Choose KPIs", icon: BarChart3 },
    { number: 4, title: "Implementation", icon: Download },
  ];

  const saveStrategyToDb = async () => {
    if (!strategy.okr || !strategy.softwareContext || !user) return;

    try {
      setLoading(true);
      const savedStrategy = await databaseService.saveStrategy(
        strategy.okr,
        strategy.softwareContext,
        user.id
      );
      setStrategyId(savedStrategy.id);
      await loadPreviousStrategies();
      return savedStrategy.id;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save strategy. Please try again.",
        variant: "destructive",
      });
      console.error('Error saving strategy:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveFeatureToDb = async (featureId: string) => {
    if (!strategyId || !strategy.selectedFeature) return;

    try {
      setLoading(true);
      await databaseService.saveFeatures(strategyId, [{
        title: strategy.selectedFeature.title,
        description: strategy.selectedFeature.description,
        impact: strategy.selectedFeature.impact,
        effort: strategy.selectedFeature.effort,
      }]);
      await loadPreviousStrategies();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save feature. Please try again.",
        variant: "destructive",
      });
      console.error('Error saving feature:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveKPIsToDb = async (featureDbId: string) => {
    if (!strategy.selectedKPIs?.length) return;

    try {
      setLoading(true);
      const kpis = strategy.selectedKPIs
        .filter(kpi => kpi.selected)
        .map(kpi => ({
          name: kpi.name,
          description: kpi.description,
          selected: kpi.selected,
        }));
      
      if (kpis.length > 0) {
        await databaseService.saveKPIs(featureDbId, kpis);
      }
      await loadPreviousStrategies();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save KPIs. Please try again.",
        variant: "destructive",
      });
      console.error('Error saving KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      const id = await saveStrategyToDb();
      if (id) setCurrentStep(2);
    } else if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStartOver = () => {
    setStrategy({ okr: "", softwareContext: "" });
    setStrategyId(null);
    setCurrentStep(1);
    toast({
      title: "Journey Reset",
      description: "Starting a new strategy from the beginning.",
    });
  };

  const loadStrategy = (strategyData: any) => {
    setStrategy({
      okr: strategyData.okr_text,
      softwareContext: strategyData.product_type,
      selectedFeature: strategyData.features?.[0] ? {
        id: strategyData.features[0].id,
        title: strategyData.features[0].title,
        description: strategyData.features[0].description,
        impact: strategyData.features[0].impact as "High" | "Medium" | "Low",
        effort: strategyData.features[0].effort as "High" | "Medium" | "Low",
      } : undefined,
      selectedKPIs: strategyData.features?.[0]?.kpis?.map((kpi: any) => ({
        id: kpi.id,
        name: kpi.name,
        description: kpi.description,
        selected: kpi.selected,
      })),
    });
    setStrategyId(strategyData.id);
    setHistoryOpen(false);
    setCurrentStep(strategyData.features?.length ? 4 : 1);
  };

  const exportStrategy = async (format: 'json' | 'csv' | 'pdf') => {
    if (!strategyId) {
      toast({
        title: "Error",
        description: "No strategy to export",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const data = await databaseService.fetchStrategy(strategyId);
      
      const exportData = {
        okr: data.okr_text,
        productType: data.product_type,
        features: data.features?.map((f: any) => ({
          title: f.title,
          description: f.description,
          impact: f.impact,
          effort: f.effort,
          kpis: f.kpis?.map((k: any) => ({
            name: k.name,
            description: k.description,
            selected: k.selected,
          })),
        })),
        implementation: data.implementations?.[0],
      };

      switch (format) {
        case 'json':
          exportToJSON(exportData);
          break;
        case 'csv':
          exportToCSV(exportData);
          break;
        case 'pdf':
          exportToPDF(exportData);
          break;
      }

      toast({
        title: "Success",
        description: `Strategy exported as ${format.toUpperCase()} successfully!`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export strategy. Please try again.",
        variant: "destructive",
      });
      console.error('Error exporting strategy:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/30">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-glow shadow-cosmic">
                <Rocket className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">North Star Nav</h1>
                <p className="text-sm text-muted-foreground">AI-Powered Product Strategy Engine</p>
              </div>
            </div>
            <div className="flex gap-2">
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await signOut();
                  navigate("/auth");
                }}
                className="border-border/50 hover:bg-destructive/10 text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartOver}
                  className="border-warning/50 text-warning hover:bg-warning/10"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Start Over</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryOpen(true)}
              >
                <History className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">History</span>
              </Button>
              {strategyId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loading}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => exportStrategy('json')} className="cursor-pointer">
                      <FileJson className="h-4 w-4 mr-2" />
                      Export JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportStrategy('csv')} className="cursor-pointer">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportStrategy('pdf')} className="cursor-pointer">
                      <FileText className="h-4 w-4 mr-2" />
                      Export PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* History Sidebar */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setHistoryOpen(false)}>
          <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-card border-l shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Previous Strategies</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setHistoryOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="h-[calc(100vh-65px)]">
              <div className="p-4 space-y-3">
                {previousStrategies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No previous strategies
                  </p>
                ) : (
                  previousStrategies.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-lg border bg-background hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => loadStrategy(s)}
                    >
                      <p className="font-medium text-sm line-clamp-2">{s.okr_text}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(s.created_at).toLocaleDateString()}
                      </p>
                      {s.features?.length > 0 && (
                        <p className="text-xs text-primary mt-1">
                          {s.features.length} feature(s)
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-8">
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
              loading={loading}
            />
          )}
          
          {currentStep === 2 && (
            <FeatureSelection
              strategy={strategy}
              onStrategyUpdate={setStrategy}
              onNext={handleNext}
              onBack={handleBack}
              loading={loading}
            />
          )}
          
          {currentStep === 3 && (
            <KPISelection
              strategy={strategy}
              onStrategyUpdate={setStrategy}
              onNext={handleNext}
              onBack={handleBack}
              loading={loading}
            />
          )}
          
          {currentStep === 4 && (
            <ImplementationPlan
              strategy={strategy}
              onBack={handleBack}
              onStartOver={handleStartOver}
              loading={loading}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;