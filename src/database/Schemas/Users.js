const { Schema, model } = require("mongoose");

const UserSchema = new Schema({
  name: String,
  email: { type: String, unique: true, index: true, required: true },
  password: String,
  passwordHash: String,
  role: { type: String, default: "driver", enum: ["driver", "admin"] },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = model("User", UserSchema, "User"); 
