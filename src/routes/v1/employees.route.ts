import { Router } from "express";
import { EmployeeController } from "../../controllers/employee.controller";
import { container } from "../../config/container";

const router = Router();

router.post("/employees", async (req, res) => {
  const controller = container.resolve<EmployeeController>("employeeController");
  return controller.createEmployee(req, res);
});

router.get("/employees/:id", async (req, res) => {
  const controller = container.resolve<EmployeeController>("employeeController");
  return controller.getEmployee(req, res);
});

router.patch("/employees/:id", async (req, res) => {
  const controller = container.resolve<EmployeeController>("employeeController");
  return controller.updateEmployee(req, res);
});

router.post("/employees/:id/vacations", async (req, res) => {
  const controller = container.resolve<EmployeeController>("employeeController");
  return controller.requestVacation(req, res);
});

router.patch("/vacations/:id", async (req, res) => {
  const controller = container.resolve<EmployeeController>("employeeController");
  return controller.resolveVacation(req, res);
});

export default router;
