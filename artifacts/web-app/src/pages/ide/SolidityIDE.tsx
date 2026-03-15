import { useState, useCallback, useRef, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import { viemAdapter } from "thirdweb/adapters/viem";
import { defineChain } from "thirdweb";
import { thirdwebClient } from "@/lib/thirdweb";
import { CONTRACT_TEMPLATES, type ContractTemplate } from "@/lib/contract-templates";
import { Button, Card, Badge, Input } from "@/components/shared";
import { cn } from "@/components/shared";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Rocket, FileCode2, ChevronDown, ChevronRight,
  AlertCircle, CheckCircle2, AlertTriangle, Copy, Download,
  Settings2, Layers, BookOpen, Plus, X, Upload, Combine,
  File
} from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface CompilationResult {
  success: boolean;
  contracts?: Record<string, {
    abi: any[];
    bytecode: string | null;
    deployedBytecode: string | null;
    gasEstimates: any;
    sourceFile?: string;
  }>;
  errors?: Array<{ message: string; severity: string; sourceLocation?: any }>;
  warnings?: Array<{ message: string }>;
}

interface IDEFile {
  name: string;
  content: string;
}

type Tab = "templates" | "compiler" | "deploy";

const DEFAULT_FILE: IDEFile = {
  name: "Contract.sol",
  content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MyContract {
    address public owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }
}
`,
};

export function SolidityIDE() {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const editorRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<IDEFile[]>([{ ...DEFAULT_FILE }]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [compiling, setCompiling] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState<CompilationResult | null>(null);
  const [selectedContract, setSelectedContract] = useState<string>("");
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [deployTxHash, setDeployTxHash] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("templates");
  const [expandedAbi, setExpandedAbi] = useState(false);

  const [templateConfig, setTemplateConfig] = useState<Record<string, boolean>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<string>("custom");

  const [solcVersion, setSolcVersion] = useState("default");
  const [availableVersions, setAvailableVersions] = useState<string[]>([]);
  const [bundledVersion, setBundledVersion] = useState("");
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [renamingFile, setRenamingFile] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    setLoadingVersions(true);
    fetch(`${API_BASE}/api/compiler/versions`)
      .then(r => r.json())
      .then(data => {
        setAvailableVersions(data.versions || []);
        setBundledVersion(data.bundledVersion || "");
      })
      .catch(() => {})
      .finally(() => setLoadingVersions(false));
  }, []);

  const activeFile = files[activeFileIndex] || files[0];

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const updateFileContent = useCallback((content: string) => {
    setFiles(prev => prev.map((f, i) => i === activeFileIndex ? { ...f, content } : f));
  }, [activeFileIndex]);

  const addFile = useCallback(() => {
    let num = files.length + 1;
    let name = `File${num}.sol`;
    while (files.some(f => f.name === name)) {
      num++;
      name = `File${num}.sol`;
    }
    const newFile: IDEFile = {
      name,
      content: `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\n\n`,
    };
    setFiles(prev => [...prev, newFile]);
    setActiveFileIndex(files.length);
  }, [files]);

  const removeFile = useCallback((index: number) => {
    if (files.length <= 1) {
      toast.error("Cannot remove the last file");
      return;
    }
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (activeFileIndex >= index && activeFileIndex > 0) {
      setActiveFileIndex(prev => prev - 1);
    }
  }, [files.length, activeFileIndex]);

  const startRename = useCallback((index: number) => {
    setRenamingFile(index);
    setRenameValue(files[index].name);
  }, [files]);

  const commitRename = useCallback(() => {
    if (renamingFile === null) return;
    let newName = renameValue.trim();
    if (!newName) {
      setRenamingFile(null);
      return;
    }
    if (!newName.endsWith(".sol")) newName += ".sol";
    if (files.some((f, i) => i !== renamingFile && f.name === newName)) {
      toast.error("A file with this name already exists");
      return;
    }
    setFiles(prev => prev.map((f, i) => i === renamingFile ? { ...f, name: newName } : f));
    setRenamingFile(null);
  }, [renamingFile, renameValue, files]);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    const readers: Promise<IDEFile>[] = [];
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      readers.push(new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          let name = file.name;
          resolve({ name, content: reader.result as string });
        };
        reader.onerror = reject;
        reader.readAsText(file);
      }));
    }

    Promise.all(readers).then(newFiles => {
      setFiles(prev => {
        const existing = new Set(prev.map(f => f.name));
        const toAdd: IDEFile[] = [];
        for (const nf of newFiles) {
          let name = nf.name;
          let counter = 1;
          while (existing.has(name)) {
            name = nf.name.replace(".sol", `_${counter}.sol`);
            counter++;
          }
          existing.add(name);
          toAdd.push({ name, content: nf.content });
        }
        return [...prev, ...toAdd];
      });
      setActiveFileIndex(prev => prev); // keep current tab
      toast.success(`Uploaded ${newFiles.length} file(s)`);
    }).catch(() => {
      toast.error("Failed to read uploaded files");
    });

    e.target.value = "";
  }, []);

  const flattenFiles = useCallback(() => {
    if (files.length <= 1) {
      toast("Only one file — nothing to flatten");
      return;
    }

    const seen = new Set<string>();
    let flatContent = "";

    for (const file of files) {
      const lines = file.content.split("\n");
      const filteredLines: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith("// SPDX-License-Identifier:")) {
          if (!seen.has("license")) {
            seen.add("license");
            filteredLines.push(line);
          }
          continue;
        }

        if (trimmed.startsWith("pragma solidity")) {
          if (!seen.has("pragma")) {
            seen.add("pragma");
            filteredLines.push(line);
          }
          continue;
        }

        const importMatch = trimmed.match(/^import\s+["']\.\/([^"']+)["']\s*;/);
        if (importMatch) {
          continue;
        }

        const importMatch2 = trimmed.match(/^import\s+\{[^}]+\}\s+from\s+["']\.\/([^"']+)["']\s*;/);
        if (importMatch2) {
          continue;
        }

        filteredLines.push(line);
      }

      flatContent += `\n// ===== ${file.name} =====\n`;
      flatContent += filteredLines.join("\n") + "\n";
    }

    flatContent = flatContent.trim() + "\n";

    setFiles([{ name: "Flattened.sol", content: flatContent }]);
    setActiveFileIndex(0);
    toast.success("All files flattened into Flattened.sol");
  }, [files]);

  const loadTemplate = useCallback((template: ContractTemplate) => {
    const defaults: Record<string, boolean> = {};
    template.options.forEach(o => { defaults[o.id] = o.default; });
    setTemplateConfig(defaults);
    setSelectedTemplate(template.id);
    const code = template.generate(defaults);

    setFiles([{ name: `${template.id}.sol`, content: code }]);
    setActiveFileIndex(0);
    setResult(null);
    setDeployedAddress(null);
    setDeployTxHash(null);
    setSelectedContract("");
  }, []);

  const updateTemplateOption = useCallback((optionId: string, value: boolean) => {
    const template = CONTRACT_TEMPLATES.find(t => t.id === selectedTemplate);
    if (!template) return;
    const newConfig = { ...templateConfig, [optionId]: value };
    setTemplateConfig(newConfig);
    const code = template.generate(newConfig);
    setFiles(prev => prev.map((f, i) => i === 0 ? { ...f, content: code } : f));
  }, [selectedTemplate, templateConfig]);

  const compile = useCallback(async () => {
    setCompiling(true);
    setResult(null);
    setDeployedAddress(null);
    setDeployTxHash(null);

    try {
      const sources: Record<string, string> = {};
      for (const f of files) {
        sources[f.name] = f.content;
      }

      const body: any = {
        sources,
        evmVersion: "paris",
        optimizerRuns: 200,
      };
      if (solcVersion !== "default") {
        body.version = solcVersion;
      }

      const res = await fetch(`${API_BASE}/api/compiler/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: CompilationResult = await res.json();
      setResult(data);

      if (data.success && data.contracts) {
        const names = Object.keys(data.contracts);
        if (names.length > 0) setSelectedContract(names[0]);
        toast.success(`Compiled ${names.length} contract(s)`);
        setActiveTab("compiler");
      } else {
        toast.error("Compilation failed", {
          description: `${data.errors?.length || 0} error(s)`,
        });
        setActiveTab("compiler");
      }
    } catch (err: any) {
      toast.error("Compilation error", { description: err.message });
    } finally {
      setCompiling(false);
    }
  }, [files, solcVersion]);

  const deploy = useCallback(async () => {
    if (!result?.success || !result.contracts || !selectedContract || !account) return;

    const contract = result.contracts[selectedContract];
    if (!contract.bytecode) {
      toast.error("No bytecode available for deployment");
      return;
    }

    setDeploying(true);
    try {
      const chainId = activeChain?.id || 1;
      const chain = defineChain(chainId);
      const walletClient = viemAdapter.walletClient.toViem({
        client: thirdwebClient,
        chain,
        account,
      });

      const hash = await walletClient.deployContract({
        abi: contract.abi,
        bytecode: contract.bytecode as `0x${string}`,
        account: walletClient.account!,
      });

      setDeployTxHash(hash);
      toast.success("Contract deployed!", { description: `Tx: ${hash.slice(0, 14)}...` });

      const { createPublicClient, http } = await import("viem");
      const viemChains = await import("viem/chains");
      const chainMap: Record<number, any> = {
        1: viemChains.mainnet,
        137: viemChains.polygon,
        42161: viemChains.arbitrum,
        8453: viemChains.base,
        10: viemChains.optimism,
        56: viemChains.bsc,
        43114: viemChains.avalanche,
        11155111: viemChains.sepolia,
        84532: viemChains.baseSepolia,
      };

      const viemChain = chainMap[chainId];
      if (viemChain) {
        const publicClient = createPublicClient({ chain: viemChain, transport: http() });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.contractAddress) {
          setDeployedAddress(receipt.contractAddress);
          toast.success("Contract confirmed!", {
            description: `Address: ${receipt.contractAddress.slice(0, 14)}...`,
          });

          const regRes = await fetch(`${API_BASE}/api/contracts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: receipt.contractAddress,
              name: selectedContract,
              chainId,
              abi: contract.abi,
              deployer: account.address,
              deployTxHash: hash,
            }),
          });
          if (!regRes.ok) {
            const err = await regRes.text();
            console.error("Contract registration failed:", err);
          }
        }
      }

      setActiveTab("deploy");
    } catch (err: any) {
      toast.error("Deployment failed", { description: err.message });
    } finally {
      setDeploying(false);
    }
  }, [result, selectedContract, account, activeChain]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  }, []);

  const downloadAbi = useCallback(() => {
    if (!result?.contracts?.[selectedContract]) return;
    const abi = result.contracts[selectedContract].abi;
    const blob = new Blob([JSON.stringify(abi, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedContract}_abi.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, selectedContract]);

  const currentTemplate = CONTRACT_TEMPLATES.find(t => t.id === selectedTemplate);

  const versionLabel = solcVersion === "default"
    ? `solc ${bundledVersion || "bundled"}`
    : `solc ${solcVersion.split("+")[0].replace("v", "")}`;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept=".sol,.txt"
        multiple
        className="hidden"
        onChange={handleUpload}
      />

      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <FileCode2 className="w-5 h-5 text-primary" />
          <h1 className="text-base font-semibold text-foreground">Solidity IDE</h1>
          <Badge variant="outline">{versionLabel}</Badge>
          <span className="text-xs text-muted-foreground">{files.length} file(s)</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} title="Upload .sol files">
            <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload
          </Button>
          {files.length > 1 && (
            <Button size="sm" variant="ghost" onClick={flattenFiles} title="Flatten all files into one">
              <Combine className="w-3.5 h-3.5 mr-1.5" /> Flatten
            </Button>
          )}
          {activeChain && (
            <Badge variant="accent">{activeChain.name || `Chain ${activeChain.id}`}</Badge>
          )}
          <Button size="sm" variant="outline" onClick={compile} isLoading={compiling} disabled={files.every(f => !f.content.trim())}>
            <Play className="w-3.5 h-3.5 mr-1.5" /> Compile
          </Button>
          <Button
            size="sm"
            onClick={deploy}
            isLoading={deploying}
            disabled={!result?.success || !selectedContract || !account}
          >
            <Rocket className="w-3.5 h-3.5 mr-1.5" /> Deploy
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 min-w-0 border-r border-border flex flex-col">
          <div className="flex items-center border-b border-border bg-card/20 overflow-x-auto">
            {files.map((file, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-r border-border cursor-pointer whitespace-nowrap group min-w-0",
                  index === activeFileIndex
                    ? "bg-background text-foreground border-b-2 border-b-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                )}
                onClick={() => setActiveFileIndex(index)}
              >
                <File className="w-3 h-3 flex-shrink-0" />
                {renamingFile === index ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setRenamingFile(null);
                    }}
                    className="bg-transparent border-b border-primary text-xs w-24 outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => { e.stopPropagation(); startRename(index); }}
                    title="Double-click to rename"
                  >
                    {file.name}
                  </span>
                )}
                {files.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                    className="ml-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addFile}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
              title="Add new file"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="sol"
              theme="vs-dark"
              value={activeFile.content}
              onChange={(val) => updateFileContent(val || "")}
              onMount={handleEditorMount}
              path={activeFile.name}
              options={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                minimap: { enabled: false },
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
                padding: { top: 12 },
                automaticLayout: true,
                tabSize: 4,
                renderLineHighlight: "gutter",
                smoothScrolling: true,
              }}
            />
          </div>
        </div>

        <div className="w-[380px] flex flex-col bg-card/30 overflow-hidden">
          <div className="flex border-b border-border">
            {([
              { id: "templates" as Tab, label: "Templates", icon: BookOpen },
              { id: "compiler" as Tab, label: "Output", icon: Settings2 },
              { id: "deploy" as Tab, label: "Deploy", icon: Layers },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2",
                  activeTab === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <AnimatePresence mode="wait">
              {activeTab === "templates" && (
                <motion.div
                  key="templates"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-3"
                >
                  <p className="text-xs text-muted-foreground">Select a template to generate OpenZeppelin-based contract code.</p>
                  <div className="space-y-2">
                    {CONTRACT_TEMPLATES.map(template => (
                      <button
                        key={template.id}
                        onClick={() => loadTemplate(template)}
                        className={cn(
                          "w-full text-left p-3 rounded-md border transition-colors",
                          selectedTemplate === template.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/30 bg-card/50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{template.name}</span>
                          <Badge variant="outline">{template.standard}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                      </button>
                    ))}
                  </div>

                  {currentTemplate && currentTemplate.options.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Options</p>
                      {currentTemplate.options.map(option => (
                        <label
                          key={option.id}
                          className="flex items-start gap-3 p-2 rounded-md hover:bg-secondary/30 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={templateConfig[option.id] ?? option.default}
                            onChange={(e) => updateTemplateOption(option.id, e.target.checked)}
                            className="mt-0.5 rounded border-border bg-background text-primary focus:ring-primary"
                          />
                          <div>
                            <span className="text-sm font-medium text-foreground">{option.label}</span>
                            <p className="text-xs text-muted-foreground">{option.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "compiler" && (
                <motion.div
                  key="compiler"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Compiler Version</label>
                    <select
                      value={solcVersion}
                      onChange={(e) => setSolcVersion(e.target.value)}
                      className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                      disabled={loadingVersions}
                    >
                      <option value="default">Bundled ({bundledVersion || "loading..."})</option>
                      {availableVersions.map(v => (
                        <option key={v} value={v}>{v.replace("v", "").split("+")[0]}</option>
                      ))}
                    </select>
                    {solcVersion !== "default" && (
                      <p className="text-[10px] text-yellow-500 mt-1">Remote version — first compile may take a moment to download.</p>
                    )}
                  </div>

                  {!result && (
                    <div className="text-center py-6">
                      <Settings2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Click Compile to build your contract</p>
                    </div>
                  )}

                  {result?.errors && result.errors.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {result.errors.length} Error(s)
                      </p>
                      {result.errors.map((err, i) => (
                        <div key={i} className="p-2 rounded-md bg-destructive/5 border border-destructive/20 text-xs font-mono text-destructive whitespace-pre-wrap break-all">
                          {err.message}
                        </div>
                      ))}
                    </div>
                  )}

                  {result?.warnings && result.warnings.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-yellow-500 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {result.warnings.length} Warning(s)
                      </p>
                      {result.warnings.map((w, i) => (
                        <div key={i} className="p-2 rounded-md bg-yellow-500/5 border border-yellow-500/20 text-xs font-mono text-yellow-500 whitespace-pre-wrap break-all">
                          {w.message}
                        </div>
                      ))}
                    </div>
                  )}

                  {result?.success && result.contracts && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span className="text-sm font-medium text-success">Compilation Successful</span>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Contract</label>
                        <select
                          value={selectedContract}
                          onChange={(e) => setSelectedContract(e.target.value)}
                          className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                        >
                          {Object.entries(result.contracts).map(([name, c]) => (
                            <option key={name} value={name}>
                              {name}{c.sourceFile ? ` (${c.sourceFile})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedContract && result.contracts[selectedContract] && (
                        <>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={downloadAbi}>
                              <Download className="w-3.5 h-3.5 mr-1" /> ABI
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(result.contracts![selectedContract].bytecode || "", "Bytecode")}
                            >
                              <Copy className="w-3.5 h-3.5 mr-1" /> Bytecode
                            </Button>
                          </div>

                          <div>
                            <button
                              onClick={() => setExpandedAbi(!expandedAbi)}
                              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                            >
                              {expandedAbi ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              ABI ({result.contracts[selectedContract].abi.length} items)
                            </button>
                            {expandedAbi && (
                              <pre className="mt-2 p-2 rounded-md bg-background border border-border text-xs font-mono overflow-x-auto max-h-60 overflow-y-auto">
                                {JSON.stringify(result.contracts[selectedContract].abi, null, 2)}
                              </pre>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "deploy" && (
                <motion.div
                  key="deploy"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-3"
                >
                  {!account && (
                    <div className="p-3 rounded-md bg-destructive/5 border border-destructive/20 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-destructive" />
                      <span className="text-xs text-destructive font-medium">Connect wallet to deploy</span>
                    </div>
                  )}

                  {!result?.success && (
                    <div className="text-center py-8">
                      <Rocket className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Compile your contract first</p>
                    </div>
                  )}

                  {result?.success && selectedContract && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-md border border-border bg-card/50">
                        <p className="text-xs text-muted-foreground">Contract</p>
                        <p className="text-sm font-medium text-foreground">{selectedContract}</p>
                      </div>

                      {activeChain && (
                        <div className="p-3 rounded-md border border-border bg-card/50">
                          <p className="text-xs text-muted-foreground">Network</p>
                          <p className="text-sm font-medium text-foreground">
                            {activeChain.name || `Chain ${activeChain.id}`}
                          </p>
                        </div>
                      )}

                      {deployTxHash && (
                        <div className="p-3 rounded-md border border-success/20 bg-success/5 space-y-2">
                          <p className="text-xs text-success font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Transaction Submitted
                          </p>
                          <button
                            onClick={() => copyToClipboard(deployTxHash, "Tx hash")}
                            className="text-xs font-mono text-muted-foreground hover:text-foreground break-all"
                          >
                            {deployTxHash}
                          </button>
                        </div>
                      )}

                      {deployedAddress && (
                        <div className="p-3 rounded-md border border-primary/20 bg-primary/5 space-y-2">
                          <p className="text-xs text-primary font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Contract Deployed
                          </p>
                          <button
                            onClick={() => copyToClipboard(deployedAddress, "Address")}
                            className="text-xs font-mono text-muted-foreground hover:text-foreground break-all"
                          >
                            {deployedAddress}
                          </button>
                        </div>
                      )}

                      <Button
                        className="w-full"
                        onClick={deploy}
                        isLoading={deploying}
                        disabled={!account}
                      >
                        <Rocket className="w-4 h-4 mr-2" />
                        Deploy {selectedContract}
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
