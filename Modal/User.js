// src/models/user.model.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },
    phone: { type: String, trim: true },
    avatarUrl: { type: String, trim: true,default:'https://uxwing.com/wp-content/themes/uxwing/download/peoples-avatars/default-avatar-profile-picture-male-icon.png' },

    role: {
      type: String,
      enum: [ 'manager', 'employee'],
    //   default: 'member',
    //   index: true,
    default:'employee'
    },

    password: { type: String, required: true, minlength: 8, select: false },

    // account state
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },

    // security meta
    passwordChangedAt: { type: Date },
    lastLoginAt: { type: Date },

    // optional MFA flags/placeholders
    // mfaEnabled: { type: Boolean, default: false },
    // mfaSecret: { type: String, select: false }, // store encrypted if you enable MFA
  },
  { timestamps: true }
);

// indexes
// userSchema.index({ email: 1 }, { unique: true });

// hash password if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = new Date();
  next();
});

// instance methods
userSchema.methods.comparePassword = async function (candidate) {
  // 'password' is select:false; ensure you selected it when calling this method
  return bcrypt.compare(candidate, this.password);
};

// userSchema.methods.changedPasswordAfter = function (jwtIatSeconds) {
//   if (!this.passwordChangedAt) return false;
//   const changedAtSeconds = Math.floor(this.passwordChangedAt.getTime() / 1000);
//   return changedAtSeconds > jwtIatSeconds; // true means token invalid
// };

// hide sensitive fields in JSON
// userSchema.methods.toJSON = function () {
//   const obj = this.toObject({ versionKey: false });
//   delete obj.password;
//   delete obj.mfaSecret;
//   return obj;
// };

export const User = mongoose.model('User', userSchema);
