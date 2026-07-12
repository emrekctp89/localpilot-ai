import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OTHER_INDUSTRY_VALUE,
  listAllSectorItems,
  matchIndustryToCatalog,
} from "../../lib/onboarding-sectors";

describe("onboarding sector matching", () => {
  it("lists catalog items", () => {
    const items = listAllSectorItems();
    assert.ok(items.length >= 20);
    assert.ok(items.includes("Kuaför & Güzellik Salonu"));
  });

  it("matches exact and keyword industry strings", () => {
    assert.equal(
      matchIndustryToCatalog("Kuaför & Güzellik Salonu").value,
      "Kuaför & Güzellik Salonu",
    );
    assert.equal(
      matchIndustryToCatalog("kuaför").value,
      "Kuaför & Güzellik Salonu",
    );
    assert.equal(
      matchIndustryToCatalog("berber dükkanı").value,
      "Kuaför & Güzellik Salonu",
    );
    assert.equal(matchIndustryToCatalog("berber dükkanı").source, "keyword");
    assert.equal(
      matchIndustryToCatalog("Restoran işletmesi").value,
      "Restoran & Lokanta",
    );
    assert.equal(
      matchIndustryToCatalog("uzay madenciliği").value,
      OTHER_INDUSTRY_VALUE,
    );
    assert.equal(matchIndustryToCatalog("").value, "");
  });
});
