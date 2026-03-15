import { Link } from "wouter";
import { useAppStore } from "@/store/useAppStore";
import { useListChains } from "@workspace/api-client-react";
import { ConnectButton, darkTheme } from "thirdweb/react";
import { useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import { thirdwebClient, wallets } from "@/lib/thirdweb";
import { Badge } from "@/components/shared";
import { Shield, ShieldAlert, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function TopBar() {
  const { activeChainId, setActiveChainId, isPrivateTx, togglePrivateTx } = useAppStore();
  const { data: dbChains } = useListChains();
  const account = useActiveAccount();
  const activeWalletChain = useActiveWalletChain();

  const [isChainOpen, setIsChainOpen] = useState(false);

  const activeChain = dbChains?.find(c => c.chainId === activeChainId) || dbChains?.[0];

  useEffect(() => {
    if (activeWalletChain?.id && activeWalletChain.id !== activeChainId) {
      setActiveChainId(activeWalletChain.id);
    }
  }, [activeWalletChain?.id]);

  const handleChainSwitch = (chainId: number) => {
    setActiveChainId(chainId);
    setIsChainOpen(false);
  };

  return (
    <header className="h-14 w-full border-b border-border bg-background sticky top-0 z-40 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center group select-none">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Teh Truth" className="h-10 w-auto object-contain" />
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={togglePrivateTx}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border transition-all text-xs font-medium ${
            isPrivateTx 
              ? "bg-success/10 border-success/20 text-success" 
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {isPrivateTx ? <Shield className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
          <span>
            {isPrivateTx ? "Private TX" : "Public TX"}
          </span>
        </button>

        <div className="relative">
          <button 
            onClick={() => setIsChainOpen(!isChainOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 hover:bg-secondary rounded-md border border-border text-xs font-medium transition-colors"
          >
            {activeChain?.name || "Select Chain"}
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          
          <AnimatePresence>
            {isChainOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute top-full mt-1 right-0 w-48 bg-card border border-border rounded-md shadow-md py-1 z-50"
              >
                {dbChains?.map((chain) => (
                  <button
                    key={chain.chainId}
                    onClick={() => handleChainSwitch(chain.chainId)}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between ${
                      activeChainId === chain.chainId 
                        ? "bg-primary/10 text-primary font-medium" 
                        : "hover:bg-secondary text-foreground"
                    }`}
                  >
                    <span>{chain.name}</span>
                    {chain.isTestnet && <Badge variant="outline" className="text-[9px] py-0">Testnet</Badge>}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ConnectButton
          client={thirdwebClient}
          wallets={wallets}
          connectButton={{
            label: "Connect",
            style: {
              height: "30px",
              minWidth: "auto",
              padding: "0 12px",
              fontSize: "12px",
              fontWeight: 500,
              borderRadius: "6px",
            },
          }}
          detailsButton={{
            style: {
              height: "30px",
              minWidth: "auto",
              padding: "0 10px",
              fontSize: "12px",
              borderRadius: "6px",
            },
          }}
          connectModal={{
            showThirdwebBranding: false,
            size: "compact",
            title: "Sign In",
          }}
          theme={darkTheme({
            colors: { modalBg: "hsl(0, 0%, 4%)" },
          })}
        />
      </div>
    </header>
  );
}
