import { Router, type IRouter } from "express";
import healthRouter from "./health";
import recipeRouter from "./recipe";
import authRouter from "./auth";
import brandRouter from "./brands";

const router: IRouter = Router();

router.use(healthRouter);
router.use(recipeRouter);
router.use(authRouter);
router.use(brandRouter);

export default router;
