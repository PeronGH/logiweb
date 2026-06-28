import { expect, test } from "bun:test";
import { parseDpiList } from "./adjustable-dpi";

// Test vectors ported from OpenLogi's `parse_dpi_list_payload` unit tests.

test("parses an explicit DPI list", () => {
  expect(
    parseDpiList(Uint8Array.of(0x01, 0x90, 0x03, 0x20, 0x06, 0x40, 0x00, 0x00)),
  ).toEqual([400, 800, 1600]);
});

test("expands a range-encoded DPI list", () => {
  expect(
    parseDpiList(Uint8Array.of(0x01, 0x90, 0xe1, 0x90, 0x06, 0x40, 0x00, 0x00)),
  ).toEqual([400, 800, 1200, 1600]);
});

test("sorts and deduplicates values", () => {
  expect(
    parseDpiList(Uint8Array.of(0x06, 0x40, 0x03, 0x20, 0x03, 0x20, 0x00, 0x00)),
  ).toEqual([800, 1600]);
});

test("stops a range at the last on-grid value (drops an off-grid endpoint)", () => {
  // min 400, step 400, max 1500 — 1500 is off the 400 grid, so the range yields
  // only the on-grid values (Solaar/libratbag accept on-grid DPI only).
  expect(
    parseDpiList(Uint8Array.of(0x01, 0x90, 0xe1, 0x90, 0x05, 0xdc, 0x00, 0x00)),
  ).toEqual([400, 800, 1200]);
});

test("parses a full list with no terminator", () => {
  expect(
    parseDpiList(Uint8Array.of(0x01, 0x90, 0x03, 0x20, 0x06, 0x40)),
  ).toEqual([400, 800, 1600]);
});

test("rejects a range marker without a preceding value", () => {
  expect(() =>
    parseDpiList(Uint8Array.of(0xe0, 0x32, 0x1f, 0x40, 0x00, 0x00)),
  ).toThrow();
});

test("rejects a range marker without an end value", () => {
  expect(() => parseDpiList(Uint8Array.of(0x01, 0x90, 0xe0, 0x32))).toThrow();
});

test("rejects a zero-step range marker", () => {
  expect(() =>
    parseDpiList(Uint8Array.of(0x01, 0x90, 0xe0, 0x00, 0x06, 0x40, 0x00, 0x00)),
  ).toThrow();
});

test("rejects a descending range marker", () => {
  expect(() =>
    parseDpiList(Uint8Array.of(0x06, 0x40, 0xe0, 0x32, 0x01, 0x90, 0x00, 0x00)),
  ).toThrow();
});

test("rejects a payload with no values", () => {
  expect(() => parseDpiList(Uint8Array.of(0x00, 0x00))).toThrow();
});
