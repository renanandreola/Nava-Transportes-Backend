const { Schema, model } = require("mongoose");

const UserSchema = new Schema({
  name: String,
  email: { type: String, unique: true, index: true, required: true },
  password: { type: String, select: false },
  passwordHash: { type: String, select: false },
  legacyAdminMigratedAt: { type: Date, select: false, default: null },
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