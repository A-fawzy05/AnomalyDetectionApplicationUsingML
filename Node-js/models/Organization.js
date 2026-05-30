const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
  canViewDashboard: {
    type: Boolean,
    default: false
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
    unique: true,
    minlength: [2, 'Organization name must be at least 2 characters'],
    maxlength: [100, 'Organization name cannot exceed 100 characters']
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
  lastRunId: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Hash join password before saving
organizationSchema.pre('save', async function() {
  if (!this.isModified('joinPassword')) return;

  const salt = await bcrypt.genSalt(10);
  this.joinPassword = await bcrypt.hash(this.joinPassword, salt);
});

// Compare join password
organizationSchema.methods.compareJoinPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.joinPassword);
};

module.exports = mongoose.model('Organization', organizationSchema);
