# TehTruth Dev Studio

## Overview

A blockchain developer workbench for deploying and managing multi-sig Safe wallets, tokens, smart contracts, bridges, and MEV tooling. Built as a pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **State management**: Zustand
- **Routing**: Wouter
- **Blockchain**: thirdweb SDK + viem (wallet connection via ConnectButton, on-chain reads/writes)
- **IDE**: Monaco Editor for Solidity, solc compiler with OpenZeppelin import resolution

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── web-app/            # React + Vite frontend (TehTruth UI)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml     # pnpm workspace config
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package
```

## Database Schema

### Tables
- **chains** — Supported blockchain networks (chain_id, name, rpc_url, private_rpc_url, explorer_url, native_currency, is_testnet)
- **wallets** — Saved deployed wallets (address, name, chain_id, wallet_type, owners[], threshold, salt, deploy_tx_hash, private_tx_default, is_4337_enabled, entry_point_version, implementation, factory_address)
- **activity_log** — Transaction activity entries (wallet_id, tx_hash, action, details, was_private, chain_id)
- **tokens** — Deployed tokens (address, name, symbol, token_type, chain_id, decimals, total_supply, deploy_tx_hash, was_private)
- **contracts** — Registered contracts (address, name, chain_id, abi, tags)
- **bridge_transfers** — Cross-chain bridge transfers (protocol, source/dest chain, token, amount, sender, recipient, tx hashes, status, was_private)
- **mev_operations** — MEV/ERC-4337 operations (op_type, sender, chain_id, target, calldata, value, paymaster, bundler, op_hash, tx_hash, status, was_private, nonce, init_code, call_gas_limit, verification_gas_limit, pre_verification_gas, max_fee_per_gas, max_priority_fee_per_gas, paymaster_and_data, signature, bundler_provider, bundler_url, entry_point_address)
- **delegations** — EIP-7702 delegations (eoa_address, delegate_address, chain_id, implementation_type, label, status, tx_hash, revoke_tx_hash)
- **session_keys** — Session keys for smart accounts (wallet_address, session_public_key, chain_id, label, permissions, allowed_targets, spend_limit, valid_after, valid_until, is_revoked, tx_hash)
- **safe_modules** — Safe modules (safe_address, module_address, chain_id, module_type, label, is_enabled, enable_tx_hash, disable_tx_hash)

### Seeded Data
- 9 chains seeded: Ethereum, Polygon, Arbitrum, Base, Optimism, BSC, Avalanche, Sepolia, Base Sepolia

## API Endpoints

All routes mounted at `/api`:
- `GET /api/healthz` — Health check
- `GET /api/chains` — List supported chains
- **Wallets**: `GET/POST /api/wallets`, `GET/PATCH/DELETE /api/wallets/:id`, `GET /api/wallets/:id/activity`, `GET /api/wallets/:id/modules`, `POST /api/wallets/predict-address`, `POST /api/activity`
- **Safe Modules**: `GET/POST /api/safe-modules`, `GET/PATCH/DELETE /api/safe-modules/:id`
- **Tokens**: `GET/POST /api/tokens`, `GET/DELETE /api/tokens/:id`
- **Contracts**: `GET/POST /api/contracts`, `GET/DELETE /api/contracts/:id`
- **Bridges**: `GET/POST /api/bridges`, `GET/PATCH /api/bridges/:id`
- **MEV**: `GET/POST /api/mev`, `GET/PATCH /api/mev/:id`
- **Delegations**: `GET/POST /api/delegations`, `GET/PATCH/DELETE /api/delegations/:id`
- **Session Keys**: `GET/POST /api/session-keys`, `GET/PATCH/DELETE /api/session-keys/:id`
- **Compiler**: `POST /api/compiler/compile` (multi-file Solidity compilation with OpenZeppelin import resolution, configurable version/evmVersion/optimizerRuns), `GET /api/compiler/version`, `GET /api/compiler/versions` (list available solc versions)
- **Dev Tools**: `POST /api/tools/abi-encode`, `POST /api/tools/abi-decode`, `POST /api/tools/checksum`, `POST /api/tools/keccak256`

## Frontend Sections

1. **Solidity IDE** — Monaco editor with Solidity syntax highlighting, **multi-file support** (file tabs, add/remove/rename files), **file upload** (drag & drop .sol files), **flatten** button (merges all files into one, deduplicates pragmas/licenses, strips local imports), **configurable compiler version** (bundled solc 0.8.34 + 46 remote versions from 0.4.26 to 0.8.28), OpenZeppelin template library (ERC-20/721/1155, Governor, upgradeable proxy patterns), configurable options (mintable, burnable, pausable, access control), deploy compiled contracts on-chain via connected wallet, auto-register deployed contracts. Cross-file imports (e.g. `import "./IMyInterface.sol"`) resolved from user sources.
2. **Wallets** — Deploy Safe multi-sig wallets with 4-step wizard (Config → Networks → Signers → Review), 6 account types, multi-chain deployment via CREATE2, **Wallet Tools** (multi-chain balance aggregator, bulk wallet generator with CSV export, address labeler)
3. **Smart Accounts** — Account Abstraction dashboard with 5 tabs: Smart Accounts overview, EIP-7702 Delegations, Session Keys, Safe Modules (enable/disable/CRUD), Batch Transactions
4. **Tokens** — **Deploy New Token** wizard (ERC-20 with mintable/burnable/pausable features, compiles and deploys on-chain via solc) + **Register Existing** token for tracking
5. **Contracts** — Import contracts via ABI, interact with read/write functions
6. **Bridges** — Cross-chain bridging via CCIP, LayerZero, Hyperlane, Wormhole, Axelar
7. **MEV Tooling** — ERC-4337 UserOp builder with bundler configuration panel (Flashbots, Pimlico, Alchemy, StackUp, Gelato, Custom), EntryPoint selector, advanced UserOp fields (initCode, gas limits, paymasterAndData, signature)
8. **Dev Tools** — ABI encoder, calldata decoder, address checksum (EIP-55), Keccak256 hasher

## Contract Templates

Available in the IDE:
- **ERC-20 Token** — Fungible token with optional mint, burn, pause, permit
- **ERC-721 NFT** — Non-fungible token with optional enumeration, URI storage
- **ERC-1155 Multi Token** — Multi-token standard with supply tracking
- **Governor (DAO)** — On-chain governance with quorum and timelock
- **ERC-20 UUPS Upgradeable** — Upgradeable ERC-20 with initializer pattern
- **ERC-721 UUPS Upgradeable** — Upgradeable NFT with initializer pattern
- **Transparent Proxy Pattern** — Implementation + TransparentUpgradeableProxy
- **Beacon Proxy Pattern** — UpgradeableBeacon + BeaconProxy for multiple instances
- **Blank Contract** — Minimal Solidity template

## Key Features
- **Real wallet connectivity** — thirdweb ConnectButton with in-app wallet (email/passkey/coinbase), MetaMask, Coinbase Wallet, Rainbow, Rabby, Zerion, Trust, and more
- **Real on-chain interactions** — Contract reads via `publicClient.readContract`, writes via `walletClient.writeContract` with actual transaction receipts
- **Real Solidity compilation** — solc compiler with OpenZeppelin import resolution from node_modules, 256KB source limit
- **Zero fake data** — No Math.random() tx hashes, no hardcoded mock addresses, no simulated blockchain interactions
- **Private transactions by default** — All transactions route through Flashbots Protect / MEV Blocker
- **Deterministic wallet deployment** — CREATE2 addresses via SafeProxyFactory
- **Persistent wallet registry** — All deployed wallets saved to PostgreSQL
- **Dark mode professional UI** — Refined developer tool aesthetic (Linear/Vercel-inspired), subtle borders, tight spacing, no glow effects

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` with `composite: true`. Root `tsconfig.json` lists lib packages as project references.

## Root Scripts

- `pnpm run build` — typecheck + build all
- `pnpm run typecheck` — full typecheck via project references
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes
