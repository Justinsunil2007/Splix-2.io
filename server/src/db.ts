import mongoose from 'mongoose';
import { MatchHistoryRecord, TournamentStanding } from '../../shared/types.js';

const matchHistorySchema = new mongoose.Schema({
  matchId: { type: String, required: true },
  timestamp: { type: Number, required: true },
  winnerTeamId: { type: String, default: null },
  winnerTeamName: { type: String, required: true },
  durationSeconds: { type: Number, required: true },
  rankings: { type: Array, default: [] },
}, { timestamps: true });

export const MatchHistoryModel = mongoose.model('MatchHistory', matchHistorySchema);

export async function connectMongoDB(): Promise<boolean> {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://jawaan25fcrit_db_user:aL7UF1oXOhaENPjV@cluster0.q9a0slc.mongodb.net/splix?appName=Cluster0';

  try {
    console.log('🍃 Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log('✅ Successfully connected to MongoDB Atlas!');
    return true;
  } catch (err: any) {
    console.warn('⚠️  MongoDB Atlas Connection Warning:', err.message || err);
    console.warn('⚠️  Continuing with in-memory state.');
    return false;
  }
}

export async function saveMatchRecordToDB(record: MatchHistoryRecord) {
  try {
    if (mongoose.connection.readyState === 1) {
      await MatchHistoryModel.create(record);
      console.log(`💾 Saved match record ${record.matchId} to MongoDB Atlas`);
    }
  } catch (err: any) {
    console.error('Failed to save match record to MongoDB:', err.message || err);
  }
}

export async function loadMatchHistoryFromDB(): Promise<MatchHistoryRecord[]> {
  try {
    if (mongoose.connection.readyState === 1) {
      const records = await MatchHistoryModel.find().sort({ timestamp: -1 }).limit(20).lean();
      return records.map((r: any) => ({
        matchId: r.matchId,
        timestamp: r.timestamp,
        winnerTeamId: r.winnerTeamId,
        winnerTeamName: r.winnerTeamName,
        durationSeconds: r.durationSeconds,
        rankings: r.rankings,
      }));
    }
  } catch (err: any) {
    console.error('Failed to load match history from MongoDB:', err.message || err);
  }
  return [];
}
