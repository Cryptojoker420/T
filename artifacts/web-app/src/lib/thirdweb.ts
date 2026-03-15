import { createThirdwebClient } from "thirdweb";
import { inAppWallet, createWallet } from "thirdweb/wallets";

export const thirdwebClient = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID || "",
});

export const wallets = [
  inAppWallet({
    auth: {
      options: ["email", "passkey", "coinbase"],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
  createWallet("com.trustwallet.app"),
  createWallet("com.safepal"),
  createWallet("pro.tokenpocket"),
  createWallet("org.uniswap"),
  createWallet("com.bybit"),
  createWallet("im.token"),
  createWallet("com.exodus"),
  createWallet("ag.jup"),
  createWallet("com.okex.wallet"),
];
