import { existsSync } from "node:fs";
import { join, sep } from "node:path";
import Fastify from "fastify";
import compress from "@fastify/compress";
import helmet from "@fastify/helmet";
import fastifyStatic from "@fastify/static";

try {
  process.loadEnvFile();
} catch {
}

const rootDir = process.cwd();
const clientDir = join(rootDir, "dist", "client");
const serverEntry = join(rootDir, "dist", "server", "entry.mjs");

if (!existsSync(serverEntry)) {
  console.error("run `pnpm build` first.");
  process.exit(1);
}

const { handler: astroHandler } = (await import("./dist/server/entry.mjs")) as {
  handler: (req: unknown, res: unknown) => unknown;
};

const port = Number(process.env.PORT ?? 6767);
const host = process.env.HOST ?? "0.0.0.0";

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error(`Invalid PORT: ${process.env.PORT}`);
  process.exit(1);
}

const app = Fastify({
  logger: true,
  trustProxy: true,
  bodyLimit: 257 * 1024 * 1024,
});

await app.register(helmet, { contentSecurityPolicy: false });
await app.register(compress, { global: true, threshold: 1024 });

if (existsSync(clientDir)) {
  await app.register(fastifyStatic, {
    root: clientDir,
    prefix: "/",
    wildcard: false,
    index: false,
    redirect: false,
    dotfiles: "ignore",
    etag: true,
    lastModified: true,
    maxAge: "1h",
    setHeaders: (reply, pathName) => {
      if (pathName.includes(`${sep}_astro${sep}`)) {
        reply.header("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  });
} else {
  app.log.warn("static assets will 404 until `pnpm build` runs.");
}

app.setNotFoundHandler((request, reply) => {
  reply.hijack();
  void Promise.resolve(astroHandler(request.raw, reply.raw)).catch((err) => {
    request.log.error(err);
    if (!reply.raw.headersSent) {
      reply.raw.statusCode = 500;
      reply.raw.end("Internal Server Error");
    }
  });
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    app.log.info(`${signal} received, shutting down`);
    void app.close().finally(() => process.exit(0));
  });
}

try {
  await app.listen({ port, host });
  const displayHost = host === "0.0.0.0" ? "localhost" : host;
  app.log.info(`tadpole listening on http://${displayHost}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
