import app from "./app";

const rawPort = process.env["PORT"] || "4000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  console.error(`Invalid PORT value: "${rawPort}", falling back to 4000`);
}

const finalPort = Number.isNaN(port) || port <= 0 ? 4000 : port;

const server = app.listen(finalPort, () => {
  console.log(`Server listening on port ${finalPort} (pid=${process.pid})`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${finalPort} is already in use. Stop the old process and retry.`);
  } else {
    console.error("Server startup error:", err);
  }
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});
