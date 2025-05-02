import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Get all tasks
router.get("/", async (req: Request, res: Response) => {
    try {
      const { date } = req.query;
  
      const tasks = await prisma.task.findMany({
        where: date ? { date: String(date) } : {},
        orderBy: { date: 'asc' },
      });
  
      res.json(tasks);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });
  

// @ts-ignore
router.post("/", async (req: Request, res: Response) => {
    try {
        const { text, isRoutine, done, date } = req.body;

        if (!text || !date) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (isRoutine && text.includes("\n")) {
            const lines = text
                .split("\n")
                .map((line: any) => line.trim())
                .filter((line: any) => line.length > 0);

            const createdTasks = await Promise.all(
                lines.map((line: any) =>
                    prisma.task.create({
                        data: {
                            text: line,
                            isRoutine: true,
                            done: false,
                            date,
                        },
                    })
                )
            );

            return res.status(201).json(createdTasks);
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

// @ts-ignore
router.patch("/:id/toggle", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        // First get the current task to know its current done status
        const currentTask = await prisma.task.findUnique({
            where: { id }
        });

        if (!currentTask) {
            return res.status(404).json({ error: "Task not found" });
        }

        // Toggle the done status
        const updated = await prisma.task.update({
            where: { id },
            data: { done: !currentTask.done }
        });

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to toggle task status" });
    }
});

export default router;
