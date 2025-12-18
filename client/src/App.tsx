import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import IntakePage from "@/pages/intake";
import SharePage from "@/pages/share";
import ClinicianViewPage from "@/pages/clinician-view";
import MyIntakesPage from "@/pages/my-intakes";
import MyMedicationsPage from "@/pages/my-medications";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/intake" component={IntakePage} />
      <Route path="/share/:id" component={SharePage} />
      <Route path="/view/:token" component={ClinicianViewPage} />
      <Route path="/my-intakes" component={MyIntakesPage} />
      <Route path="/my-medications" component={MyMedicationsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="medbridge-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
