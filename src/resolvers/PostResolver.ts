import { RequiredEntityData } from "@mikro-orm/core";
import {
  Resolver,
  Query,
  Ctx,
  Int,
  Arg,
  Mutation,
  InputType,
  Field,
} from "type-graphql";
import { Post } from "../entity/post";
import { MyContext } from "../types";

@InputType()
export class PostInput {
  @Field(() => String)
  author!: string;

  @Field()
  title!: string;
}

@Resolver()
export default class {
  @Query(() => [Post])
  async posts(@Ctx() { em }: MyContext): Promise<Post[]> {
    return await em.find(Post, {});
  }

  @Query(() => Post, { nullable: true })
  async post(
    @Arg("id", () => Int)
    id: number,
    @Ctx() { em }: MyContext
  ): Promise<Post | null> {
    const post = await em.findOne(Post, { id });
    if (!post) return null;
    return post;
  }

  @Mutation(() => Post)
  async createPost(
    @Arg("inputs")
    inputs: PostInput,
    @Ctx()
    { em }: MyContext
  ) {
    const post = em.create(Post, inputs as RequiredEntityData<Post>);
    await em.persistAndFlush(post);
    return post;
  }

  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg("id")
    id: number,
    @Arg("title")
    title: string,
    @Ctx()
    { em }: MyContext
  ): Promise<Post | null> {
    const post = await em.findOne(Post, { id });

    if (!post) {
      return null;
    }
    post.title = title;
    await em.persistAndFlush(post);
    return post;
  }

  @Mutation(() => String)
  async deletePost(
    @Arg("id", () => Int)
    id: number,
    @Ctx()
    { em }: MyContext
  ): Promise<string> {
    const deletedPost = await em.nativeDelete(Post, { id });
    if (!deletedPost) return "post dosen't exists";
    return "post deleted";
  }
}
