const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const subteamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subteam name is required'],
    trim: true,
    minlength: [2, 'Subteam name must be at least 2 characters'],
    maxlength: [80, 'Subteam name cannot exceed 80 characters']
  },
  fastApiRunId: { type: String, default: null },
  djangoEventLogId: { type: String, default: null }
}, { timestamps: true });

const memberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member'
  },
  joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    unique: true,
    minlength: [2, 'Team name must be at least 2 characters'],
    maxlength: [100, 'Team name cannot exceed 100 characters']
  },
  joinPassword: {
    type: String,
    required: [true, 'Join password is required'],
    select: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [memberSchema],
  subteams: [subteamSchema]
}, { timestamps: true });

teamSchema.pre('save', async function () {
  if (!this.isModified('joinPassword')) return;
  const salt = await bcrypt.genSalt(10);
  this.joinPassword = await bcrypt.hash(this.joinPassword, salt);
});

teamSchema.methods.compareJoinPassword = async function (candidate) {
  return bcrypt.compare(candidate, this.joinPassword);
};

module.exports = mongoose.model('Team', teamSchema);
