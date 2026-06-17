import dotenv from "dotenv";
dotenv.config();

import express from "express";
const app = express();
app.use(express.json());

import prisma from "./src/utils/prisma.util.js";

const port = process.env.PORT || 5000;

import userRouter from "./src/routes/user.route.js";
app.use("/user", userRouter);

app.use("/", (req, res) => {
  res.send("HI!!!!!!!!!!");
});


app.listen(port, () => {
  try {
    console.log("Database Connected Successfully!!");
    console.log(`Server running at port ${port}`);
  } catch (error) {
    console.error("Error", error);
  }
});
