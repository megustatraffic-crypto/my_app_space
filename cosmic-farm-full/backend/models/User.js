// models/User.js
import mongoose from 'mongoose';

const PlotSchema = new mongoose.Schema({
  status: { type: String, enum: ['empty','growing','grown'], default: 'empty' },
  plantedAt: { type: Number, default: 0 }
});

const UserSchema = new mongoose.Schema({
  telegramId: { type: String, index: true, unique: true, sparse: true },
  name: String,
  frags: { type: Number, default: 10 },
  energy: { type: Number, default: 5 },
  level: { type: Number, default: 1 },
  farmSize: { type: Number, default: 3 }, // 3x3 initial
  plots: { type: [PlotSchema], default: [] },
  inventory: { type: Map, of: Number, default: {} },
  lastDaily: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

UserSchema.methods.ensurePlots = function(){
  const needed = this.farmSize * this.farmSize;
  if(this.plots.length < needed){
    while(this.plots.length < needed) this.plots.push({ status: 'empty' });
  } else if(this.plots.length > needed){
    this.plots = this.plots.slice(0, needed);
  }
};

export default mongoose.models.User || mongoose.model('User', UserSchema);
