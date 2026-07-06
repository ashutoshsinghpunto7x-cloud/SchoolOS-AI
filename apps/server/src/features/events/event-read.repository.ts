import { EventRead, IEventRead } from './event-read.model';

export interface MarkReadData {
  schoolId: string;
  eventId: string;
  userId: string;
  userDisplayName: string;
  userRole: string;
}

export const eventReadRepository = {
  async markRead(data: MarkReadData): Promise<IEventRead> {
    const readAt = new Date();
    return EventRead.findOneAndUpdate(
      { schoolId: data.schoolId, eventId: data.eventId, userId: data.userId },
      {
        $set: {
          userDisplayName: data.userDisplayName,
          userRole:        data.userRole,
          readAt,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  },

  async findByEvent(schoolId: string, eventId: string): Promise<IEventRead[]> {
    return EventRead.find({ schoolId, eventId }).lean<IEventRead[]>();
  },
};
