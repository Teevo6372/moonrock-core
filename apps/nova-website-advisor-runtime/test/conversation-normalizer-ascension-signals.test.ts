import { describe, expect, it } from "vitest";
import { extractTeamSizeMentioned, extractUrgencyStated } from "../src/conversation-normalizer.js";

describe("extractTeamSizeMentioned", () => {
  it("extracts a number when team/staff language is present", () => {
    expect(extractTeamSizeMentioned("We have a team of 12 people.")).toBe(12);
    expect(extractTeamSizeMentioned("Our staff is about 5 right now.")).toBe(5);
  });

  it("does not misread an unrelated number as a team size", () => {
    expect(extractTeamSizeMentioned("We get about 12 calls a day.")).toBeUndefined();
  });
});

describe("extractUrgencyStated", () => {
  it("detects urgency language", () => {
    expect(extractUrgencyStated("We need this ASAP.")).toBe(true);
    expect(extractUrgencyStated("This is pretty urgent for us.")).toBe(true);
  });

  it("does not flag ordinary text as urgent", () => {
    expect(extractUrgencyStated("We'll get to it eventually.")).toBe(false);
  });
});
