import { fireEvent, render, screen } from "@testing-library/react";
import { FencesGame } from "@/components/FencesGame";

describe("FencesGame UI", () => {
  it("renders controls and enforces row ownership for human moves", () => {
    render(<FencesGame />);

    expect(screen.getByRole("combobox", { name: /board size/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /difficulty/i })).toBeInTheDocument();

    const blueRowCell = screen.getByLabelText("cell-0-0");
    const redRowCell = screen.getByLabelText("cell-1-0");

    expect(blueRowCell).toBeDisabled();
    expect(redRowCell).not.toBeDisabled();

    fireEvent.click(redRowCell);
    expect(redRowCell).toBeDisabled();
  });
});
