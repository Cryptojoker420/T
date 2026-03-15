import { ReactNode } from "react";
import { useLocation } from "wouter";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { motion } from "framer-motion";

const FULL_BLEED_ROUTES = ["/ide"];

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const isFullBleed = FULL_BLEED_ROUTES.some(r => location.startsWith(r));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative">
      <TopBar />
      
      <div className="flex flex-1 overflow-hidden relative z-10">
        <Sidebar />
        {isFullBleed ? (
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto p-6">
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="max-w-7xl mx-auto h-full"
            >
              {children}
            </motion.div>
          </main>
        )}
      </div>
    </div>
  );
}
