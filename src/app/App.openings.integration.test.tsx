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

describe("App opening workflow + snapshot changelog", () => {
  beforeAll(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("records opening add/update/remove changes in snapshot B changelog", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByLabelText("Save Snapshot A"));

    await user.click(screen.getByLabelText("Add Opening"));
    expect(screen.getByText(/Openings \(1\/5\)/)).toBeTruthy();

    await user.selectOptions(screen.getByLabelText("Opening 1 Wall"), "left");
    await user.selectOptions(screen.getByLabelText("Opening 1 Type"), "hallway");

    const widthInput = screen.getByLabelText("Opening 1 Width");
    await user.clear(widthInput);
    await user.type(widthInput, "4");

    await user.click(screen.getByLabelText("Save Snapshot B"));

    expect(screen.getByText(/Openings added:/)).toBeTruthy();
    expect(screen.getByText(/hallway/)).toBeTruthy();
    expect(screen.getByText(/left wall/)).toBeTruthy();

    await user.click(screen.getByLabelText("Save Snapshot A"));
    await user.click(screen.getByLabelText("Remove Opening 1"));
    expect(screen.getByText(/Openings \(0\/5\)/)).toBeTruthy();

    await user.click(screen.getByLabelText("Save Snapshot B"));
    expect(screen.getByText(/Openings removed:/)).toBeTruthy();
  });
});
