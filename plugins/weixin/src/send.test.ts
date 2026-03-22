import { describe, test, expect } from "bun:test";
import { markdownToPlainText } from "./send.js";

describe("markdownToPlainText", () => {
  test("removes bold markers", () => {
    expect(markdownToPlainText("**bold**")).toBe("bold");
  });

  test("removes italic markers", () => {
    expect(markdownToPlainText("*italic*")).toBe("italic");
  });

  test("removes inline code backticks", () => {
    expect(markdownToPlainText("`code`")).toBe("code");
  });

  test("removes code block fences", () => {
    const md = "```js\nconsole.log('hi');\n```";
    expect(markdownToPlainText(md)).toBe("console.log('hi');");
  });

  test("converts links to text with URL", () => {
    expect(markdownToPlainText("[click](https://example.com)")).toBe(
      "click (https://example.com)",
    );
  });

  test("removes heading markers", () => {
    expect(markdownToPlainText("## Title")).toBe("Title");
  });

  test("removes blockquote markers", () => {
    expect(markdownToPlainText("> quote")).toBe("quote");
  });

  test("removes strikethrough markers", () => {
    expect(markdownToPlainText("~~deleted~~")).toBe("deleted");
  });

  test("handles mixed markdown", () => {
    const md = "# Hello\n\n**bold** and *italic* with `code`";
    const result = markdownToPlainText(md);
    expect(result).toBe("Hello\n\nbold and italic with code");
  });
});
