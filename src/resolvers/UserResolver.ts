import {
  ObjectType,
  Field,
  InputType,
  Ctx,
  Arg,
  Resolver,
  Mutation,
  Query,
} from "type-graphql";
import { MyContext } from "../types";
import { User } from "../entity/user";
import argon from "argon2";
import { RequiredEntityData } from "@mikro-orm/core";

@InputType()
export class RegisterInput {
  @Field(() => String)
  email!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  password!: string;
}
@InputType()
export class LoginInput {
  @Field()
  email!: string;

  @Field()
  password!: string;
}
@ObjectType()
export class FieldError {
  @Field()
  field!: string;

  @Field()
  message!: string;
}
@ObjectType()
export class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Mutation(() => UserResponse)
  async register(
    @Arg("input")
    input: RegisterInput,
    @Ctx()
    { em, req }: MyContext
  ): Promise<UserResponse> {
    try {
      if (input.name.length < 3) {
        return {
          errors: [
            {
              field: "name",
              message: "name must be longer than three characters",
            },
          ],
        };
      }
      if (input.password.length < 6) {
        return {
          errors: [
            {
              field: "password",
              message: "password must be longer than six characters",
            },
          ],
        };
      }
      const hash = await argon.hash(input.password);
      const user = em.create(User, {
        name: input.name,
        email: input.email,
        password: hash,
      } as RequiredEntityData<User>);
      await em.persistAndFlush(user);

      req.session.userId = user.id;
      return {
        user,
      };
    } catch (error: any) {
      if (error.code === "23505") {
        return {
          errors: [
            {
              field: "email",
              message: "email already exists",
            },
          ],
        };
      }
      return {
        errors: [
          {
            field: "system_error",
            message: "invalid request",
          },
        ],
      };
    }
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("input", () => LoginInput)
    input: LoginInput,
    @Ctx()
    { em, req }: MyContext
  ): Promise<UserResponse> {
    try {
      const user = await em.findOne(User, { email: input.email });
      if (!user)
        return {
          errors: [
            {
              field: "email",
              message: "wrong email",
            },
          ],
        };
      const isMatched = await argon.verify(user.password, input.password);
      if (!isMatched)
        return {
          errors: [
            {
              field: "password",
              message: "wrong password",
            },
          ],
        };
      req.session.userId = user.id;
      return { user };
    } catch (error: any) {
      return {
        errors: [
          {
            field: "system_error",
            message: "internal server error",
          },
        ],
      };
    }
  }

  @Mutation(() => Boolean)
  async logout(
    @Ctx()
    { req, res }: MyContext
  ) {
    return new Promise((resolve) => {
      req.session.destroy((err) => {
        if (err) {
          console.log("logout error --> ", err), resolve(false);
          return;
        } else {
          res.clearCookie("qid");
          resolve(true);
        }
      });
    });
  }

  @Query(() => User, { nullable: true })
  async me(
    @Ctx()
    { em, req }: MyContext
  ) {
    const id = req.session.userId;
    const user = await em.findOne(User, { id });
    return user;
  }
}
