import forever from "forever-monitor";
var boot = new forever.Monitor("index.js", {
  silent: false,
});
boot.start();