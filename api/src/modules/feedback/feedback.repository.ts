import { and, count, desc, asc, eq } from "drizzle-orm";
import type { Database } from "../../db/database.js";
import type { FeedbackStatus } from "../../db/enums.js";
import { feedbacks, organizations, users } from "../../db/schema.js";

export interface FeedbackRecord {
  id: string;
  message: string;
  status: FeedbackStatus;
  createdAt: Date;
  userId: string;
  organizationId: string;
  user: { name: string; email: string };
  organization: { name: string };
}

export interface FeedbackListQuery {
  status?: FeedbackStatus;
  skip: number;
  take: number;
}

export interface FeedbackRepository {
  create(data: { organizationId: string; userId: string; message: string }): Promise<FeedbackRecord>;
  /** `userId` limits the list to the author's own feedback; without it everything is listed (platform admins). */
  list(filter: { userId?: string }, query: FeedbackListQuery): Promise<{ items: FeedbackRecord[]; total: number }>;
  updateStatus(id: string, status: FeedbackStatus): Promise<FeedbackRecord | null>;
}

const columns = {
  id: feedbacks.id,
  message: feedbacks.message,
  status: feedbacks.status,
  createdAt: feedbacks.createdAt,
  userId: feedbacks.userId,
  organizationId: feedbacks.organizationId,
  userName: users.name,
  userEmail: users.email,
  organizationName: organizations.name,
};

type Row = {
  id: string;
  message: string;
  status: FeedbackStatus;
  createdAt: Date;
  userId: string;
  organizationId: string;
  userName: string;
  userEmail: string;
  organizationName: string;
};

function toRecord(row: Row): FeedbackRecord {
  const { userName, userEmail, organizationName, ...own } = row;
  return { ...own, user: { name: userName, email: userEmail }, organization: { name: organizationName } };
}

/** The feedback with its author and organization (both always exist: the foreign keys require them). */
const selectFeedbacks = (db: Database) =>
  db
    .select(columns)
    .from(feedbacks)
    .innerJoin(users, eq(users.id, feedbacks.userId))
    .innerJoin(organizations, eq(organizations.id, feedbacks.organizationId));

/** Repository layer: the only place that talks to the database. */
export function createFeedbackRepository(db: Database): FeedbackRepository {
  async function findById(id: string): Promise<FeedbackRecord | null> {
    const [row] = await selectFeedbacks(db).where(eq(feedbacks.id, id)).limit(1);
    return row ? toRecord(row) : null;
  }

  return {
    async create(data) {
      const id = crypto.randomUUID();
      await db.insert(feedbacks).values({ id, ...data });
      return (await findById(id))!;
    },

    async list({ userId }, { status, skip, take }) {
      const where = and(userId ? eq(feedbacks.userId, userId) : undefined, status ? eq(feedbacks.status, status) : undefined);
      const [items, [totalRow]] = await Promise.all([
        selectFeedbacks(db).where(where).orderBy(desc(feedbacks.createdAt), asc(feedbacks.id)).limit(take).offset(skip),
        db.select({ value: count() }).from(feedbacks).where(where),
      ]);
      return { items: items.map(toRecord), total: totalRow?.value ?? 0 };
    },

    async updateStatus(id, status) {
      const updated = await db.update(feedbacks).set({ status }).where(eq(feedbacks.id, id)).returning({ id: feedbacks.id });
      if (updated.length === 0) return null;
      return findById(id);
    },
  };
}
