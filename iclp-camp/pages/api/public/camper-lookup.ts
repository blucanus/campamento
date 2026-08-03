import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { findHousehold } from "@/lib/campers";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  await connectDB();

  const found = await findHousehold(req.query.dni);
  if (!found) return res.status(404).json({ error: "No encontramos ese DNI en campas anteriores." });

  return res.status(200).json(found);
}
