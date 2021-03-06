import * as t from "io-ts";
import { DB } from "../db/DB";
import { Getter } from "./Router";

export interface Pong {
  response: string;
}

export class Ping<TBigNumber> {
  public static PingParams = t.type({});

  @Getter()
  public static async ping<TBigNumber>(db: DB<TBigNumber>, params: t.TypeOf<typeof Ping.PingParams>): Promise<Pong> {
    return {
      response: "pong",
    };
  }
}
