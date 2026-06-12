import mongoose, { Schema, Document } from "mongoose";

export interface IPyqTopic extends Document {
  _id: string;
  pyqId: string;
  topicId: string;
  createdAt: Date;
}

const pyqTopicSchema = new Schema<IPyqTopic>(
  {
    pyqId: {
      type: String,
      required: true,
      index: true,
    },
    topicId: {
      type: String,
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: "pyq_topics" }
);

pyqTopicSchema.index({ pyqId: 1, topicId: 1 }, { unique: true });

export const PyqTopic = mongoose.model<IPyqTopic>("PyqTopic", pyqTopicSchema);
