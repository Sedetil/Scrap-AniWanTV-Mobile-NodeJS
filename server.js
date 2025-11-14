import express from "express";
import cors from "cors";
import animeRouter from "./anime/index.js";
import comicsRouter from "./comics/index.js";
import proxyRouter from "./proxy/index.js";

const app = express();
app.use(cors());
app.get("/", (req, res) => res.send("I am alive!"));
app.use(animeRouter);
app.use(comicsRouter);
app.use(proxyRouter);

const basePort = Number(process.env.PORT) || 5000;
function start(p, tries = 0) {
  const srv = app.listen(p, () => {
    process.env.PORT = String(p);
    console.log(`Listening on ${p}`);
  });
  srv.on("error", (e) => {
    if (e && e.code === "EADDRINUSE" && tries < 10) {
      start(p + 1, tries + 1);
    } else {
      throw e;
    }
  });
}

export default app;
if (!process.env.VERCEL) {
  start(basePort);
}
