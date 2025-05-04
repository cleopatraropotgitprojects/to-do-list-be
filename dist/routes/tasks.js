"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.query;
        const tasks = yield prisma.task.findMany({
            where: date ? { date: String(date) } : {},
            orderBy: { date: 'asc' },
        });
        res.json(tasks);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch tasks" });
    }
}));
router.get("/routine", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tasks = yield prisma.task.findMany({
            where: {
                isRoutine: true,
            },
            orderBy: { date: "asc" },
        });
        res.json(tasks);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch routine tasks" });
    }
}));
// @ts-ignore
router.post("/routine", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { text, startDate, days, userId } = req.body;
        if (!text || !startDate || !days || !userId) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const lines = text
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
        const tasks = [];
        for (let i = 0; i < days; i++) {
            const date = (0, date_fns_1.format)((0, date_fns_1.addDays)((0, date_fns_1.parseISO)(startDate), i), "yyyy-MM-dd");
            for (const line of lines) {
                tasks.push(prisma.task.create({
                    data: {
                        text: line,
                        isRoutine: true,
                        done: false,
                        date,
                        userId, // ✅ adăugat
                    },
                }));
            }
        }
        const created = yield Promise.all(tasks);
        res.status(201).json(created);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create routine" });
    }
}));
// @ts-ignore
router.delete("/routine", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { text, fromDate } = req.query;
        if (!text || !fromDate) {
            return res.status(400).json({ error: "Missing text or fromDate" });
        }
        yield prisma.task.deleteMany({
            where: {
                isRoutine: true,
                text: String(text),
                date: {
                    gte: String(fromDate),
                },
            },
        });
        res.status(204).send();
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to delete routine tasks" });
    }
}));
// @ts-ignore
router.put("/routine", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { oldText, newText, fromDate } = req.body;
        if (!oldText || !newText || !fromDate) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const updated = yield prisma.task.updateMany({
            where: {
                isRoutine: true,
                text: oldText,
                date: {
                    gte: String(fromDate),
                },
            },
            data: {
                text: newText,
            },
        });
        res.json(updated);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update routine tasks" });
    }
}));
// @ts-ignore
router.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { text, isRoutine, done, date, userId } = req.body;
        if (!text || !date) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        if (isRoutine && text.includes("\n")) {
            const lines = text
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0);
            const createdTasks = yield Promise.all(lines.map((line) => prisma.task.create({
                data: {
                    text: line,
                    isRoutine: true,
                    done: false,
                    date,
                    userId,
                },
            })));
            return res.status(201).json(createdTasks);
        }
        const task = yield prisma.task.create({
            data: { text, isRoutine, done, date, userId },
        });
        res.status(201).json(task);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
}));
router.put("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { text, isRoutine, done } = req.body;
        const updated = yield prisma.task.update({
            where: { id },
            data: { text, isRoutine, done },
        });
        res.json(updated);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update task" });
    }
}));
router.delete("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.task.delete({
            where: { id },
        });
        res.status(204).send();
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to delete task" });
    }
}));
// @ts-ignore
router.patch("/:id/toggle", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // First get the current task to know its current done status
        const currentTask = yield prisma.task.findUnique({
            where: { id }
        });
        if (!currentTask) {
            return res.status(404).json({ error: "Task not found" });
        }
        // Toggle the done status
        const updated = yield prisma.task.update({
            where: { id },
            data: { done: !currentTask.done }
        });
        res.json(updated);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to toggle task status" });
    }
}));
exports.default = router;
