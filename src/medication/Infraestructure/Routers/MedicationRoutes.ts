
import { Router } from "express";
import { MedicationController } from "../Controllers/MedicationController";

export function RegisterMedicationRoutes(
  router: Router,
  medicationController: MedicationController
): void {

  const medicationGroup = Router();

  // GET ALL
  medicationGroup.get("/", (req, res) =>
    medicationController.getAll(req, res)
  );

  // GET BY ID
  medicationGroup.get("/:id", (req, res) =>
    medicationController.getById(req, res)
  );

  // GET BY PATIENT
  medicationGroup.get("/patient/:patientId", (req, res) =>
    medicationController.getByPatientId(req, res)
  );

  // GET BY CAREGIVER
  medicationGroup.get("/caregiver/:caregiverId", (req, res) =>
    medicationController.getByCaregiverId(req, res)
  );

  // CREATE
  medicationGroup.post("/", (req, res) =>
    medicationController.create(req, res)
  );

  // UPDATE
  medicationGroup.put("/:id", (req, res) =>
    medicationController.update(req, res)
  );

  // DELETE
  medicationGroup.delete("/:id", (req, res) =>
    medicationController.delete(req, res)
  );

  router.use("/medications", medicationGroup);
}
