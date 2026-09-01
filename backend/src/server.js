const app  = require("./app");
const { PORT } = require("./config/env");

app.listen(PORT, () => {
  console.log(`AWS Architect Agent running on port ${PORT}`);
});
