import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await connectDB();
  const dni = req.query.dni;
  const reg = await Registration.findOne({ "attendees.dni": dni });
  if (!reg) return res.status(404).json({});

  const a = reg.attendees.find((x: any) => x.dni === dni);
  res.json({ room: a.lodging.room, bed: a.lodging.bed });
}
