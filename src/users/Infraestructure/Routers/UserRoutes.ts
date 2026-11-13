import { Router } from "express";
import { UserController } from "../Controllers/UserController";
import { authMiddleware, AuthRequest } from "../../../core/AuthMiddleware";

export function RegisterUserRoutes(
  router: Router,
  userController: UserController
): void {
  const authGroup = Router();

  authGroup.post("/register", (req, res) => userController.register(req, res));

  authGroup.post("/login", (req, res) => userController.login(req, res));

  authGroup.get("/me", authMiddleware, (req, res) =>
    userController.me(req as AuthRequest, res)
  );

  router.use("/api/auth", authGroup);
}