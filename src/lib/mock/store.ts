import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { MenuStatusRow, Profile, VisitLog, VisitLogPart } from "@/lib/domain/types";
import {
  MOCK_USER_ID,
  seededMenuItems,
  seededMenuStatus,
  seededParts,
  seededProfiles,
  seededTitles,
  seededVisitLogParts,
  seededVisitLogs,
} from "@/lib/domain/seed";
import { isMockStaffEnabled } from "@/lib/env";

const STORE_PATH = path.join("/tmp", "maguromaru-note-mock-db.json");

export interface MockState {
  profiles: Profile[];
  visitLogs: VisitLog[];
  visitLogParts: VisitLogPart[];
  menuStatus: MenuStatusRow[];
}

function createDefaultState(): MockState {
  return {
    profiles: seededProfiles,
    visitLogs: seededVisitLogs,
    visitLogParts: seededVisitLogParts,
    menuStatus: seededMenuStatus,
  };
}

export async function readMockState() {
  try {
    const content = await fs.readFile(STORE_PATH, "utf8");
    return JSON.parse(content) as MockState;
  } catch {
    const initialState = createDefaultState();
    await writeMockState(initialState);
    return initialState;
  }
}

export async function writeMockState(state: MockState) {
  await fs.writeFile(STORE_PATH, JSON.stringify(state, null, 2), "utf8");
}

export async function ensureMockProfile(userId: string) {
  const state = await readMockState();
  const existingProfile = state.profiles.find((profile) => profile.id === userId);

  if (existingProfile) {
    return existingProfile;
  }

  const profile: Profile = {
    id: userId,
    display_name: "匿名のまぐろ好き",
    avatar_url: null,
    created_at: new Date().toISOString(),
  };

  state.profiles.push(profile);
  await writeMockState(state);
  return profile;
}

export function createMockViewerContext() {
  return {
    userId: MOCK_USER_ID,
    role: isMockStaffEnabled() ? ("staff" as const) : ("user" as const),
    isMock: true,
  };
}

export function createMockPhotoUrl() {
  return `mock://don-photos/${randomUUID()}.jpg`;
}

export const mockMasterData = {
  parts: seededParts,
  titles: seededTitles,
  menuItems: seededMenuItems,
};
