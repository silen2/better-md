import { describe, expect, it } from "vitest";
import { translate } from "./i18n";

describe("translate", () => {
  it("uses the Chinese key as the default locale value", () => {
    expect(translate("zh-CN", "打开文件夹")).toBe("打开文件夹");
  });

  it("translates and interpolates English messages", () => {
    expect(translate("en-US", "打开文件夹")).toBe("Open Folder");
    expect(translate("en-US", "已删除 {count} 行", { count: 3 })).toBe("Deleted 3 rows");
  });
});
