import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import animeRouter from "./anime/index.js";
import comicsRouter from "./comics/index.js";
import proxyRouter from "./proxy/index.js";

const app = express();
try { (await import('dotenv')).config(); } catch {}
app.set('trust proxy', 1);
app.use(helmet());
app.use(compression());
app.use(cors());
app.get("/", (req, res) => res.send("I am alive!"));
app.use(animeRouter);
app.use(comicsRouter);
app.use(proxyRouter);

app.use((req, res, next) => {
  res.status(404).json({ success: false, error: "Not Found" });
});

app.use((err, req, res, next) => {
  const code = err && err.status ? err.status : 500;
  res.status(code).json({ success: false, error: String(err && err.message ? err.message : err) });
});

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
