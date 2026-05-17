import { Router, type IRouter } from "express";
import { getBrandRecommendations } from "../services/brandService";

const router: IRouter = Router();

router.get("/brands/:substituteName", async (req, res): Promise<void> => {
  try {
    const { substituteName } = req.params;
    const result = await getBrandRecommendations(substituteName);
    res.json(result);
  } catch {
    res.json({
      brandable: false,
      substituteName: req.params.substituteName,
      bestOverall: null,
      cleanest: null,
      budget: null,
    });
  }
});

export default router;
