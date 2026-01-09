import type { NextApiRequest, NextApiResponse } from "next";
import { env } from "@/lib/env";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    process_ENV_CAMP_PRICE_FULL: process.env.CAMP_PRICE_FULL ?? null,
    env_CAMP_PRICE_FULL: env.CAMP_PRICE_FULL ?? null,
    env_CAMP_PRICE_ONE_DAY_FACTOR: env.CAMP_PRICE_ONE_DAY_FACTOR ?? null,
    node_env: process.env.NODE_ENV
  });
}
