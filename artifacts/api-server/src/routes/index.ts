import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chainsRouter from "./chains";
import walletsRouter from "./wallets";
import tokensRouter from "./tokens";
import contractsRouter from "./contracts";
import bridgesRouter from "./bridges";
import mevRouter from "./mev";
import toolsRouter from "./tools";
import delegationsRouter from "./delegations";
import sessionKeysRouter from "./session-keys";
import safeModulesRouter from "./safe-modules";
import compilerRouter from "./compiler";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chainsRouter);
router.use(walletsRouter);
router.use(tokensRouter);
router.use(contractsRouter);
router.use(bridgesRouter);
router.use(mevRouter);
router.use(toolsRouter);
router.use("/delegations", delegationsRouter);
router.use("/session-keys", sessionKeysRouter);
router.use("/safe-modules", safeModulesRouter);
router.use(compilerRouter);

export default router;
