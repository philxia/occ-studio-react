import browserSync from "browser-sync";
import { build, BuildOptions } from "esbuild";
import fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "path";
import WebWorkerPlugin from "../plugins/WebWorkerPlugin";
import WasmPlugin from "../plugins/WasmPlugin";
const cssModulesPlugin = require("esbuild-css-modules-plugin");
const copyStaticFiles = require('esbuild-copy-static-files');

const protocal = process?.env?.port || "http";
const host = process?.env?.port || "localhost";
const port = parseInt(process?.env?.port || "3000");
const url = `${protocal}://${host}:${port}`;

const Fastify = fastify();
const bs = browserSync.create();
const buildOptions: BuildOptions = {
  // banner: {
  //   js: "import { createRequire as topLevelCreateRequire } from 'module';\n const require = topLevelCreateRequire(import.meta.url);"
  // },
  bundle: true,
  entryPoints: [path.resolve(__dirname, "..", "src/index.tsx")],
  outdir: path.resolve(__dirname, "..", "dist"),
  define: {
    'process.env.NODE_ENV': '"development"',
  },
  sourcemap: true,
  watch: {
    onRebuild: (error, result) => {
      if (error) {
        console.error("watch rebuild failed:", error);
      } else {
        console.log("watch rebuild succeeded: ", result);
        bs.reload();
      }
    },
  },
  plugins: [WasmPlugin, WebWorkerPlugin, cssModulesPlugin(), copyStaticFiles({
    src: './node_modules/opencascade.js/dist/opencascade.full.wasm',
    dest: './dist/bundle/opencascade.full.wasm'
  })],
  platform: "browser",
  external: ["fs", "path", "process"],
};

const devApp = async () => {
  try {
    await build(buildOptions);

    Fastify.register(fastifyStatic, {
      root: path.resolve(__dirname, "..", "dist"),
    });

    Fastify.listen({ port }, (err: Error | null, address: string) => {
      if (err) throw err;
      console.log(`Server is now listening on ${address}`);
    });

    bs.init({
      proxy: url,
      ui: false,
    });
  } catch (e) {
    process.exit(1);
  }
};

devApp();
