import { useState } from "react";
import { useLocation } from "wouter";
import { useListChains, useCreateWallet, usePredictWalletAddress } from "@workspace/api-client-react";
import { useAppStore } from "@/store/useAppStore";
import { useActiveAccount } from "thirdweb/react";
import { Button, Card, Input, Badge } from "@/components/shared";
import { Plus, X, Shield, ShieldAlert, ArrowRight, Check, Wallet, Globe, Copy, Hash } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const SAFE_VERSIONS = ["1.4.1", "1.3.0"] as const;

const KNOWN_FACTORIES: Record<string, string> = {
  "1.4.1": "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67",
  "1.3.0": "0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2",
};

const KNOWN_FALLBACK_HANDLERS: Record<string, string> = {
  "1.4.1": "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4",
  "1.3.0": "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4",
};

export function DeployWallet() {
  const [, setLocation] = useLocation();
  const { isPrivateTx } = useAppStore();
  const activeAccount = useActiveAccount();
  const connectedWallet = activeAccount?.address;
  const { data: chains } = useListChains();
  const createWalletMut = useCreateWallet();
  const predictAddressMut = usePredictWalletAddress();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [selectedChainIds, setSelectedChainIds] = useState<number[]>([1]);
  const [walletType, setWalletType] = useState<string>("Safe");
  const [safeVersion, setSafeVersion] = useState<string>("1.4.1");
  const [entryPointVersion, setEntryPointVersion] = useState<string>("v0.7");
  const [implementation, setImplementation] = useState<string>("");
  const [factoryAddress, setFactoryAddress] = useState<string>("");
  const [fallbackHandler, setFallbackHandler] = useState<string>("");
  const [saltNonce, setSaltNonce] = useState<string>(() => Date.now().toString());
  
  const [owners, setOwners] = useState<string[]>(connectedWallet ? [connectedWallet] : [""]);
  const [threshold, setThreshold] = useState<number>(1);

  const [predictedAddresses, setPredictedAddresses] = useState<Record<number, string>>({});
  const [isPredicting, setIsPredicting] = useState(false);

  const is4337Account = walletType !== "Safe" && walletType !== "EIP-7702";
  const isSmartAccount = walletType !== "Safe";
  const is7702 = walletType === "EIP-7702";
  const isSafeType = walletType === "Safe" || walletType === "Safe+4337";

  const handleAddOwner = () => setOwners([...owners, ""]);
  const handleRemoveOwner = (idx: number) => setOwners(owners.filter((_, i) => i !== idx));
  const handleOwnerChange = (idx: number, val: string) => {
    const newOwners = [...owners];
    newOwners[idx] = val;
    setOwners(newOwners);
  };

  const toggleChain = (chainId: number) => {
    if (selectedChainIds.includes(chainId)) {
      if (selectedChainIds.length > 1) {
        setSelectedChainIds(selectedChainIds.filter(id => id !== chainId));
      }
    } else {
      setSelectedChainIds([...selectedChainIds, chainId]);
    }
  };

  const handlePredictAddresses = async () => {
    setIsPredicting(true);
    const results: Record<number, string> = {};
    for (const cid of selectedChainIds) {
      try {
        const result = await predictAddressMut.mutateAsync({
          data: {
            owners: owners.filter(o => o.trim() !== ""),
            threshold,
            chainId: cid,
            saltNonce,
            safeVersion: isSafeType ? safeVersion : undefined,
            factoryAddress: factoryAddress || undefined,
            fallbackHandler: fallbackHandler || undefined,
          }
        });
        results[cid] = result.predictedAddress;
      } catch {
        results[cid] = "Prediction failed";
      }
    }
    setPredictedAddresses(results);
    setIsPredicting(false);
  };

  const handleDeploy = async () => {
    if (isSafeType && selectedChainIds.some(cid => !predictedAddresses[cid])) {
      toast.error("Please predict addresses before deploying", { description: "Click 'Predict Address' on the Signers step first." });
      return;
    }

    try {
      let firstWallet: any = null;
      for (const cid of selectedChainIds) {
        const predictedAddress = predictedAddresses[cid];
        
        const wallet = await createWalletMut.mutateAsync({
          data: {
            name: selectedChainIds.length > 1 ? `${name} (${chains?.find(c => c.chainId === cid)?.name || cid})` : name,
            address: predictedAddress,
            chainId: cid,
            walletType,
            owners: owners.filter(o => o.trim() !== ""),
            threshold,
            privateTxDefault: isPrivateTx,
            is4337Enabled: is4337Account,
            entryPointVersion: is4337Account ? entryPointVersion : undefined,
            implementation: implementation || undefined,
            factoryAddress: isSafeType ? (factoryAddress || KNOWN_FACTORIES[safeVersion]) : (factoryAddress || undefined),
            safeVersion: isSafeType ? safeVersion : undefined,
            fallbackHandler: isSafeType ? (fallbackHandler || KNOWN_FALLBACK_HANDLERS[safeVersion]) : undefined,
            saltNonce,
            predictedAddress: predictedAddresses[cid] || undefined,
            salt: saltNonce,
            deployTxHash: undefined
          }
        });
        if (!firstWallet) firstWallet = wallet;
      }
      
      toast.success(
        selectedChainIds.length > 1
          ? `Wallet deployed on ${selectedChainIds.length} chains!`
          : "Wallet deployed successfully!",
        { description: selectedChainIds.length > 1 ? "Same address on all selected chains via CREATE2" : undefined }
      );
      if (firstWallet) setLocation(`/wallets/${firstWallet.id}`);
    } catch (err) {
      toast.error("Deployment failed");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-display text-foreground">Deploy Smart Wallet</h1>
          <p className="text-sm text-muted-foreground">SafeProxyFactory Deterministic Deployment</p>
        </div>
      </div>

      <div className="flex gap-3">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex-1">
            <div className={`h-1 rounded-full transition-colors duration-300 ${step >= s ? 'bg-primary' : 'bg-secondary'}`} />
            <p className={`mt-1.5 text-[10px] font-semibold uppercase tracking-wider ${step >= s ? 'text-primary' : 'text-muted-foreground'}`}>
              {s === 1 ? "Configuration" : s === 2 ? "Networks" : s === 3 ? "Signers" : "Review"}
            </p>
          </div>
        ))}
      </div>

      <Card className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Wallet Name</label>
                <Input 
                  placeholder="e.g. Treasury Multisig" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Account Type</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { value: "Safe", label: "Safe Multi-Sig", desc: "Standard Gnosis Safe" },
                    { value: "Safe+4337", label: "Safe + 4337", desc: "Safe with AA module" },
                    { value: "SimpleAccount", label: "SimpleAccount", desc: "Minimal ERC-4337" },
                    { value: "Kernel", label: "Kernel (ZeroDev)", desc: "Modular smart account" },
                    { value: "Biconomy", label: "Biconomy", desc: "Biconomy SmartAccount v2" },
                    { value: "EIP-7702", label: "EIP-7702 Smart EOA", desc: "Delegate EOA to contract" },
                  ].map((opt) => (
                    <div
                      key={opt.value}
                      onClick={() => setWalletType(opt.value)}
                      className={`p-2.5 rounded-md border cursor-pointer transition-all ${
                        walletType === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <h4 className={`text-xs font-medium mb-0.5 ${walletType === opt.value ? "text-primary" : "text-foreground"}`}>
                        {opt.label}
                      </h4>
                      <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {isSafeType && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Safe Version</label>
                      <div className="flex gap-2">
                        {SAFE_VERSIONS.map((v) => (
                          <button
                            key={v}
                            onClick={() => setSafeVersion(v)}
                            className={`flex-1 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                              safeVersion === v
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-foreground hover:border-muted-foreground/30"
                            }`}
                          >
                            v{v}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Salt Nonce</label>
                      <Input
                        value={saltNonce}
                        onChange={(e) => setSaltNonce(e.target.value)}
                        placeholder="Deterministic nonce"
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Factory Address</label>
                      <Input
                        value={factoryAddress}
                        onChange={(e) => setFactoryAddress(e.target.value)}
                        placeholder={KNOWN_FACTORIES[safeVersion] || "0x..."}
                        className="font-mono text-xs"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Leave empty for default SafeProxyFactory</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Fallback Handler</label>
                      <Input
                        value={fallbackHandler}
                        onChange={(e) => setFallbackHandler(e.target.value)}
                        placeholder={KNOWN_FALLBACK_HANDLERS[safeVersion] || "0x..."}
                        className="font-mono text-xs"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Handles ERC-721/1155 callbacks</p>
                    </div>
                  </div>
                </div>
              )}

              {isSmartAccount && !isSafeType && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">EntryPoint Version</label>
                      <div className="flex gap-2">
                        {["v0.6", "v0.7"].map((v) => (
                          <button
                            key={v}
                            onClick={() => setEntryPointVersion(v)}
                            className={`flex-1 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                              entryPointVersion === v
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-foreground hover:border-muted-foreground/30"
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                    {!is7702 && (
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Factory Address</label>
                        <Input
                          value={factoryAddress}
                          onChange={(e) => setFactoryAddress(e.target.value)}
                          placeholder="0x... (optional)"
                          className="font-mono text-xs"
                        />
                      </div>
                    )}
                  </div>
                  {is7702 && (
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Delegation Target (Implementation Contract)</label>
                      <Input
                        value={implementation}
                        onChange={(e) => setImplementation(e.target.value)}
                        placeholder="0x... contract to delegate to"
                        className="font-mono text-xs"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Button size="sm" onClick={() => setStep(2)} disabled={!name}>Next Step <ArrowRight className="ml-1.5 w-3.5 h-3.5" /></Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div>
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">Target Networks</label>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Select multiple chains for deterministic multi-chain deployment</p>
                  </div>
                  <Badge variant="accent">{selectedChainIds.length} selected</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {chains?.map(chain => (
                    <button
                      key={chain.chainId}
                      onClick={() => toggleChain(chain.chainId)}
                      className={`px-3 py-2.5 rounded-md border text-left transition-all ${
                        selectedChainIds.includes(chain.chainId) 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-muted-foreground/30 bg-secondary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${selectedChainIds.includes(chain.chainId) ? 'text-primary' : 'text-foreground'}`}>
                          {chain.name}
                        </span>
                        {selectedChainIds.includes(chain.chainId) && <Check className="w-3 h-3 text-primary" />}
                      </div>
                      <span className="text-[10px] text-muted-foreground">Chain {chain.chainId}</span>
                      {chain.isTestnet && <Badge variant="default" className="mt-1 text-[9px]">Testnet</Badge>}
                    </button>
                  ))}
                </div>
              </div>

              {selectedChainIds.length > 1 && (
                <div className="p-3 rounded-md bg-accent/5 border border-accent/20">
                  <div className="flex items-start gap-2">
                    <Globe className="w-4 h-4 text-accent mt-0.5" />
                    <div>
                      <h4 className="text-xs font-medium text-accent">Multi-Chain Deployment</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Using the same salt nonce ({saltNonce}) and owners, your Safe will have the same 
                        deterministic address on all {selectedChainIds.length} selected chains via CREATE2.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-between">
                <Button size="sm" variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button size="sm" onClick={() => setStep(3)}>Signers <ArrowRight className="ml-1.5 w-3.5 h-3.5" /></Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div>
                <div className="flex justify-between items-end mb-3">
                  <label className="block text-xs font-medium text-muted-foreground">Owner Addresses</label>
                  <Button variant="outline" size="sm" onClick={handleAddOwner}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Owner
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {owners.map((owner, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input 
                        placeholder="0x..." 
                        value={owner}
                        onChange={(e) => handleOwnerChange(idx, e.target.value)}
                        className="font-mono text-xs"
                      />
                      {owners.length > 1 && (
                        <Button variant="danger" size="sm" className="px-2" onClick={() => handleRemoveOwner(idx)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Signature Threshold</label>
                <div className="flex items-center gap-3">
                  <Input 
                    type="number" 
                    min={1} 
                    max={owners.length}
                    value={threshold}
                    onChange={(e) => setThreshold(parseInt(e.target.value))}
                    className="w-20 text-center font-medium"
                  />
                  <span className="text-sm text-muted-foreground">out of {owners.length} owner(s)</span>
                </div>
              </div>

              <div className="pt-2 flex justify-between">
                <Button size="sm" variant="ghost" onClick={() => setStep(2)}>Back</Button>
                <div className="flex gap-2">
                  {isSafeType && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handlePredictAddresses}
                      isLoading={isPredicting}
                    >
                      <Hash className="w-3.5 h-3.5 mr-1.5" /> Predict Address
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setStep(4)} disabled={owners.some(o => !o) || threshold > owners.length}>
                    Review <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {Object.keys(predictedAddresses).length > 0 && (
                <div className="pt-3 border-t border-border">
                  <label className="block text-xs font-medium text-muted-foreground mb-2">Predicted Addresses</label>
                  <div className="space-y-1.5">
                    {selectedChainIds.map(cid => (
                      <div key={cid} className="flex items-center justify-between bg-secondary/30 rounded-md px-3 py-2 border border-border">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{chains?.find(c => c.chainId === cid)?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-foreground">
                            {predictedAddresses[cid] ? `${predictedAddresses[cid].slice(0, 10)}...${predictedAddresses[cid].slice(-6)}` : "—"}
                          </code>
                          {predictedAddresses[cid] && (
                            <button
                              onClick={() => { navigator.clipboard.writeText(predictedAddresses[cid]); toast.success("Copied!"); }}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div className="bg-secondary/30 rounded-md p-4 border border-border space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Name</p>
                    <p className="font-medium text-foreground">{name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Account Type</p>
                    <Badge variant={isSmartAccount ? 'accent' : 'default'} className="mt-0.5">{walletType}</Badge>
                    {is4337Account && <Badge variant="success" className="mt-0.5 ml-1">ERC-4337</Badge>}
                  </div>
                  {isSafeType && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Safe Version</p>
                      <p className="font-medium text-foreground text-sm">v{safeVersion}</p>
                    </div>
                  )}
                  {isSmartAccount && !isSafeType && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">EntryPoint</p>
                      <p className="font-medium text-foreground text-sm">{entryPointVersion}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Threshold</p>
                    <p className="font-medium text-foreground">{threshold} of {owners.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Salt Nonce</p>
                    <p className="font-mono text-xs text-foreground">{saltNonce}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1.5">
                    {selectedChainIds.length > 1 ? `Deploying on ${selectedChainIds.length} Networks` : "Network"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedChainIds.map(cid => (
                      <Badge key={cid} variant="accent">
                        {chains?.find(c => c.chainId === cid)?.name || `Chain ${cid}`}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1.5">Signers</p>
                  <div className="space-y-1.5">
                    {owners.map((o, i) => (
                      <div key={i} className="text-xs font-mono text-foreground bg-background px-2.5 py-1.5 rounded border border-border">
                        {o}
                      </div>
                    ))}
                  </div>
                </div>

                {isSafeType && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1.5">Factory Configuration</p>
                    <div className="grid grid-cols-1 gap-1 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SafeProxyFactory</span>
                        <span className="font-mono text-foreground">{factoryAddress || KNOWN_FACTORIES[safeVersion]}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fallback Handler</span>
                        <span className="font-mono text-foreground">{fallbackHandler || KNOWN_FALLBACK_HANDLERS[safeVersion]}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className={`p-3 rounded-md border flex items-start gap-3 ${isPrivateTx ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
                {isPrivateTx ? <Shield className="w-5 h-5 text-success mt-0.5" /> : <ShieldAlert className="w-5 h-5 text-destructive mt-0.5" />}
                <div>
                  <h4 className={`text-sm font-medium ${isPrivateTx ? 'text-success' : 'text-destructive'}`}>
                    {isPrivateTx ? 'Private Deployment Active' : 'Public Deployment Warning'}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {isPrivateTx 
                      ? "This transaction will be routed through a private mempool to protect against frontrunning."
                      : "You have private transactions disabled. This deployment will be broadcast to the public mempool."}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-between">
                <Button size="sm" variant="ghost" onClick={() => setStep(3)}>Back</Button>
                <Button 
                  size="sm"
                  onClick={handleDeploy} 
                  isLoading={createWalletMut.isPending}
                  variant={isPrivateTx ? "primary" : "danger"}
                >
                  <Check className="mr-1.5 w-3.5 h-3.5" /> Deploy {selectedChainIds.length > 1 ? `on ${selectedChainIds.length} Chains` : "Wallet"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
