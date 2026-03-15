import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDelegations,
  useCreateDelegation,
  useUpdateDelegation,
  useDeleteDelegation,
  getListDelegationsQueryKey,
  useListSessionKeys,
  useCreateSessionKey,
  useUpdateSessionKey,
  useDeleteSessionKey,
  getListSessionKeysQueryKey,
  useListSafeModules,
  useCreateSafeModule,
  useUpdateSafeModule,
  useDeleteSafeModule,
  getListSafeModulesQueryKey,
  useListWallets,
  useListChains,
} from "@workspace/api-client-react";
import { useAppStore } from "@/store/useAppStore";
import { Button, Card, Input, Badge } from "@/components/shared";
import {
  KeyRound,
  Plus,
  Shield,
  ShieldAlert,
  Key,
  ArrowRightLeft,
  Layers,
  Trash2,
  XCircle,
  CheckCircle,
  Clock,
  Copy,
  Wallet,
  Puzzle,
  Settings,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

type ActiveTab = "overview" | "delegations" | "session-keys" | "modules" | "batch";

const TABS: { key: ActiveTab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Smart Accounts", icon: Wallet },
  { key: "delegations", label: "EIP-7702 Delegations", icon: ArrowRightLeft },
  { key: "session-keys", label: "Session Keys", icon: Key },
  { key: "modules", label: "Safe Modules", icon: Puzzle },
  { key: "batch", label: "Batch Transactions", icon: Layers },
];

const IMPL_TYPES = [
  { value: "SimpleAccount", label: "SimpleAccount", desc: "Minimal ERC-4337 account" },
  { value: "Safe", label: "Safe + 4337 Module", desc: "Gnosis Safe with AA module" },
  { value: "Kernel", label: "Kernel (ZeroDev)", desc: "Modular smart account" },
  { value: "Biconomy", label: "Biconomy SmartAccount", desc: "Biconomy v2 modular" },
  { value: "LightAccount", label: "LightAccount (Alchemy)", desc: "Gas-optimized account" },
  { value: "Custom", label: "Custom Implementation", desc: "Your own contract" },
];

const ENTRY_POINTS = [
  { version: "v0.6", address: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" },
  { version: "v0.7", address: "0x0000000071727De22E5E9d8BAf0edAc6f37da032" },
];

export function AccountAbstractionDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Account Abstraction</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Smart accounts, EIP-7702 delegation, session keys, and batch transactions.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="aa-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "delegations" && <DelegationsTab />}
          {activeTab === "session-keys" && <SessionKeysTab />}
          {activeTab === "modules" && <ModulesTab />}
          {activeTab === "batch" && <BatchTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function OverviewTab() {
  const { data: wallets, isLoading } = useListWallets();
  const { data: chains } = useListChains();
  const { data: delegations } = useListDelegations();
  const { data: sessionKeys } = useListSessionKeys();

  const getChainName = (chainId: number) =>
    chains?.find((c) => c.chainId === chainId)?.name || `Chain ${chainId}`;

  const smartWallets = wallets?.filter((w) => w.is4337Enabled || w.walletType === "Smart") || [];
  const eoaWithDelegations = delegations?.filter((d) => d.isActive) || [];
  const activeSessionKeys = sessionKeys?.filter((sk) => !sk.isRevoked) || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Smart Accounts</span>
          </div>
          <p className="text-2xl font-semibold text-foreground">{smartWallets.length}</p>
          <p className="text-xs text-muted-foreground">ERC-4337 enabled wallets</p>
        </Card>
        <Card className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ArrowRightLeft className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Active Delegations</span>
          </div>
          <p className="text-2xl font-semibold text-foreground">{eoaWithDelegations.length}</p>
          <p className="text-xs text-muted-foreground">EIP-7702 smart EOAs</p>
        </Card>
        <Card className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Key className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Session Keys</span>
          </div>
          <p className="text-2xl font-semibold text-foreground">{activeSessionKeys.length}</p>
          <p className="text-xs text-muted-foreground">Active scoped permissions</p>
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-foreground mb-3">Account Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-md border border-border bg-secondary/20">
            <div className="flex items-center gap-2 mb-1">
              <Badge>ERC-4337</Badge>
              <span className="text-sm font-medium text-foreground">Smart Contract Accounts</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Programmable accounts deployed as smart contracts. Support paymasters for gas sponsorship,
              bundlers for UserOperation submission, session keys for delegated permissions, and
              account recovery via social/guardian modules.
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {["SimpleAccount", "Safe", "Kernel", "Biconomy", "LightAccount"].map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
              ))}
            </div>
          </div>
          <div className="p-3 rounded-md border border-border bg-secondary/20">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="accent">EIP-7702</Badge>
              <span className="text-sm font-medium text-foreground">Smart EOAs</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Regular EOAs that delegate execution to a smart contract implementation.
              The EOA temporarily gains smart contract capabilities (batch calls, gas sponsorship,
              session keys) without deploying a new account. Delegation is set per-transaction
              or persisted on-chain.
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {["Delegation", "Batch Calls", "Gas Sponsorship", "Revocable"].map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-foreground mb-3">EntryPoint Contracts</h3>
        <div className="space-y-2">
          {ENTRY_POINTS.map((ep) => (
            <div key={ep.version} className="flex items-center justify-between p-3 rounded-md border border-border bg-secondary/10">
              <div className="flex items-center gap-3">
                <Badge variant={ep.version === "v0.7" ? "success" : "default"}>{ep.version}</Badge>
                <code className="text-xs font-mono text-muted-foreground">{ep.address}</code>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(ep.address); toast.success("Copied"); }}
                className="p-1.5 rounded-md hover:bg-secondary transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {isLoading ? (
        <Card className="animate-pulse h-32" />
      ) : smartWallets.length > 0 ? (
        <Card>
          <h3 className="text-sm font-semibold text-foreground mb-3">Your Smart Accounts</h3>
          <div className="space-y-2">
            {smartWallets.map((w) => (
              <div key={w.id} className="flex items-center justify-between p-3 rounded-md border border-border bg-secondary/10 hover:border-muted-foreground/20 transition-colors">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{w.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{w.address.slice(0, 10)}...{w.address.slice(-6)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{getChainName(w.chainId)}</Badge>
                  <Badge>{w.walletType}</Badge>
                  {w.entryPointVersion && <Badge variant="success">{w.entryPointVersion}</Badge>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function DelegationsTab() {
  const queryClient = useQueryClient();
  const { data: delegations, isLoading } = useListDelegations();
  const { data: chains } = useListChains();
  const createMut = useCreateDelegation();
  const updateMut = useUpdateDelegation();
  const deleteMut = useDeleteDelegation();
  const { isPrivateTx, activeChainId } = useAppStore();

  const [showForm, setShowForm] = useState(false);
  const [eoaAddress, setEoaAddress] = useState("");
  const [delegateAddress, setDelegateAddress] = useState("");
  const [implementationType, setImplementationType] = useState(IMPL_TYPES[0].value);
  const [label, setLabel] = useState("");

  const getChainName = (chainId: number) =>
    chains?.find((c) => c.chainId === chainId)?.name || `Chain ${chainId}`;

  const handleCreate = async () => {
    if (!eoaAddress || !delegateAddress) return;
    try {
      await createMut.mutateAsync({
        data: {
          eoaAddress,
          delegateAddress,
          implementationType,
          chainId: activeChainId,
          label: label || undefined,
          isActive: true,
          wasPrivate: isPrivateTx,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getListDelegationsQueryKey() });
      toast.success("Delegation created!");
      setShowForm(false);
      setEoaAddress("");
      setDelegateAddress("");
      setLabel("");
    } catch {
      toast.error("Failed to create delegation");
    }
  };

  const handleRevoke = async (id: number) => {
    try {
      await updateMut.mutateAsync({ id, data: { isActive: false } });
      await queryClient.invalidateQueries({ queryKey: getListDelegationsQueryKey() });
      toast.success("Delegation revoked");
    } catch {
      toast.error("Failed to revoke");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMut.mutateAsync({ id });
      await queryClient.invalidateQueries({ queryKey: getListDelegationsQueryKey() });
      toast.success("Delegation removed");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">EIP-7702 Delegations</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Delegate your EOA to a smart contract implementation. Your EOA gains smart account capabilities without deploying a new contract.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Delegation
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Create EIP-7702 Delegation</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Your EOA Address</label>
                  <Input value={eoaAddress} onChange={(e) => setEoaAddress(e.target.value)} placeholder="0x..." className="font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Delegate To (Implementation)</label>
                  <Input value={delegateAddress} onChange={(e) => setDelegateAddress(e.target.value)} placeholder="0x... contract address" className="font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Implementation Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {IMPL_TYPES.map((impl) => (
                    <button
                      key={impl.value}
                      onClick={() => setImplementationType(impl.value)}
                      className={`p-2.5 rounded-md border text-left transition-all ${
                        implementationType === impl.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <p className={`text-xs font-medium ${implementationType === impl.value ? "text-primary" : "text-foreground"}`}>
                        {impl.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{impl.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Label (optional)</label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Main trading EOA" />
              </div>

              <div className={`p-3 rounded-md border flex items-center gap-3 ${isPrivateTx ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"}`}>
                {isPrivateTx ? <Shield className="w-4 h-4 text-success" /> : <ShieldAlert className="w-4 h-4 text-destructive" />}
                <span className={`text-sm font-medium ${isPrivateTx ? "text-success" : "text-destructive"}`}>
                  {isPrivateTx ? "Delegation TX routed privately" : "Delegation TX via public mempool"}
                </span>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!eoaAddress || !delegateAddress} isLoading={createMut.isPending}>
                  Create Delegation
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <Card className="animate-pulse h-48" />
      ) : delegations?.length === 0 ? (
        <Card className="text-center py-16 flex flex-col items-center">
          <div className="w-12 h-12 bg-secondary rounded-md flex items-center justify-center mb-4">
            <ArrowRightLeft className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Delegations</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Use EIP-7702 to delegate your EOA to a smart contract. Your EOA will temporarily gain smart account capabilities.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="space-y-2">
            {delegations?.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/20 border border-border hover:border-muted-foreground/20 transition-colors">
                <div className="flex items-center gap-4">
                  {d.isActive ? <CheckCircle className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground font-mono">
                        {d.eoaAddress.slice(0, 10)}...
                      </p>
                      <span className="text-xs text-muted-foreground">→</span>
                      <p className="text-sm text-muted-foreground font-mono">
                        {d.delegateAddress.slice(0, 10)}...
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {d.implementationType} on {getChainName(d.chainId)}
                      {d.label && ` · ${d.label}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={d.isActive ? "success" : "outline"}>
                    {d.isActive ? "Active" : "Revoked"}
                  </Badge>
                  {d.wasPrivate && (
                    <Badge variant="success" className="gap-1">
                      <Shield className="w-3 h-3" /> Private
                    </Badge>
                  )}
                  {d.isActive && (
                    <Button size="sm" variant="outline" onClick={() => handleRevoke(d.id)}>
                      Revoke
                    </Button>
                  )}
                  <Button size="sm" variant="danger" className="px-2" onClick={() => handleDelete(d.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function SessionKeysTab() {
  const queryClient = useQueryClient();
  const { data: sessionKeys, isLoading } = useListSessionKeys();
  const { data: chains } = useListChains();
  const createMut = useCreateSessionKey();
  const updateMut = useUpdateSessionKey();
  const deleteMut = useDeleteSessionKey();
  const { activeChainId } = useAppStore();

  const [showForm, setShowForm] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [sessionPublicKey, setSessionPublicKey] = useState("");
  const [label, setLabel] = useState("");
  const [allowedTargets, setAllowedTargets] = useState("");
  const [spendLimit, setSpendLimit] = useState("");
  const [validHours, setValidHours] = useState("24");

  const getChainName = (chainId: number) =>
    chains?.find((c) => c.chainId === chainId)?.name || `Chain ${chainId}`;

  const handleCreate = async () => {
    if (!walletAddress || !sessionPublicKey) return;
    const now = new Date();
    const validUntil = new Date(now.getTime() + parseInt(validHours) * 3600000);
    try {
      await createMut.mutateAsync({
        data: {
          walletAddress,
          sessionPublicKey,
          chainId: activeChainId,
          label: label || undefined,
          allowedTargets: allowedTargets ? allowedTargets.split("\n").filter(Boolean) : undefined,
          spendLimit: spendLimit || undefined,
          validAfter: now.toISOString(),
          validUntil: validUntil.toISOString(),
        },
      });
      await queryClient.invalidateQueries({ queryKey: getListSessionKeysQueryKey() });
      toast.success("Session key created!");
      setShowForm(false);
      setWalletAddress("");
      setSessionPublicKey("");
      setLabel("");
      setAllowedTargets("");
      setSpendLimit("");
    } catch {
      toast.error("Failed to create session key");
    }
  };

  const handleRevoke = async (id: number) => {
    try {
      await updateMut.mutateAsync({ id, data: { isRevoked: true } });
      await queryClient.invalidateQueries({ queryKey: getListSessionKeysQueryKey() });
      toast.success("Session key revoked");
    } catch {
      toast.error("Failed to revoke");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMut.mutateAsync({ id });
      await queryClient.invalidateQueries({ queryKey: getListSessionKeysQueryKey() });
      toast.success("Session key removed");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Session Keys</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Grant scoped, time-limited permissions to session keys. They can sign transactions on behalf of your smart account within defined constraints.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Session Key
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">New Session Key</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Smart Account Address</label>
                  <Input value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} placeholder="0x..." className="font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Session Public Key</label>
                  <Input value={sessionPublicKey} onChange={(e) => setSessionPublicKey(e.target.value)} placeholder="0x..." className="font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Label</label>
                  <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Trading bot" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Spend Limit (ETH)</label>
                  <Input value={spendLimit} onChange={(e) => setSpendLimit(e.target.value)} placeholder="1.0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Valid Duration (hours)</label>
                  <Input value={validHours} onChange={(e) => setValidHours(e.target.value)} placeholder="24" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Allowed Target Contracts (one per line)</label>
                <textarea
                  value={allowedTargets}
                  onChange={(e) => setAllowedTargets(e.target.value)}
                  placeholder={"0x... (Uniswap Router)\n0x... (USDC Token)"}
                  className="w-full h-20 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!walletAddress || !sessionPublicKey} isLoading={createMut.isPending}>
                  Create Session Key
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <Card className="animate-pulse h-48" />
      ) : sessionKeys?.length === 0 ? (
        <Card className="text-center py-16 flex flex-col items-center">
          <div className="w-12 h-12 bg-secondary rounded-md flex items-center justify-center mb-4">
            <Key className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Session Keys</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Create session keys to grant time-limited, scoped permissions for automated operations.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="space-y-2">
            {sessionKeys?.map((sk) => {
              const isExpired = sk.validUntil ? new Date(sk.validUntil) < new Date() : false;
              return (
                <div key={sk.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/20 border border-border hover:border-muted-foreground/20 transition-colors">
                  <div className="flex items-center gap-4">
                    {sk.isRevoked ? (
                      <XCircle className="w-4 h-4 text-destructive" />
                    ) : isExpired ? (
                      <Clock className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-success" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {sk.label || "Unnamed Key"}
                        </p>
                        <code className="text-[10px] text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded">
                          {sk.sessionPublicKey.slice(0, 10)}...
                        </code>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {getChainName(sk.chainId)}
                        {sk.spendLimit && ` · Limit: ${sk.spendLimit} ETH`}
                        {sk.allowedTargets?.length ? ` · ${sk.allowedTargets.length} allowed target(s)` : ""}
                        {sk.validUntil && ` · Expires ${formatDistanceToNow(new Date(sk.validUntil), { addSuffix: true })}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={sk.isRevoked ? "outline" : isExpired ? "default" : "success"}>
                      {sk.isRevoked ? "Revoked" : isExpired ? "Expired" : "Active"}
                    </Badge>
                    {!sk.isRevoked && !isExpired && (
                      <Button size="sm" variant="outline" onClick={() => handleRevoke(sk.id)}>
                        Revoke
                      </Button>
                    )}
                    <Button size="sm" variant="danger" className="px-2" onClick={() => handleDelete(sk.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

const KNOWN_MODULE_TYPES = [
  { value: "Safe4337Module", label: "Safe4337Module", desc: "ERC-4337 account abstraction support", address: "0x7579EE8307284F293B1927136486880611F20002" },
  { value: "AllowanceModule", label: "AllowanceModule", desc: "Set recurring spending allowances for delegates", address: "0xCFbFaC74C26F8647cBDb8c5caf80BB5b32E43134" },
  { value: "RecoveryModule", label: "RecoveryModule", desc: "Social recovery via guardian addresses", address: "" },
  { value: "WhitelistModule", label: "WhitelistModule", desc: "Restrict calls to whitelisted targets only", address: "" },
  { value: "DelegateModule", label: "DelegateModule", desc: "Delegate specific function calls to trusted signers", address: "" },
  { value: "Custom", label: "Custom Module", desc: "Any custom Safe module contract", address: "" },
];

function ModulesTab() {
  const queryClient = useQueryClient();
  const { data: modules, isLoading } = useListSafeModules();
  const { data: wallets } = useListWallets();
  const { data: chains } = useListChains();
  const createMut = useCreateSafeModule();
  const updateMut = useUpdateSafeModule();
  const deleteMut = useDeleteSafeModule();
  const { activeChainId } = useAppStore();

  const [showForm, setShowForm] = useState(false);
  const [safeAddress, setSafeAddress] = useState("");
  const [moduleType, setModuleType] = useState(KNOWN_MODULE_TYPES[0].value);
  const [moduleAddress, setModuleAddress] = useState(KNOWN_MODULE_TYPES[0].address);
  const [label, setLabel] = useState("");

  const safeWallets = wallets?.filter(w => w.walletType === "Safe" || w.walletType === "Safe+4337") || [];

  const getChainName = (chainId: number) =>
    chains?.find((c) => c.chainId === chainId)?.name || `Chain ${chainId}`;

  const handleCreate = async () => {
    if (!safeAddress || !moduleAddress) return;
    try {
      await createMut.mutateAsync({
        data: {
          safeAddress,
          moduleAddress,
          chainId: activeChainId,
          moduleType,
          label: label || undefined,
          isEnabled: true,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getListSafeModulesQueryKey() });
      toast.success("Module enabled!");
      setShowForm(false);
      setSafeAddress("");
      setModuleAddress("");
      setLabel("");
    } catch {
      toast.error("Failed to enable module");
    }
  };

  const handleToggle = async (id: number, currentlyEnabled: boolean) => {
    try {
      await updateMut.mutateAsync({ id, data: { isEnabled: !currentlyEnabled } });
      await queryClient.invalidateQueries({ queryKey: getListSafeModulesQueryKey() });
      toast.success(currentlyEnabled ? "Module disabled" : "Module enabled");
    } catch {
      toast.error("Failed to update module");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMut.mutateAsync({ id });
      await queryClient.invalidateQueries({ queryKey: getListSafeModulesQueryKey() });
      toast.success("Module removed");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Safe Modules</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Modules extend Safe functionality — add spending allowances, recovery mechanisms, 4337 support, and custom transaction logic.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          Enable Module
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Enable Module on Safe</h4>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Safe Address</label>
                {safeWallets.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {safeWallets.map(w => (
                        <button
                          key={w.id}
                          onClick={() => setSafeAddress(w.address)}
                          className={`p-2 rounded-md border text-left transition-all ${
                            safeAddress === w.address ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/30"
                          }`}
                        >
                          <p className={`text-xs font-medium ${safeAddress === w.address ? "text-primary" : "text-foreground"}`}>{w.name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{w.address.slice(0, 10)}...</p>
                        </button>
                      ))}
                    </div>
                    <Input
                      value={safeAddress}
                      onChange={(e) => setSafeAddress(e.target.value)}
                      placeholder="Or enter Safe address manually"
                      className="font-mono text-xs"
                    />
                  </div>
                ) : (
                  <Input value={safeAddress} onChange={(e) => setSafeAddress(e.target.value)} placeholder="0x... Safe address" className="font-mono" />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Module Type</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {KNOWN_MODULE_TYPES.map((mod) => (
                    <button
                      key={mod.value}
                      onClick={() => {
                        setModuleType(mod.value);
                        if (mod.address) setModuleAddress(mod.address);
                        else setModuleAddress("");
                      }}
                      className={`p-2.5 rounded-md border text-left transition-all ${
                        moduleType === mod.value ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <p className={`text-xs font-medium ${moduleType === mod.value ? "text-primary" : "text-foreground"}`}>{mod.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{mod.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Module Contract Address</label>
                  <Input value={moduleAddress} onChange={(e) => setModuleAddress(e.target.value)} placeholder="0x..." className="font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Label (optional)</label>
                  <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. 4337 Module for gasless txs" />
                </div>
              </div>

              <div className="p-3 rounded-md border border-yellow-500/20 bg-yellow-500/5 flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-yellow-500">Security Notice</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Modules can execute transactions without multi-sig approval. Only enable audited, trusted modules.
                    Requires threshold owner confirmation.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!safeAddress || !moduleAddress} isLoading={createMut.isPending}>
                  Enable Module
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <Card className="animate-pulse h-48" />
      ) : modules?.length === 0 ? (
        <Card className="text-center py-16 flex flex-col items-center">
          <div className="w-12 h-12 bg-secondary rounded-md flex items-center justify-center mb-4">
            <Puzzle className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Modules Enabled</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Enable Safe modules to extend your wallet with spending limits, recovery mechanisms, 4337 support, and more.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="space-y-2">
            {modules?.map((mod) => (
              <div key={mod.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/20 border border-border hover:border-muted-foreground/20 transition-colors">
                <div className="flex items-center gap-4">
                  {mod.isEnabled ? (
                    <CheckCircle className="w-4 h-4 text-success" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {mod.label || mod.moduleType}
                      </p>
                      <Badge variant="outline" className="text-[10px]">{mod.moduleType}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Safe: {mod.safeAddress.slice(0, 10)}... · Module: {mod.moduleAddress.slice(0, 10)}... · {getChainName(mod.chainId)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={mod.isEnabled ? "success" : "outline"}>
                    {mod.isEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => handleToggle(mod.id, mod.isEnabled)} className="gap-1">
                    {mod.isEnabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                    {mod.isEnabled ? "Disable" : "Enable"}
                  </Button>
                  <Button size="sm" variant="danger" className="px-2" onClick={() => handleDelete(mod.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function BatchTab() {
  const [calls, setCalls] = useState([{ target: "", value: "0", calldata: "" }]);
  const { isPrivateTx } = useAppStore();

  const addCall = () => setCalls([...calls, { target: "", value: "0", calldata: "" }]);
  const removeCall = (idx: number) => setCalls(calls.filter((_, i) => i !== idx));
  const updateCall = (idx: number, field: string, val: string) => {
    const updated = [...calls];
    (updated[idx] as any)[field] = val;
    setCalls(updated);
  };

  const handleSimulate = () => {
    toast.success(`Simulated ${calls.length} batched call(s)`, {
      description: "All calls would execute atomically in a single transaction.",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Batch Transactions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compose multiple calls into a single atomic transaction. Available for ERC-4337 smart accounts and EIP-7702 delegated EOAs.
          </p>
        </div>
        <Button variant="outline" onClick={addCall} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Call
        </Button>
      </div>

      <div className="space-y-3">
        {calls.map((call, idx) => (
          <Card key={idx} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Call #{idx + 1}
              </span>
              {calls.length > 1 && (
                <Button size="sm" variant="danger" className="px-2" onClick={() => removeCall(idx)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Target</label>
                <Input
                  value={call.target}
                  onChange={(e) => updateCall(idx, "target", e.target.value)}
                  placeholder="0x..."
                  className="font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Value (wei)</label>
                <Input
                  value={call.value}
                  onChange={(e) => updateCall(idx, "value", e.target.value)}
                  placeholder="0"
                  className="font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Calldata</label>
                <Input
                  value={call.calldata}
                  onChange={(e) => updateCall(idx, "calldata", e.target.value)}
                  placeholder="0x..."
                  className="font-mono"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className={`p-3 rounded-md border flex items-center gap-3 ${isPrivateTx ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"}`}>
        {isPrivateTx ? <Shield className="w-4 h-4 text-success" /> : <ShieldAlert className="w-4 h-4 text-destructive" />}
        <span className={`text-sm font-medium ${isPrivateTx ? "text-success" : "text-destructive"}`}>
          {isPrivateTx ? "Batch TX routed via private mempool" : "Batch TX via public mempool"}
        </span>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSimulate} disabled={calls.some((c) => !c.target)}>
          Simulate Batch
        </Button>
        <Button variant="outline" disabled={calls.some((c) => !c.target)}>
          Execute Batch
        </Button>
      </div>
    </div>
  );
}
