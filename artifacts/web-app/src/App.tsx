import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThirdwebProvider } from "thirdweb/react";
import { Toaster } from "sonner";

import { AppLayout } from "@/components/layout/AppLayout";
import { SolidityIDE } from "@/pages/ide/SolidityIDE";
import { WalletList } from "@/pages/wallets/WalletList";
import { DeployWallet } from "@/pages/wallets/DeployWallet";
import { WalletDetail } from "@/pages/wallets/WalletDetail";
import { WalletTools } from "@/pages/wallets/WalletTools";
import { TokenList } from "@/pages/tokens/TokenList";
import { DeployToken } from "@/pages/tokens/DeployToken";
import { TokenDetail } from "@/pages/tokens/TokenDetail";
import { ContractList } from "@/pages/contracts/ContractList";
import { RegisterContract } from "@/pages/contracts/RegisterContract";
import { ContractDetail } from "@/pages/contracts/ContractDetail";
import { BridgeDashboard } from "@/pages/bridges/BridgeDashboard";
import { MevDashboard } from "@/pages/mev/MevDashboard";
import { DevToolsDashboard } from "@/pages/dev-tools/DevToolsDashboard";
import { AccountAbstractionDashboard } from "@/pages/account-abstraction/AccountAbstractionDashboard";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRouter() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/">
          <Redirect to="/ide" />
        </Route>
        
        <Route path="/ide" component={SolidityIDE} />
        
        <Route path="/wallets" component={WalletList} />
        <Route path="/wallets/deploy" component={DeployWallet} />
        <Route path="/wallets/tools" component={WalletTools} />
        <Route path="/wallets/:id" component={WalletDetail} />
        
        <Route path="/account-abstraction" component={AccountAbstractionDashboard} />
        
        <Route path="/tokens" component={TokenList} />
        <Route path="/tokens/deploy" component={DeployToken} />
        <Route path="/tokens/:id" component={TokenDetail} />
        
        <Route path="/contracts" component={ContractList} />
        <Route path="/contracts/register" component={RegisterContract} />
        <Route path="/contracts/:id" component={ContractDetail} />
        
        <Route path="/bridges" component={BridgeDashboard} />
        
        <Route path="/mev" component={MevDashboard} />
        
        <Route path="/dev-tools" component={DevToolsDashboard} />

        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ThirdwebProvider>
      <QueryClientProvider client={queryClient}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRouter />
        </WouterRouter>
        <Toaster theme="dark" position="bottom-right" className="font-sans" />
      </QueryClientProvider>
    </ThirdwebProvider>
  );
}

export default App;
