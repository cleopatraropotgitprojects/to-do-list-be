import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import type { Request, Response } from "express";

const prisma = new PrismaClient();
export const authRouter = Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// 1. REGISTER
// @ts-ignore
authRouter.post("/register", async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  console.log("[REGISTER] Incoming:", req.body);

  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser)
    return res.status(409).json({ message: "Email already registered" });

  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  console.log("[REGISTER] Sending code:", verificationCode, "to:", email);

  // ✅ Cream userul si salvam rezultatul in variabila
  const newUser = await prisma.user.create({
    data: {
      email,
      password,
      verificationCode,
      isVerified: false,
      ...(name && { name }),
    },
  });

  try {
    await transporter.sendMail({
      from: `"ToDo App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Welcome to ToDo App – Your Verification Code",
      text: `Hi there!\n\nWelcome to ToDo App 🎉\n\nYour verification code is: ${verificationCode}\n\nPlease enter this code in the app to activate your account.\n\nThanks,\nToDo App Team`,
      html: `
        <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
          <p>Hi there!</p>
          <p>Welcome to <strong>ToDo App</strong> 🎉</p>
          <p style="font-size: 18px; margin: 20px 0;"><strong>Your verification code is:</strong> <span style="font-size: 20px; color: #000;">${verificationCode}</span></p>
          <p>Please enter this code in the app to activate your account.</p>
          <br />
          <p>Thanks,<br/>ToDo App Team</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[REGISTER] Failed to send email:", err);
    return res.status(500).json({ message: "Failed to send email." });
  }

  // ✅ Răspunsul corect cu userId inclus
  return res.status(200).json({
    message: "User created. Check your email.",
    userId: newUser.id,
  });
});

// 2. VERIFY
// @ts-ignore
authRouter.post("/verify", async (req: Request, res: Response) => {
  const { email, code } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ message: "User not found" });

  if (user.verificationCode !== code)
    return res.status(400).json({ message: "Invalid verification code" });

  await prisma.user.update({
    where: { email },
    data: {
      isVerified: true,
      verificationCode: "",
    },
  });

  return res.status(200).json({ message: "Account verified" });
});

// 3. LOGIN
// @ts-ignore
authRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      console.error("Missing email or password");
      return res.status(400).json({ message: "Missing credentials" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.error("User not found:", email);
      return res.status(404).json({ message: "User not found" });
    }

    // @ts-ignore
    if (password !== user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      console.error("Account not verified:", email);
      return res.status(403).json({ message: "Account not verified" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("Missing JWT_SECRET in environment");
      return res.status(500).json({ message: "Server config error" });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(200).json({
      token,
      userId: user.id,
      name: user.name,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Internal Server Error", error: err });
  }
});
