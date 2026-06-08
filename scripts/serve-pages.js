const path = require("path");
const { startStaticServer } = require("../server");

startStaticServer({
  root: path.join(process.cwd(), "dist"),
});
