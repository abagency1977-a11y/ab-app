const { spawn: originalSpawn } = require("child_process");

function wrappedSpawn(command, args, options) {
  console.log("⚡ Spawn called:", { command, args, options });

  try {
    return originalSpawn(command, args, options);
  } catch (err) {
    console.error("🚨 Spawn failed:", command, args, err);
    throw err;
  }
}

module.exports = { spawn: wrappedSpawn };
