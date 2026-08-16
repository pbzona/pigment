"use client";

import { useState } from "react";

interface ColorFilterProps {
  defaultColor: string | null;
  defaultTolerance: number;
}

const VALID_HEX = /^#[\da-f]{6}$/i;

export function ColorFilter({
  defaultColor,
  defaultTolerance,
}: ColorFilterProps) {
  const [enabled, setEnabled] = useState(defaultColor !== null);
  const [color, setColor] = useState(defaultColor ?? "#3157D5");
  const [tolerance, setTolerance] = useState(defaultTolerance);
  const pickerColor = VALID_HEX.test(color) ? color : "#3157D5";

  return (
    <fieldset className="color-filter">
      <legend>02 / Match color</legend>
      <p className="color-filter-description">Find palettes near a color already in your work.</p>
      <label className="check-label">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Use color matching
      </label>
      <div className="color-input-row" data-disabled={!enabled}>
        <input
          className="color-well"
          type="color"
          aria-label="Choose a search color"
          value={pickerColor}
          disabled={!enabled}
          onChange={(event) => setColor(event.target.value.toUpperCase())}
        />
        <input
          className="text-input color-text-input"
          type="text"
          name="color"
          aria-label="Search color as hex"
          value={color}
          disabled={!enabled}
          required={enabled}
          pattern="#[0-9a-fA-F]{6}"
          spellCheck={false}
          onChange={(event) => setColor(event.target.value)}
        />
      </div>
      <label className="tolerance-label" data-disabled={!enabled}>
        <span>
          Tolerance <output>{tolerance}</output>
        </span>
        <input
          type="range"
          name="tolerance"
          min="0"
          max="25"
          step="0.5"
          value={tolerance}
          disabled={!enabled}
          onChange={(event) => setTolerance(Number(event.target.value))}
        />
      </label>
    </fieldset>
  );
}
