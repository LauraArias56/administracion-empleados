const app = require("../backend");

module.exports = (req, res) => {
  const url = req.url || "/";
  if (!url.startsWith("/api")) {
    const suffix = url.startsWith("/") ? url : `/${url}`;
    req.url = `/api${suffix}`;
  }
  return app(req, res);
};
