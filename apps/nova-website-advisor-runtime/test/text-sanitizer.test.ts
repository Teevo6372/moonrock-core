import { describe, expect, it } from "vitest";

import { stripMarkdownArtifacts } from "../src/text-sanitizer.js";

describe("stripMarkdownArtifacts", () => {
  it("removes bold markers while keeping the text", () => {
    expect(stripMarkdownArtifacts("Here's **What's included** for your plan.")).toBe("Here's What's included for your plan.");
  });

  it("removes italic markers while keeping the text", () => {
    expect(stripMarkdownArtifacts("This is *really* important.")).toBe("This is really important.");
  });

  it("removes standalone horizontal-rule lines made of dashes, asterisks, or underscores", () => {
    expect(stripMarkdownArtifacts("First part.\n---\nSecond part.")).toBe("First part.\n\nSecond part.");
    expect(stripMarkdownArtifacts("First part.\n***\nSecond part.")).toBe("First part.\n\nSecond part.");
    expect(stripMarkdownArtifacts("First part.\n___\nSecond part.")).toBe("First part.\n\nSecond part.");
  });

  it("strips markdown headers but keeps the heading text", () => {
    expect(stripMarkdownArtifacts("## What's included\nSome detail.")).toBe("What's included\nSome detail.");
  });

  it("converts markdown bullet lines to a plain readable bullet", () => {
    expect(stripMarkdownArtifacts("- First item\n- Second item")).toBe("• First item\n• Second item");
  });

  it("strips numbered-list markers", () => {
    expect(stripMarkdownArtifacts("1. First step\n2. Second step")).toBe("First step\nSecond step");
  });

  it("collapses excessive blank lines", () => {
    expect(stripMarkdownArtifacts("Line one.\n\n\n\nLine two.")).toBe("Line one.\n\nLine two.");
  });

  it("leaves already-clean plain text untouched", () => {
    const clean = "Sounds like the off-season lull is the main bottleneck. I can sketch a quick plan for you.";
    expect(stripMarkdownArtifacts(clean)).toBe(clean);
  });

  it("handles a realistic mixed example matching the reported bug", () => {
    const messy = [
      "Sounds like the off-season lull is the main bottleneck. I can sketch a quick Flight Plan that covers:",
      "",
      "**What's included**",
      "- Targeted local-search ads (Google & Bing) that surface your services when homeowners start planning spring work.",
      "- A seasonal email-drip campaign to stay top of mind.",
      "",
      "***",
      "",
      "Let me know if you want the details.",
    ].join("\n");
    const cleaned = stripMarkdownArtifacts(messy);
    expect(cleaned).not.toContain("**");
    expect(cleaned).not.toContain("***");
    expect(cleaned).toContain("What's included");
    expect(cleaned).toContain("• Targeted local-search ads");
    expect(cleaned).toContain("• A seasonal email-drip campaign");
  });
});
