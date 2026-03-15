import { useState } from "react";
import { useEncodeCalldata, useDecodeCalldata, useChecksumAddress, useKeccak256Hash } from "@workspace/api-client-react";
import { Card, Input, Button, Badge } from "@/components/shared";
import { Code2, Hash, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";

type ActiveTool = "encode" | "decode" | "checksum" | "keccak256";

const TOOLS: { id: ActiveTool; label: string; desc: string }[] = [
  { id: "encode", label: "ABI Encoder", desc: "Encode function calldata from signature" },
  { id: "decode", label: "Calldata Decoder", desc: "Decode hex calldata with ABI" },
  { id: "checksum", label: "Address Checksum", desc: "Compute EIP-55 checksummed address" },
  { id: "keccak256", label: "Keccak256", desc: "Compute Keccak256 hash of input" },
];

export function DevToolsDashboard() {
  const [activeTool, setActiveTool] = useState<ActiveTool>("encode");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Developer Tools</h1>
        <p className="text-sm text-muted-foreground mt-1">ABI encoding, calldata decoding, hashing, and address utilities.</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {TOOLS.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`text-left p-3 rounded-md border transition-colors ${
              activeTool === tool.id
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-muted-foreground/30'
            }`}
          >
            <p className={`text-sm font-semibold ${activeTool === tool.id ? 'text-primary' : 'text-foreground'}`}>{tool.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{tool.desc}</p>
          </button>
        ))}
      </div>

      {activeTool === "encode" && <AbiEncoder />}
      {activeTool === "decode" && <CalldataDecoder />}
      {activeTool === "checksum" && <AddressChecksum />}
      {activeTool === "keccak256" && <Keccak256Tool />}
    </div>
  );
}

function AbiEncoder() {
  const [fnSig, setFnSig] = useState("transfer(address,uint256)");
  const [params, setParams] = useState("0x71C95911E9a5D330f4D621c2306298B061df976F\n1000000");
  const encodeMut = useEncodeCalldata();
  const [result, setResult] = useState<{ encoded: string; selector: string } | null>(null);

  const handleEncode = async () => {
    try {
      const res = await encodeMut.mutateAsync({
        data: {
          functionSignature: fnSig,
          params: params.split("\n").map(p => p.trim()).filter(Boolean),
        }
      });
      setResult(res as any);
    } catch {
      toast.error("Encoding failed");
    }
  };

  return (
    <Card className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Function Signature</label>
        <Input value={fnSig} onChange={(e) => setFnSig(e.target.value)} placeholder="transfer(address,uint256)" className="font-mono" />
      </div>
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Parameters (one per line)</label>
        <textarea
          value={params}
          onChange={(e) => setParams(e.target.value)}
          placeholder="0x...\n1000000"
          className="w-full h-24 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary transition-colors resize-none placeholder:text-muted-foreground"
        />
      </div>
      <Button onClick={handleEncode} isLoading={encodeMut.isPending} className="gap-2">
        <Code2 className="w-4 h-4" /> Encode
      </Button>
      {result && (
        <div className="space-y-2">
          <ResultRow label="Selector" value={result.selector} />
          <ResultRow label="Encoded Calldata" value={result.encoded} />
        </div>
      )}
    </Card>
  );
}

function CalldataDecoder() {
  const [calldataInput, setCalldataInput] = useState("");
  const [abiInput, setAbiInput] = useState('[{"type":"function","name":"transfer","inputs":[{"name":"to","type":"address"},{"name":"amount","type":"uint256"}],"outputs":[{"name":"","type":"bool"}]}]');
  const decodeMut = useDecodeCalldata();
  const [result, setResult] = useState<{ functionName: string; params: any[] } | null>(null);

  const handleDecode = async () => {
    let abi;
    try {
      abi = JSON.parse(abiInput);
    } catch {
      toast.error("Invalid ABI JSON");
      return;
    }
    try {
      const res = await decodeMut.mutateAsync({
        data: { calldata: calldataInput, abi }
      });
      setResult(res as any);
    } catch {
      toast.error("Decoding failed");
    }
  };

  return (
    <Card className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Calldata (Hex)</label>
        <textarea
          value={calldataInput}
          onChange={(e) => setCalldataInput(e.target.value)}
          placeholder="0xa9059cbb..."
          className="w-full h-20 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary transition-colors resize-none placeholder:text-muted-foreground"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1.5">ABI (JSON)</label>
        <textarea
          value={abiInput}
          onChange={(e) => setAbiInput(e.target.value)}
          className="w-full h-24 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary transition-colors resize-none placeholder:text-muted-foreground"
        />
      </div>
      <Button onClick={handleDecode} isLoading={decodeMut.isPending} className="gap-2">
        <Code2 className="w-4 h-4" /> Decode
      </Button>
      {result && (
        <div className="space-y-2">
          <ResultRow label="Function" value={result.functionName} />
          {result.params.map((p: any, i: number) => (
            <ResultRow key={i} label={p.name || `param${i}`} value={p.value} />
          ))}
        </div>
      )}
    </Card>
  );
}

function AddressChecksum() {
  const [address, setAddress] = useState("");
  const checksumMut = useChecksumAddress();
  const [result, setResult] = useState<{ checksummed: string; isValid: boolean } | null>(null);

  const handleChecksum = async () => {
    try {
      const res = await checksumMut.mutateAsync({ data: { address } });
      setResult(res as any);
    } catch {
      toast.error("Checksum failed");
    }
  };

  return (
    <Card className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Ethereum Address</label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x..." className="font-mono" />
      </div>
      <Button onClick={handleChecksum} disabled={!address} isLoading={checksumMut.isPending} className="gap-2">
        <CheckCircle className="w-4 h-4" /> Checksum
      </Button>
      {result && (
        <div className="space-y-2">
          <ResultRow label="Checksummed" value={result.checksummed} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Valid:</span>
            <Badge variant={result.isValid ? "success" : "outline"}>{result.isValid ? "Yes" : "No"}</Badge>
          </div>
        </div>
      )}
    </Card>
  );
}

function Keccak256Tool() {
  const [input, setInput] = useState("");
  const hashMut = useKeccak256Hash();
  const [result, setResult] = useState<string | null>(null);

  const handleHash = async () => {
    try {
      const res = await hashMut.mutateAsync({ data: { input } });
      setResult((res as any).hash);
    } catch {
      toast.error("Hash failed");
    }
  };

  return (
    <Card className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Input String</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter text or hex data..."
          className="w-full h-24 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary transition-colors resize-none placeholder:text-muted-foreground"
        />
      </div>
      <Button onClick={handleHash} disabled={!input} isLoading={hashMut.isPending} className="gap-2">
        <Hash className="w-4 h-4" /> Hash
      </Button>
      {result && <ResultRow label="Keccak256" value={result} />}
    </Card>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success("Copied!");
  };

  return (
    <div className="flex items-center justify-between p-2.5 rounded-md bg-secondary/30 border border-border">
      <span className="text-xs text-muted-foreground shrink-0 mr-3">{label}</span>
      <span className="font-mono text-sm text-foreground truncate flex items-center gap-1.5">
        <span className="truncate">{value}</span>
        <button onClick={handleCopy} className="shrink-0 hover:text-primary transition-colors">
          <Copy className="w-3 h-3" />
        </button>
      </span>
    </div>
  );
}
