import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import {User} from "@prisma/client";

export interface AuthenticatedRequest extends Request {
    user?: User;
}

export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: "Missing or invalid token" });
        return;
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
            userId: string;
        };

        (req as AuthenticatedRequest).user = { id: decoded.userId } as User;

        next();
    } catch (err) {
        console.error("[AUTH] Invalid token", err);
        res.status(401).json({ message: "Invalid token" });
    }
};
