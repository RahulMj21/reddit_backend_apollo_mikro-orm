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
import CustomError from "../utils/CustomError";
import sendMail from "../utils/sendMail";
import { v4 } from "uuid";
import config from "config";

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
@InputType()
export class ResetPasswordInput {
  @Field(() => String!)
  token!: string;

  @Field(() => String!)
  newPassword!: string;
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
@ObjectType()
export class ForgotPasswordResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => Boolean, { nullable: true })
  success?: Boolean;
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
          errors: [new CustomError("email", "wrong email")],
        };
      const isMatched = await argon.verify(user.password, input.password);
      if (!isMatched)
        return {
          errors: [new CustomError("password", "wrong password")],
        };
      req.session.userId = user.id;
      return { user };
    } catch (error: any) {
      return {
        errors: [new CustomError("system_error", "something went wrong")],
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

  @Mutation(() => ForgotPasswordResponse)
  async forgotPassword(
    @Arg("email", () => String!)
    email: string,
    @Ctx()
    { em, redis }: MyContext
  ): Promise<ForgotPasswordResponse> {
    try {
      const user = await em.findOne(User, { email });
      if (!user) {
        return {
          errors: [new CustomError("email", "email not registered")],
        };
      }

      const token = v4();
      const html = `<a>http://localhost:3000/forgotpassword/${token}</a>`;

      const isMailSent = await sendMail(email, html);
      if (!isMailSent) {
        return {
          errors: [new CustomError("email", "email cannot be sent")],
        };
      } else {
        await redis.set(
          config.get<string>("forgotPasswordPrefix") + token,
          user.id,
          "EX",
          1000 * 60 * 60 // 1 hour
        );
        return {
          success: true,
        };
      }
    } catch (error: any) {
      return { errors: [new CustomError("email", "went wront")] };
    }
  }

  @Mutation(() => UserResponse)
  async resetPassword(
    @Arg("input")
    { token, newPassword }: ResetPasswordInput,
    @Ctx()
    { em, redis }: MyContext
  ) {
    if (newPassword.length < 6) {
      return {
        errors: [
          new CustomError("password", "password must me 6 characters long"),
        ],
      };
    }
    const key = config.get<string>("forgotPasswordPrefix") + token;
    const userId = await redis.get(key);
    if (!userId) {
      return { errors: [new CustomError("token", "token expired")] };
    }
    const id = parseInt(userId);
    const user = await em.findOne(User, { id });
    if (!user) {
      return { errors: [new CustomError("token", "token expired")] };
    }
    const hash = await argon.hash(newPassword);
    user.password = hash;
    em.persistAndFlush(user);
    await redis.del(key);
    return { user };
  }
}
