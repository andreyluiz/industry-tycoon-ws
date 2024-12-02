module.exports = {
  apps: [
    {
      name: "app",
      script: "./main.ts",
      interpreter: "deno",
      interpreterArgs: "run --allow-net --allow-env --env-file",
    },
  ],
};
