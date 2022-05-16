import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { createServer } from "http";
import { MikroORM } from "@mikro-orm/core";
import mikroConfig from "../mikro-orm.config";
import config from "config";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/HelloResolver";
import PostResolver from "./resolvers/PostResolver";
import { UserResolver } from "./resolvers/UserResolver";

const port = config.get<number>("port");

async function main() {
  // connecting database
  const orm = await MikroORM.init(mikroConfig);
  orm.getMigrator().up();

  // initiating app
  const app = express();
  const server = createServer(app);

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: () => ({ em: orm.em }),
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app });

  server.listen(port, () => console.log("server is running on port--> ", port));
}

main();
