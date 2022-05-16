import config from "config";
import { MikroORM } from "@mikro-orm/core";
import path from "path";
import { Post } from "./src/entity/post";
import { User } from "./src/entity/user";

export default {
  migrations: {
    path: path.join(__dirname, "/migrations"),
  },
  type: "postgresql",
  dbName: config.get<string>("dbName"),
  user: config.get<string>("dbUser"),
  password: config.get<string>("dbPassword"),
  debug: !config.get<boolean>("__prod__"),
  entities: [Post, User],
  allowGlobalContext: true,
} as Parameters<typeof MikroORM.init>[0];
