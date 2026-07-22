import http from "http";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { get as httpGet, request as httpRequest } from "https";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;

function localIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === "IPv4" && !iface.internal && !iface.address.startsWith("169.254")) {
        return iface.address;
      }
    }
  }
  return "localhost";
}
const port = 5500;
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
};

http
  .createServer((req, res) => {
    let url = req.url === "/" ? "/index.html" : req.url.split("?")[0];
    const file = path.join(root, url);
    if (!file.startsWith(root)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end("Not found");
      }
      const ext = path.extname(file);
      const noCache = ext === ".html" || ext === ".js" || ext === ".css" ? "no-cache" : null;
      const headers = { "Content-Type": types[ext] || "text/plain" };
      if (noCache) headers["Cache-Control"] = noCache;
      res.writeHead(200, headers);
      res.end(data);
    });
  })
  .listen(port, "0.0.0.0", () =>
    console.log(`Vookuz DQS running at http://localhost:${port}  (LAN: http://${localIP()}:${port})`)
  );

const FB_URL = "https://vookuzdqs-default-rtdb.asia-southeast1.firebasedatabase.app";
http
  .createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (!req.url.startsWith("/fb")) {
      res.writeHead(404);
      return res.end("Not found");
    }
    const target = FB_URL + req.url.replace("/fb", "");
    const method = req.method;
    const headers = { "Content-Type": "application/json" };
    if (method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      });
      return res.end();
    }
    if (method === "GET") {
      httpGet(target, { headers }, (r) => {
        const chunks = [];
        r.on("data", (c) => chunks.push(c));
        r.on("end", () => {
          res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
          res.end(Buffer.concat(chunks));
        });
      }).on("error", (e) => { res.writeHead(502); res.end(e.message); });
    } else {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const r = httpRequest(target, { method, headers }, (resp) => {
          const out = [];
          resp.on("data", (c) => out.push(c));
          resp.on("end", () => {
            res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
            res.end(Buffer.concat(out));
          });
        });
        r.write(Buffer.concat(chunks));
        r.end();
      });
    }
  })
  .listen(5599, "0.0.0.0", () => console.log(`Firebase proxy on :5599`));
