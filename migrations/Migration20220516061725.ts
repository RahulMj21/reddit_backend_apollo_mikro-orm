import { Migration } from '@mikro-orm/migrations';

export class Migration20220516061725 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "user" ("id" serial primary key, "name" varchar(255) not null, "email" varchar(255) not null, "password" varchar(255) not null, "created_at" timestamptz(0) not null, "updated_at" timestamptz(0) not null);');
    this.addSql('alter table "user" add constraint "user_email_unique" unique ("email");');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "user" cascade;');
  }

}
