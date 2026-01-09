import mongoose, { Schema, models, model } from "mongoose";

const ProductSchema = new Schema(
  {
    name: { type: String, required: true }, // "Remera Campa", "Gorra Campa"
    type: { type: String, required: true }, // "tee" | "cap"
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Product = models.Product || model("Product", ProductSchema);
