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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const prisma = new client_1.PrismaClient();
exports.authRouter = (0, express_1.Router)();
const transporter = nodemailer_1.default.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});
// 1. REGISTER
// @ts-ignore
exports.authRouter.post("/register", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, name } = req.body;
    console.log("[REGISTER] Incoming:", req.body);
    if (!email || !password)
        return res.status(400).json({ message: "Email and password required" });
    const existingUser = yield prisma.user.findUnique({ where: { email } });
    if (existingUser)
        return res.status(409).json({ message: "Email already registered" });
    const passwordHash = yield bcrypt_1.default.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("[REGISTER] Sending code:", verificationCode, "to:", email);
    // ✅ Cream userul si salvam rezultatul in variabila
    const newUser = yield prisma.user.create({
        data: Object.assign({ email,
            passwordHash,
            verificationCode, isVerified: false }, (name && { name })),
    });
    try {
        yield transporter.sendMail({
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
    }
    catch (err) {
        console.error("[REGISTER] Failed to send email:", err);
        return res.status(500).json({ message: "Failed to send email." });
    }
    // ✅ Răspunsul corect cu userId inclus
    return res.status(200).json({
        message: "User created. Check your email.",
        userId: newUser.id,
    });
}));
// 2. VERIFY
// @ts-ignore
exports.authRouter.post("/verify", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, code } = req.body;
    const user = yield prisma.user.findUnique({ where: { email } });
    if (!user)
        return res.status(404).json({ message: "User not found" });
    if (user.verificationCode !== code)
        return res.status(400).json({ message: "Invalid verification code" });
    yield prisma.user.update({
        where: { email },
        data: {
            isVerified: true,
            verificationCode: "",
        },
    });
    return res.status(200).json({ message: "Account verified" });
}));
// 3. LOGIN
// @ts-ignore
exports.authRouter.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            console.error("Missing email or password");
            return res.status(400).json({ message: "Missing credentials" });
        }
        const user = yield prisma.user.findUnique({ where: { email } });
        if (!user) {
            console.error("User not found:", email);
            return res.status(404).json({ message: "User not found" });
        }
        const isMatch = yield bcrypt_1.default.compare(password, user.passwordHash);
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
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });
        return res.status(200).json({ token });
    }
    catch (err) {
        console.error("LOGIN ERROR:", err);
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
}));
