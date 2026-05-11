import app from "./app";

const rawPort = process.env["PORT"] || "4000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  console.error(`Invalid PORT value: "${rawPort}", falling back to 4000`);
}

const finalPort = Number.isNaN(port) || port <= 0 ? 4000 : port;

app.listen(finalPort, () => {
  console.log(`Server listening on port ${finalPort}`);
});
