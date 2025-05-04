import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, AuthenticatedRequest } from "../middleware/authenticate";

const router = Router();
const prisma = new PrismaClient();

// @ts-ignore
router.get("/", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    const { date } = req.query;

    if (!date) {
        return res.status(400).json({ message: "Missing date parameter" });
    }

    try {
        const tasks = await prisma.task.findMany({
            where: {
                userId: req.user!.userId,
                date: String(date),
            },
        });

        res.json(tasks);
    } catch (error) {
        console.error("[GET /tasks] Error:", error);
        res.status(500).json({ error: "Failed to fetch tasks" });
    }
});

// @ts-ignore
router.post("/", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { text, done, date } = req.body;

        if (!text || !date) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const task = await prisma.task.create({
            // @ts-ignore
            data: {
                text,
                done,
                date,
                userId: req.user!.userId, // ✅ din token, nu din body
            },
        });

        res.status(201).json(task);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.put("/:id", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { text, done } = req.body;

        const updated = await prisma.task.update({
            where: { id },
            data: { text, done },
        });

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update task" });
    }
});

router.delete("/:id", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.task.delete({
            where: { id },
        });

        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to delete task" });
    }
});
// @ts-ignore
router.patch("/:id/toggle", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;

        const currentTask = await prisma.task.findUnique({ where: { id } });

        if (!currentTask) {
            return res.status(404).json({ error: "Task not found" });
        }

        const updated = await prisma.task.update({
            where: { id },
            data: { done: !currentTask.done },
        });

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to toggle task status" });
    }
});

export default router;
