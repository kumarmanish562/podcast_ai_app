import { withAuth, session } from "./auth";
import { config } from "@keystone-6/core";
import { User } from "./schemas/user";
import { Podcast } from "./schemas/podcast";
import { Artist } from "./schemas/artist";
import { extendGraphqlSchema } from "./schemas/extend";

export default withAuth(
  config({
    db: {
      provider: "sqlite",
      url: "file:./db.sqlite",
    },
    lists: { User, Podcast, Artist },
    session,
    ui:{
      isAccessAllowed: ({ session }) => {
        return !!session?.data?.isAdmin;
      },
    },
    graphql: {
      extendGraphqlSchema: extendGraphqlSchema,
    }
  })
);