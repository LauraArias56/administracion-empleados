import { Router } from "express";
import employeesRoutes from "./employees.route";

const router = Router();

router.use("/v1", employeesRoutes);

export default router;
