import express from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();
const router = express.Router();
const prisma = new PrismaClient();

const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// @ts-ignore
router.get("/google/callback", async (req, res) => {
    const code = req.query.code as string;

    try {
        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);

        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token!,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload?.email) {
            return res.status(400).json({ error: "No email in Google response" });
        }

        let user = await prisma.user.findUnique({ where: { email: payload.email } });

        if (!user) {
            user = await prisma.user.create({
                // @ts-ignore
                data: {
                    email: payload.email,
                    name: payload.name || "Unnamed User",
                },
            });
        }

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET as string,
            { expiresIn: "7d" }
        );

        res.redirect(`http://localhost:3000/auth-success?token=${token}&userId=${user.id}`);
    } catch (error) {
        console.error("[Google Auth Error]", error);
        res.status(500).json({ error: "Failed to authenticate with Google" });
    }
});

export default router;
