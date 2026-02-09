import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { App } from "./App";

class ResizeObserverMock {
  observe(): void {}

  unobserve(): void {}

  disconnect(): void {}
}

describe("App subwoofer mode switching", () => {
  beforeAll(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes dependent subwoofer fields across sealed/ported UI mode changes", async () => {
    const user = userEvent.setup();
    render(<App />);

    const modeSelect = screen.getByLabelText("Subwoofer Mode") as HTMLSelectElement;
    const presetSelect = screen.getByLabelText(
      "Subwoofer Preset",
    ) as HTMLSelectElement;
    const frequencyInput = screen.getByLabelText(
      "Subwoofer Frequency (Hz)",
    ) as HTMLInputElement;

    expect(modeSelect.value).toBe("sealed");
    expect(presetSelect.value).toBe("Balanced");
    expect(frequencyInput.value).toBe("30");
    expect(screen.queryByLabelText("Port Direction")).toBeNull();

    await user.selectOptions(modeSelect, "ported");

    expect(modeSelect.value).toBe("ported");
    expect((screen.getByLabelText("Port Direction") as HTMLSelectElement).value).toBe(
      "rear",
    );
    expect(frequencyInput.value).toBe("30");

    await user.selectOptions(presetSelect, "Big & Bold");
    expect(presetSelect.value).toBe("Big & Bold");

    await user.selectOptions(modeSelect, "sealed");

    expect(modeSelect.value).toBe("sealed");
    expect(screen.queryByLabelText("Port Direction")).toBeNull();
    expect((screen.getByLabelText("Subwoofer Preset") as HTMLSelectElement).value).toBe(
      "Balanced",
    );
    expect(
      (screen.getByLabelText("Subwoofer Frequency (Hz)") as HTMLInputElement).value,
    ).toBe("30");
  });
});
