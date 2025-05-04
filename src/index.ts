import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import taskRoutes from "./routes/tasks";
import { authRouter } from "./routes/auth";
import googleAuthRouter from "./routes/googleAuth";

dotenv.config();
const app = express();

app.use(
    cors({
        origin: "http://localhost:3000",
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    })
);

app.use(express.json());

app.use("/tasks", taskRoutes);
app.use("/auth", authRouter);
app.use("/auth", googleAuthRouter);


app.get("/health", (_, res) => {
    res.send("OK");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
