import assert from "node:assert/strict";
import test from "node:test";

import {
  historyPagingQueryAppSnapshot,
  historyPagingQueryHistoryLogs,
  parseHistoryVisitPagingParams,
} from "@/lib/api/history-visit-paging";

test("parseHistoryVisitPagingParams: app-snapshot keys と既定値", () => {
  const params = new URLSearchParams();
  const r = parseHistoryVisitPagingParams(params, historyPagingQueryAppSnapshot);
  assert.ok(!("error" in r));
  assert.equal(r.historyVisitPage, 1);
  assert.equal(r.historyVisitPageSize, 30);
});

test("parseHistoryVisitPagingParams: 文字列数値は拒否", () => {
  const params = new URLSearchParams();
  params.set("page", "3abc");
  const r = parseHistoryVisitPagingParams(params, historyPagingQueryHistoryLogs);
  assert.ok("error" in r);
});

test("parseHistoryVisitPagingParams: page_size 上限超えは拒否", () => {
  const params = new URLSearchParams();
  params.set("page_size", "101");
  const r = parseHistoryVisitPagingParams(params, historyPagingQueryHistoryLogs);
  assert.ok("error" in r);
});
