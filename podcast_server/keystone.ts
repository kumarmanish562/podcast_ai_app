import { withAuth, session } from "./auth";
import { config } from "@keystone-6/core";
import { User } from "./schemas/user";

export default withAuth(
  config({
    db: {
      provider: "sqlite",
      url: "file:./db.sqliteb",
    },
    lists: { User },
    session,
  })
);