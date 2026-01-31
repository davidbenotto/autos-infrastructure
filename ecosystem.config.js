module.exports = {
  apps: [
    {
      name: "cloud-portal-frontend",
      cwd: "./frontend",
      script: "npm",
      args: "run dev",
      interpreter: "none",
      env: {
        NODE_ENV: "development",
      },
    },
    {
      name: "cloud-portal-backend",
      cwd: "./backend",
      script: "npm",
      args: "run dev",
      interpreter: "none",
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};
