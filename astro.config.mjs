// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { execSync } from "node:child_process";
import pkg from "./package.json" with { type: "json" };
import node from "@astrojs/node";

const { version } = pkg;

export default defineConfig({
  output: "server",
  compressHTML: true,

  vite: {
    plugins: [tailwindcss()],
    esbuild: {
      legalComments: "none",
    },
    build: {
      minify: "terser",
      sourcemap: false,
      terserOptions: {
        compress: {
          drop_debugger: true,
          passes: 2,
        },
        mangle: {
          toplevel: true,
        },
        format: {
          comments: false,
        },
      },
      rollupOptions: {
        preserveEntrySignatures: "strict",
        treeshake: true,
      },
    },
    define: {
      // dynamically changed vars in astro html its {NAME}
      VERSION: JSON.stringify(version),
      HASH: JSON.stringify(getCommit()),
    },
  },

  adapter: node({
    mode: "middleware",
  }),
});

function getCommit() {
  try {
    const hash = execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    return `https://github.com/stressfulpuppy/tadpole/commit/${hash}`;
  } catch {
    return "https://github.com/stressfulpuppy/tadpole/commit/";
  }
}
