import forever from "forever-monitor";
const boot = new forever.Monitor("index.js", {
  silent: false,
});
boot.start();
