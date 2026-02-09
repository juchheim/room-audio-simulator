import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

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

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
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

  it("applies catalog model defaults including mode and orientation", async () => {
    const user = userEvent.setup();
    render(<App />);

    const modelSelect = screen.getByLabelText("Subwoofer Model") as HTMLSelectElement;
    const modeSelect = screen.getByLabelText("Subwoofer Mode") as HTMLSelectElement;
    const driverSelect = screen.getByLabelText(
      "Driver Direction",
    ) as HTMLSelectElement;

    await user.selectOptions(modelSelect, "vera-fi-vanguard-caldera-10");

    expect(modeSelect.value).toBe("ported");
    expect(driverSelect.value).toBe("front");
    expect((screen.getByLabelText("Port Direction") as HTMLSelectElement).value).toBe(
      "rear",
    );
    expect((screen.getByLabelText("Subwoofer Preset") as HTMLSelectElement).value).toBe(
      "Balanced",
    );
    expect(
      (screen.getByLabelText("Subwoofer Frequency (Hz)") as HTMLInputElement).value,
    ).toBe("52");
    expect(screen.getAllByText(/Medium Confidence/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Response shape:/i)).toBeTruthy();
    expect(screen.getAllByText(/30-90 Hz/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/±1.5 dB/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Model Confidence Bounds/i)).toBeTruthy();
  });

  it("applies Speedwoofer defaults and renders high-confidence bounds", async () => {
    const user = userEvent.setup();
    render(<App />);

    const modelSelect = screen.getByLabelText("Subwoofer Model") as HTMLSelectElement;
    const modeSelect = screen.getByLabelText("Subwoofer Mode") as HTMLSelectElement;
    const driverSelect = screen.getByLabelText(
      "Driver Direction",
    ) as HTMLSelectElement;

    await user.selectOptions(modelSelect, "rsl-speedwoofer-10s-mkii");

    expect(modeSelect.value).toBe("ported");
    expect(driverSelect.value).toBe("front");
    expect((screen.getByLabelText("Port Direction") as HTMLSelectElement).value).toBe(
      "rear",
    );
    expect((screen.getByLabelText("Subwoofer Preset") as HTMLSelectElement).value).toBe(
      "Deep & Smooth",
    );
    expect(
      (screen.getByLabelText("Subwoofer Frequency (Hz)") as HTMLInputElement).value,
    ).toBe("24");
    expect(screen.getAllByText(/High Confidence/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Audioholics GP extension-mode trace/i).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText(/25-100 Hz/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/±1.5 dB/i).length).toBeGreaterThan(0);
  });

  it("shows a user-visible error banner when snapshot restore fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<App />);

    await user.click(screen.getByLabelText("Save Snapshot A"));
    vi
      .spyOn(JSON, "parse")
      .mockImplementationOnce(() => {
        throw new Error("Corrupt snapshot data");
      });

    await user.click(screen.getByLabelText("Load Snapshot A"));

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Could not load snapshot A.");

    await user.click(screen.getByLabelText("Dismiss error"));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
