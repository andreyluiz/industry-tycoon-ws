import { createClient } from "redis";

if (
  !Deno.env.get("REDIS_PASSWORD") ||
  !Deno.env.get("REDIS_HOST") ||
  !Deno.env.get("REDIS_PORT")
) {
  throw new Error("Missing essential environment variables");
}

const redis = createClient({
  password: Deno.env.get("REDIS_PASSWORD"),
  socket: {
    host: Deno.env.get("REDIS_HOST"),
    port: parseInt(Deno.env.get("REDIS_PORT") ?? "0"),
  },
});

export const getBalance = async (account: string) => {
  let balance = await redis.get(`balance:${account}`);

  if (!balance) {
    await redis.set(`balance:${account}`, "10000000");
    balance = await redis.get(`balance:${account}`);
  }

  console.log("redis balance", balance);

  return balance ? parseInt(balance) : 0;
};

interface Request {
  type: string;
}

interface BalanceRequest extends Request {
  account: string;
}

Deno.serve((req) => {
  if (req.headers.get("upgrade") != "websocket") {
    return new Response(null, { status: 501 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.addEventListener("open", async () => {
    await redis.connect();
    console.log("a client connected!");
  });

  socket.addEventListener("close", async () => {
    console.log("a client disconnected!");
    if (redis.isOpen) {
      await redis.disconnect();
    }
  });

  socket.addEventListener("message", async (event) => {
    try {
      const data: Request = JSON.parse(event.data);

      if (data.type === "balance") {
        const balanceRequest = data as BalanceRequest;
        const balance = await getBalance(balanceRequest.account);
        socket.send(JSON.stringify({ type: "balance", balance }));
      }
    } catch (e) {
      console.log(e);
    }
  });

  socket.addEventListener("error", (event) => {
    console.log("an error occurred!", event);
  });

  return response;
});
