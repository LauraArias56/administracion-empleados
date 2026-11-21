const app = require("../backend");

module.exports = (req, res) => {
  const current = new URL(req.url || "/", "http://localhost");
  const nested = current.searchParams.get("path");
  if (nested) {
    current.searchParams.delete("path");
    const query = current.searchParams.toString();
    req.url = `/api/${nested}${query ? `?${query}` : ""}`;
  }
  return app(req, res);
};
