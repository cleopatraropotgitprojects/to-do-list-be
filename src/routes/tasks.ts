import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Create a task
// @ts-ignore
router.post("/", async (req: Request, res: Response) => {
    try {
        const { text, isRoutine, done, date } = req.body;

        if (!text || !date) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const task = await prisma.task.create({
            data: { text, isRoutine, done, date },
        });

        res.status(201).json(task);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Update a task
router.put("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { text, isRoutine, done } = req.body;

        const updated = await prisma.task.update({
            where: { id },
            data: { text, isRoutine, done },
        });

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update task" });
    }
});

// Delete a task
router.delete("/:id", async (req: Request, res: Response) => {
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

export default router;
