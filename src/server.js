const app = require("./app");
const { env, validateEnv } = require("./config/env");
const { verifyMailer } = require("./config/mailer");

async function startServer() {
  try {
    // Validate required SMTP config before starting.
    validateEnv();
    await verifyMailer();

    app.listen(env.port, function onListen() {
      console.log("Node auth server running on http://localhost:" + env.port);
      console.log("SMTP is ready.");
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
