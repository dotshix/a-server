// import mongoose from 'mongoose';

// const userSchema = new mongoose.Schema({
//   clerkUserId: { type: String, required: true, unique: true },
//   firstName: { type: String },
//   lastName: { type: String },
// });

// const User = mongoose.model('User', userSchema);

// export default User;

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  clerkUserId: { type: String, required: true, unique: true },
  username: { type: String, default: null }, // Adding username to the schema
  gamesPlayed: { type: Number, required: true, default: 0 }, // Added a counter field with a default value of 0
  attemptsCorrect: { type: Number, required: true, default: 0 }, // Added a counter field with a default value of 0
  attemptsWrong: { type: Number, required: true, default: 0 }, // Added a counter field with a default value of 0

});
userSchema.index({ username: 1 }, { unique: true, sparse: true });
const User = mongoose.model('User', userSchema);

export default User;
