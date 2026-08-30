import fs from "node:fs";

const readDirectory = fs.readdirSync.bind(fs);

// Generated caches and archived vendor folders can be ACL-protected on the
// Windows review host. They are irrelevant to the active animation inventory.
fs.readdirSync = (directory, options) => {
  try {
    return readDirectory(directory, options);
  } catch (error) {
    if (error?.code === "EPERM" || error?.code === "EACCES") return [];
    throw error;
  }
};

await import("./build-inventory.mjs?audit=20260830");
