import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type {
  MenuItemStatusRow,
  QuizSessionRow,
  QuizStatsRow,
  ShareBonusEventRow,
  StoreStatus,
  VisitLog,
  VisitLogPart,
  ViewerContext,
} from "@/lib/domain/types";
import {
  MOCK_ADMIN_EMAIL,
  MOCK_USER_ID,
  seededMenuItems,
  seededMenuItemStatuses,
  seededParts,
  seededQuizSessions,
  seededQuizStats,
  seededShareBonusEvents,
  seededStoreStatus,
  seededVisitLogParts,
  seededVisitLogs,
} from "@/lib/domain/seed";
import { isMockAdminEnabled } from "@/lib/env";

const STORE_PATH = path.join("/tmp", "maguromaru-note-mock-db.json");

export interface MockState {
  menuItemStatuses: MenuItemStatusRow[];
  quizSessions: QuizSessionRow[];
  visitLogs: VisitLog[];
  visitLogParts: VisitLogPart[];
  storeStatus: StoreStatus;
  quizStats: QuizStatsRow[];
  shareBonusEvents: ShareBonusEventRow[];
}

function createDefaultState(): MockState {
  return {
    menuItemStatuses: seededMenuItemStatuses.map((entry) => ({ ...entry })),
    quizSessions: seededQuizSessions.map((entry) => ({ ...entry })),
    visitLogs: seededVisitLogs.map((entry) => ({ ...entry })),
    visitLogParts: seededVisitLogParts.map((entry) => ({ ...entry })),
    storeStatus: { ...seededStoreStatus },
    quizStats: [{ ...seededQuizStats }],
    shareBonusEvents: seededShareBonusEvents.map((entry) => ({ ...entry })),
  };
}

function normalizeState(raw: Partial<MockState> | null | undefined): MockState {
  const defaults = createDefaultState();

  return {
    menuItemStatuses: raw?.menuItemStatuses ?? defaults.menuItemStatuses,
    quizSessions: raw?.quizSessions ?? defaults.quizSessions,
    visitLogs: raw?.visitLogs ?? defaults.visitLogs,
    visitLogParts: raw?.visitLogParts ?? defaults.visitLogParts,
    storeStatus: raw?.storeStatus ?? defaults.storeStatus,
    quizStats: raw?.quizStats ?? defaults.quizStats,
    shareBonusEvents: raw?.shareBonusEvents ?? defaults.shareBonusEvents,
  };
}

export async function readMockState() {
  try {
    const content = await fs.readFile(STORE_PATH, "utf8");
    return normalizeState(JSON.parse(content) as Partial<MockState>);
  } catch {
    const initialState = createDefaultState();
    await writeMockState(initialState);
    return initialState;
  }
}

export async function writeMockState(state: MockState) {
  await fs.writeFile(STORE_PATH, JSON.stringify(state, null, 2), "utf8");
}

export function createMockViewerContext(): ViewerContext {
  const isAdmin = isMockAdminEnabled();
  return {
    userId: MOCK_USER_ID,
    email: isAdmin ? MOCK_ADMIN_EMAIL : null,
    role: isAdmin ? "admin" : "user",
    isMock: true,
  };
}

export function createMockPhotoUrl() {
  return `mock://don-photos/${randomUUID()}.jpg`;
}

export const mockMasterData = {
  parts: seededParts,
  menuItems: seededMenuItems,
};
