import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI");

const ProductSchema = new mongoose.Schema({
  name: String, type: String, isActive: Boolean
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);

async function main() {
  await mongoose.connect(uri);

  // upsert para no duplicar
  await Product.updateOne(
    { type: "tee" },
    { $set: { name: "Remera Campa", type: "tee", isActive: true } },
    { upsert: true }
  );

  await Product.updateOne(
    { type: "cap" },
    { $set: { name: "Gorra Campa", type: "cap", isActive: true } },
    { upsert: true }
  );

  console.log("Base products OK");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
