export interface TemplateOption {
  id: string;
  label: string;
  description: string;
  default: boolean;
}

export interface ContractTemplate {
  id: string;
  name: string;
  standard: string;
  description: string;
  options: TemplateOption[];
  generate: (config: Record<string, boolean>) => string;
}

function accessBlock(ownable: boolean): string {
  return ownable ? `\n    import "@openzeppelin/contracts/access/Ownable.sol";` : "";
}

function ownableInherit(ownable: boolean): string {
  return ownable ? ", Ownable" : "";
}

function ownableConstructor(ownable: boolean): string {
  return ownable ? " Ownable(msg.sender)" : "";
}

function onlyOwnerMod(ownable: boolean): string {
  return ownable ? " onlyOwner" : "";
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: "erc20",
    name: "ERC-20 Token",
    standard: "ERC-20",
    description: "Fungible token with optional mint, burn, pause, and permit features.",
    options: [
      { id: "mintable", label: "Mintable", description: "Owner can mint new tokens", default: true },
      { id: "burnable", label: "Burnable", description: "Holders can burn their tokens", default: true },
      { id: "pausable", label: "Pausable", description: "Owner can pause transfers", default: false },
      { id: "permit", label: "Permit (EIP-2612)", description: "Gasless approvals via signatures", default: false },
      { id: "ownable", label: "Ownable", description: "Access control via owner", default: true },
    ],
    generate: (config) => {
      const imports = [
        `import "@openzeppelin/contracts/token/ERC20/ERC20.sol";`,
        config.burnable ? `import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";` : "",
        config.pausable ? `import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";` : "",
        config.permit ? `import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";` : "",
        config.ownable ? `import "@openzeppelin/contracts/access/Ownable.sol";` : "",
      ].filter(Boolean).join("\n");

      const inherits = [
        "ERC20",
        config.burnable ? "ERC20Burnable" : "",
        config.pausable ? "ERC20Pausable" : "",
        config.permit ? "ERC20Permit" : "",
        config.ownable ? "Ownable" : "",
      ].filter(Boolean).join(", ");

      const constructorArgs = config.permit
        ? `constructor() ERC20("MyToken", "MTK") ERC20Permit("MyToken")${config.ownable ? " Ownable(msg.sender)" : ""}`
        : `constructor() ERC20("MyToken", "MTK")${config.ownable ? " Ownable(msg.sender)" : ""}`;

      const constructorBody = `        _mint(msg.sender, 1000000 * 10 ** decimals());`;

      const functions = [
        config.mintable ? `\n    function mint(address to, uint256 amount) public${config.ownable ? " onlyOwner" : ""} {\n        _mint(to, amount);\n    }` : "",
        config.pausable ? `\n    function pause() public${config.ownable ? " onlyOwner" : ""} {\n        _pause();\n    }\n\n    function unpause() public${config.ownable ? " onlyOwner" : ""} {\n        _unpause();\n    }` : "",
      ].filter(Boolean).join("\n");

      const overrides = config.pausable ? `\n\n    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {\n        super._update(from, to, value);\n    }` : "";

      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

${imports}

contract MyToken is ${inherits} {
    ${constructorArgs} {
${constructorBody}
    }
${functions}${overrides}
}
`;
    },
  },
  {
    id: "erc721",
    name: "ERC-721 NFT",
    standard: "ERC-721",
    description: "Non-fungible token collection with optional enumeration and URI storage.",
    options: [
      { id: "mintable", label: "Mintable", description: "Owner can mint new tokens", default: true },
      { id: "burnable", label: "Burnable", description: "Holders can burn their tokens", default: false },
      { id: "pausable", label: "Pausable", description: "Owner can pause transfers", default: false },
      { id: "enumerable", label: "Enumerable", description: "On-chain token enumeration", default: false },
      { id: "uriStorage", label: "URI Storage", description: "Per-token metadata URIs", default: true },
      { id: "ownable", label: "Ownable", description: "Access control via owner", default: true },
      { id: "autoIncrement", label: "Auto-increment IDs", description: "Automatic token ID counter", default: true },
    ],
    generate: (config) => {
      const imports = [
        `import "@openzeppelin/contracts/token/ERC721/ERC721.sol";`,
        config.enumerable ? `import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";` : "",
        config.uriStorage ? `import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";` : "",
        config.burnable ? `import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";` : "",
        config.pausable ? `import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";` : "",
        config.ownable ? `import "@openzeppelin/contracts/access/Ownable.sol";` : "",
      ].filter(Boolean).join("\n");

      const inherits = [
        "ERC721",
        config.enumerable ? "ERC721Enumerable" : "",
        config.uriStorage ? "ERC721URIStorage" : "",
        config.burnable ? "ERC721Burnable" : "",
        config.pausable ? "ERC721Pausable" : "",
        config.ownable ? "Ownable" : "",
      ].filter(Boolean).join(", ");

      const stateVars = config.autoIncrement ? `    uint256 private _nextTokenId;\n\n` : "";

      const mintFn = config.mintable ? `\n    function safeMint(address to${config.uriStorage ? ", string memory uri" : ""}) public${config.ownable ? " onlyOwner" : ""} {${config.autoIncrement ? "\n        uint256 tokenId = _nextTokenId++;" : "\n        uint256 tokenId; // set your token ID"}
        _safeMint(to, tokenId);${config.uriStorage ? "\n        _setTokenURI(tokenId, uri);" : ""}
    }` : "";

      const overrideBases = ["ERC721", config.enumerable ? "ERC721Enumerable" : "", config.uriStorage ? "ERC721URIStorage" : "", config.pausable ? "ERC721Pausable" : ""].filter(Boolean);

      const overrides = overrideBases.length > 1 ? `\n\n    function _update(address to, uint256 tokenId, address auth) internal override(${overrideBases.join(", ")}) returns (address) {\n        return super._update(to, tokenId, auth);\n    }\n\n    function _increaseBalance(address account, uint128 value) internal override(${overrideBases.join(", ")}) {\n        super._increaseBalance(account, value);\n    }\n\n    function tokenURI(uint256 tokenId) public view override(${["ERC721", config.uriStorage ? "ERC721URIStorage" : ""].filter(Boolean).join(", ")}) returns (string memory) {\n        return super.tokenURI(tokenId);\n    }\n\n    function supportsInterface(bytes4 interfaceId) public view override(${overrideBases.join(", ")}) returns (bool) {\n        return super.supportsInterface(interfaceId);\n    }` : "";

      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

${imports}

contract MyNFT is ${inherits} {
${stateVars}    constructor() ERC721("MyNFT", "MNFT")${config.ownable ? " Ownable(msg.sender)" : ""} {}
${mintFn}${overrides}
}
`;
    },
  },
  {
    id: "erc1155",
    name: "ERC-1155 Multi Token",
    standard: "ERC-1155",
    description: "Multi-token standard for fungible and non-fungible tokens in one contract.",
    options: [
      { id: "mintable", label: "Mintable", description: "Owner can mint tokens", default: true },
      { id: "burnable", label: "Burnable", description: "Holders can burn tokens", default: true },
      { id: "supply", label: "Supply Tracking", description: "Track total supply per token ID", default: true },
      { id: "ownable", label: "Ownable", description: "Access control via owner", default: true },
    ],
    generate: (config) => {
      const imports = [
        `import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";`,
        config.burnable ? `import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";` : "",
        config.supply ? `import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";` : "",
        config.ownable ? `import "@openzeppelin/contracts/access/Ownable.sol";` : "",
      ].filter(Boolean).join("\n");

      const inherits = [
        "ERC1155",
        config.burnable ? "ERC1155Burnable" : "",
        config.supply ? "ERC1155Supply" : "",
        config.ownable ? "Ownable" : "",
      ].filter(Boolean).join(", ");

      const mintFn = config.mintable ? `\n    function mint(address account, uint256 id, uint256 amount, bytes memory data) public${config.ownable ? " onlyOwner" : ""} {\n        _mint(account, id, amount, data);\n    }\n\n    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) public${config.ownable ? " onlyOwner" : ""} {\n        _mintBatch(to, ids, amounts, data);\n    }` : "";

      const overrides = config.supply ? `\n\n    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal override(ERC1155, ERC1155Supply) {\n        super._update(from, to, ids, values);\n    }` : "";

      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

