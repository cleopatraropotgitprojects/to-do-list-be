import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import taskRoutes from "./routes/tasks";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use("/tasks", taskRoutes);

app.get("/health", (_, res) => {
    res.send("OK");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
