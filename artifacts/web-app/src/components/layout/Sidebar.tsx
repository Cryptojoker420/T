import { Link, useLocation } from "wouter";
import { Wallet, Coins, FileCode2, ArrowRightLeft, Zap, Wrench, KeyRound, Code2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/components/shared";

const NAV_ITEMS = [
  { path: "/ide", label: "Solidity IDE", icon: Code2 },
  { path: "/wallets", label: "Wallets", icon: Wallet },
  { path: "/account-abstraction", label: "Smart Accounts", icon: KeyRound },
  { path: "/tokens", label: "Tokens", icon: Coins },
  { path: "/contracts", label: "Contracts", icon: FileCode2 },
  { path: "/bridges", label: "Bridges", icon: ArrowRightLeft },
  { path: "/mev", label: "MEV Tooling", icon: Zap },
  { path: "/dev-tools", label: "Dev Tools", icon: Wrench },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-56 border-r border-border bg-card/30 h-[calc(100vh-3.5rem)] py-4 flex flex-col gap-1">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-6">
        Workbench
      </div>
      
      <nav className="px-3 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location.startsWith(item.path);
          const Icon = item.icon;
          
          return (
            <Link key={item.path} href={item.path} className="relative block">
              {isActive && (
                <motion.div 
                  layoutId="sidebar-active"
                  className="absolute left-0 top-[10%] bottom-[10%] w-1 bg-primary rounded-r-md"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className={cn(
                "relative flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive ? "text-foreground bg-secondary/50" : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
              )}>
                <Icon className="w-4 h-4" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>
      
      <div className="mt-auto px-6 py-2">
        <p className="text-xs text-muted-foreground">v1.0.0</p>
      </div>
    </aside>
  );
}