${imports}

contract MyMultiToken is ${inherits} {
    constructor() ERC1155("https://myapi.com/metadata/{id}.json")${config.ownable ? " Ownable(msg.sender)" : ""} {}

    function setURI(string memory newuri) public${config.ownable ? " onlyOwner" : ""} {
        _setURI(newuri);
    }
${mintFn}${overrides}
}
`;
    },
  },
  {
    id: "governor",
    name: "Governor (DAO)",
    standard: "Governance",
    description: "On-chain governance with voting, proposals, and timelocks.",
    options: [
      { id: "timelock", label: "Timelock", description: "Add TimelockController for delayed execution", default: true },
      { id: "quorum", label: "Quorum Fraction", description: "Percentage-based quorum", default: true },
    ],
    generate: (config) => {
      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";${config.quorum ? `\nimport "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";` : ""}${config.timelock ? `\nimport "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";` : ""}

contract MyGovernor is Governor, GovernorSettings, GovernorCountingSimple, GovernorVotes${config.quorum ? ", GovernorVotesQuorumFraction" : ""}${config.timelock ? ", GovernorTimelockControl" : ""} {
    constructor(
        IVotes _token${config.timelock ? ",\n        TimelockController _timelock" : ""}
    )
        Governor("MyGovernor")
        GovernorSettings(7200, 50400, 0)
        GovernorVotes(_token)${config.quorum ? "\n        GovernorVotesQuorumFraction(4)" : ""}${config.timelock ? "\n        GovernorTimelockControl(_timelock)" : ""}
    {}

    function votingDelay() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingDelay();
    }

    function votingPeriod() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingPeriod();
    }

    function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.proposalThreshold();
    }
}
`;
    },
  },
  {
    id: "erc20-upgradeable",
    name: "ERC-20 (UUPS Upgradeable)",
    standard: "ERC-20 Proxy",
    description: "UUPS upgradeable ERC-20 with initializer pattern. Deploy behind a proxy.",
    options: [
      { id: "mintable", label: "Mintable", description: "Owner can mint new tokens", default: true },
      { id: "burnable", label: "Burnable", description: "Holders can burn their tokens", default: true },
      { id: "pausable", label: "Pausable", description: "Owner can pause transfers", default: false },
    ],
    generate: (config) => {
      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";${config.burnable ? `\nimport "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";` : ""}${config.pausable ? `\nimport "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";` : ""}
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract MyTokenV1 is Initializable, ERC20Upgradeable${config.burnable ? ", ERC20BurnableUpgradeable" : ""}${config.pausable ? ", ERC20PausableUpgradeable" : ""}, OwnableUpgradeable, UUPSUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) initializer public {
        __ERC20_init("MyToken", "MTK");${config.burnable ? "\n        __ERC20Burnable_init();" : ""}${config.pausable ? "\n        __ERC20Pausable_init();" : ""}
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
${config.mintable ? `\n    function mint(address to, uint256 amount) public onlyOwner {\n        _mint(to, amount);\n    }\n` : ""}${config.pausable ? `\n    function pause() public onlyOwner {\n        _pause();\n    }\n\n    function unpause() public onlyOwner {\n        _unpause();\n    }\n` : ""}
    function _authorizeUpgrade(address newImplementation) internal onlyOwner override {}${config.pausable ? `\n\n    function _update(address from, address to, uint256 value) internal override(ERC20Upgradeable, ERC20PausableUpgradeable) {\n        super._update(from, to, value);\n    }` : ""}
}
`;
    },
  },
  {
    id: "erc721-upgradeable",
    name: "ERC-721 (UUPS Upgradeable)",
    standard: "ERC-721 Proxy",
    description: "UUPS upgradeable NFT collection with initializer pattern.",
    options: [
      { id: "mintable", label: "Mintable", description: "Owner can mint new tokens", default: true },
      { id: "uriStorage", label: "URI Storage", description: "Per-token metadata URIs", default: true },
      { id: "autoIncrement", label: "Auto-increment IDs", description: "Automatic token ID counter", default: true },
    ],
    generate: (config) => {
      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";${config.uriStorage ? `\nimport "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";` : ""}
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract MyNFTV1 is Initializable, ERC721Upgradeable${config.uriStorage ? ", ERC721URIStorageUpgradeable" : ""}, OwnableUpgradeable, UUPSUpgradeable {
${config.autoIncrement ? "    uint256 private _nextTokenId;\n" : ""}
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) initializer public {
        __ERC721_init("MyNFT", "MNFT");
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
    }
${config.mintable ? `\n    function safeMint(address to${config.uriStorage ? ", string memory uri" : ""}) public onlyOwner {${config.autoIncrement ? "\n        uint256 tokenId = _nextTokenId++;" : "\n        uint256 tokenId; // set your token ID"}\n        _safeMint(to, tokenId);${config.uriStorage ? "\n        _setTokenURI(tokenId, uri);" : ""}\n    }\n` : ""}
    function _authorizeUpgrade(address newImplementation) internal onlyOwner override {}
${config.uriStorage ? `\n    function tokenURI(uint256 tokenId) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory) {\n        return super.tokenURI(tokenId);\n    }\n\n    function supportsInterface(bytes4 interfaceId) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (bool) {\n        return super.supportsInterface(interfaceId);\n    }` : ""}
}
`;
    },
  },
  {
    id: "transparent-proxy",
    name: "Transparent Proxy Pattern",
    standard: "Proxy",
    description: "Implementation contract + TransparentUpgradeableProxy deployment pattern.",
    options: [],
    generate: () => {
      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @title MyImplementationV1
/// @notice Deploy this as the implementation, then deploy a TransparentUpgradeableProxy pointing to it.
/// @dev Use OpenZeppelin's TransparentUpgradeableProxy from @openzeppelin/contracts/proxy/transparent/
contract MyImplementationV1 is Initializable, OwnableUpgradeable {
    uint256 public value;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) initializer public {
        __Ownable_init(initialOwner);
    }

    function setValue(uint256 _value) external onlyOwner {
        value = _value;
    }

    function getValue() external view returns (uint256) {
        return value;
    }
}

// DEPLOYMENT STEPS:
// 1. Deploy MyImplementationV1
// 2. Deploy TransparentUpgradeableProxy(implementationAddress, adminAddress, initData)
//    where initData = abi.encodeWithSignature("initialize(address)", ownerAddress)
// 3. Interact with the proxy address (it delegates calls to the implementation)
// 4. To upgrade: deploy MyImplementationV2, then call proxy.upgradeToAndCall(newImpl, "")
`;
    },
  },
  {
    id: "beacon-proxy",
    name: "Beacon Proxy Pattern",
    standard: "Proxy",
    description: "UpgradeableBeacon + BeaconProxy pattern for deploying many upgradeable instances.",
    options: [],
    generate: () => {
      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @title MyBeaconImplementationV1
/// @notice Deploy this as the implementation for an UpgradeableBeacon.
/// @dev Each BeaconProxy instance shares the same implementation via the beacon.
contract MyBeaconImplementationV1 is Initializable, OwnableUpgradeable {
    string public name;
    uint256 public value;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(string memory _name, address initialOwner) initializer public {
        __Ownable_init(initialOwner);
        name = _name;
    }

    function setValue(uint256 _value) external onlyOwner {
        value = _value;
    }
}

// DEPLOYMENT STEPS:
// 1. Deploy MyBeaconImplementationV1 (the shared implementation)
// 2. Deploy UpgradeableBeacon(implementationAddress, adminAddress)
// 3. For each instance: Deploy BeaconProxy(beaconAddress, initData)
//    where initData = abi.encodeWithSignature("initialize(string,address)", name, owner)
// 4. To upgrade ALL instances: call beacon.upgradeTo(newImplementationAddress)
`;
    },
  },
  {
    id: "custom",
    name: "Blank Contract",
    standard: "Custom",
    description: "Start from scratch with a minimal Solidity template.",
    options: [],
    generate: () => {
      return `// SPDX-License-Identifier: MIT
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
`;
    },
  },
];
