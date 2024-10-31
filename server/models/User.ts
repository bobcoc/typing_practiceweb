import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  isAdmin: { type: Boolean, default: false }
});

UserSchema.pre('save', async function (next) {
  if (this.isNew) {
    const userCount = await mongoose.model('User').countDocuments();
    if (userCount === 0) {
      this.isAdmin = true;
    }
  }
  next();
});

const User = mongoose.model('User', UserSchema);

export default User; 