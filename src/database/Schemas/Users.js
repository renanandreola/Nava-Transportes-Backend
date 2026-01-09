const { Schema, model } = require("mongoose");

const UserSchema = new Schema({
  name: String,
  email: { type: String, unique: true, index: true, required: true },
  password: String,
  passwordHash: String,
  role: { type: String, default: "driver", enum: ["driver", "admin"] },
  active: { type: Boolean, default: true },
    commission: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
}, { timestamps: true });

module.exports = model("User", UserSchema, "User"); 
