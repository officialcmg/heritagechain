
import { WagmiProvider } from "wagmi";
import { config } from "./config/web3";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConnectKitProvider } from "connectkit";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Beneficiaries from "./pages/Beneficiaries";
import Triggers from "./pages/Triggers";
import Status from "./pages/Status";
import NotFound from "./pages/NotFound";
import CreateLegacyPlan from "./pages/CreateLegacyPlan";

const queryClient = new QueryClient();

const App = () => (
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <ConnectKitProvider
        customTheme={{
          "--ck-font-family": "Inter, sans-serif",
          "--ck-border-radius": "12px",
          "--ck-overlay-background": "rgba(0, 0, 0, 0.8)",
          "--ck-body-background": "#111111",
          "--ck-body-color": "#ffffff",
          "--ck-primary-button-background": "#22c55e",
          "--ck-primary-button-hover-background": "#16a34a",
          "--ck-primary-button-color": "white",
          "--ck-secondary-button-background": "rgba(0, 0, 0, 0.6)",
          "--ck-secondary-button-border-color": "rgba(255, 255, 255, 0.1)",
          "--ck-secondary-button-hover-background": "rgba(0, 0, 0, 0.7)",
          "--ck-body-color-muted": "rgba(255, 255, 255, 0.6)",
          "--ck-body-color-muted-hover": "#ffffff",
          "--ck-body-background-secondary": "#1a1a1a",
          "--ck-body-background-tertiary": "#242424",
          "--ck-body-color-danger": "#ee4b5f",
          "--ck-body-color-valid": "#22c55e",
        }}
      >
        <TooltipProvider>
          <div className="starry-background" />
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/beneficiaries" element={<Beneficiaries />} />
                <Route path="/triggers" element={<Triggers />} />
                <Route path="/status" element={<Status />} />
                <Route path="/create-legacy-plan" element={<CreateLegacyPlan />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </BrowserRouter>
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </ConnectKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

export default App;
