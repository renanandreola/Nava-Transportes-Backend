const { Schema, model } = require("mongoose");

const UserSchema = new Schema(
  {
    name: { type: String },
    email: { type: String, unique: true, index: true, required: true },
    // pode ser password (texto) ou passwordHash (bcrypt). Mantém ambos pra cobrir migração
    password: { type: String },
    passwordHash: { type: String },
    role: { type: String, default: "admin" },
  },
  { timestamps: true }
);

module.exports = model("User", UserSchema, "User"); 
