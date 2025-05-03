// src/routes/auth.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

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
//@ts-ignore
authRouter.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser)
    return res.status(409).json({ message: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 10);
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      verificationCode,
      isVerified: false,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Verification Code",
    text: `Your verification code is: ${verificationCode}`,
  });

  return res.status(200).json({ message: "User created. Check your email." });
});

// 2. VERIFY
//@ts-ignore
authRouter.post("/verify", async (req, res) => {
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
//@ts-ignore
authRouter.post("/login", async (req, res) => {
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
  
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        console.error("Password mismatch for:", email);
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
  
      return res.status(200).json({ token });
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      return res.status(500).json({ message: "Internal Server Error", error: err });
    }
  });
    