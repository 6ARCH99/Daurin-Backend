/** Wait until MySQL accepts connections (used after docker compose up). */
import net from "net";

const host = process.env.MYSQL_HOST || "127.0.0.1";
const port = Number(process.env.MYSQL_PORT || 3306);
const maxAttempts = 40;
const delayMs = 1500;

function tryConnect() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", reject);
    socket.setTimeout(3000, () => {
      socket.destroy();
      reject(new Error("timeout"));
    });
  });
}

async function main() {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      await tryConnect();
      console.log(`MySQL ready on ${host}:${port}`);
      return;
    } catch {
      console.log(`Waiting for MySQL (${i}/${maxAttempts})…`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  console.error("MySQL did not become ready in time.");
  process.exit(1);
}

main();
