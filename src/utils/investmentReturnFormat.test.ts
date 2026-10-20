import { describe, it, expect } from "vitest";
import { amountTone, formatReturnPct, formatSignedMoney, formatWeightPct, parseReturnMode, returnTone } from "./investmentReturnFormat";

describe("formatReturnPct", () => {
  it("signo explícito y coma decimal", () => {
    expect(formatReturnPct(0.1046)).toBe("+10,46 %");
    expect(formatReturnPct(-0.0738)).toBe("−7,38 %");
    expect(formatReturnPct(0.0132314)).toBe("+1,32 %");
  });
  it("cero y sin dato", () => {
    expect(formatReturnPct(0)).toBe("0,00 %");
    expect(formatReturnPct(0.00004)).toBe("0,00 %"); // redondea a 0, sin signo
    expect(formatReturnPct(-0.00004)).toBe("0,00 %");
    expect(formatReturnPct(null)).toBe("—");
    expect(formatReturnPct(undefined)).toBe("—");
    expect(formatReturnPct(NaN)).toBe("—");
  });
  it("porcentajes grandes sin separador de miles", () => {
    expect(formatReturnPct(12.3456)).toBe("+1234,56 %");
  });
});

describe("returnTone", () => {
  it("verde, rojo o neutro", () => {
    expect(returnTone(0.05)).toBe("up");
    expect(returnTone(-0.05)).toBe("down");
    expect(returnTone(0)).toBe("flat");
    expect(returnTone(0.00004)).toBe("flat");
    expect(returnTone(null)).toBe("flat");
  });
});

describe("formatWeightPct", () => {
  it("una decimal", () => {
    expect(formatWeightPct(0.599)).toBe("59,9 %");
    expect(formatWeightPct(0.045)).toBe("4,5 %");
    expect(formatWeightPct(null)).toBe("—");
  });
});

describe("formatSignedMoney", () => {
  it("signo explícito, coma decimal y miles con punto", () => {
    expect(formatSignedMoney(72.2237)).toBe("+72,22 €");
    expect(formatSignedMoney(-60.7)).toBe("−60,70 €");
    expect(formatSignedMoney(1234.5)).toBe("+1.234,50 €");
  });
  it("cero (también tras redondear) y sin dato", () => {
    expect(formatSignedMoney(0)).toBe("0,00 €");
    expect(formatSignedMoney(0.004)).toBe("0,00 €");
    expect(formatSignedMoney(-0.004)).toBe("0,00 €");
    expect(formatSignedMoney(null)).toBe("—");
    expect(formatSignedMoney(NaN)).toBe("—");
  });
  it("respeta la moneda del activo", () => {
    expect(formatSignedMoney(10, "USD")).toContain("+10,00");
    expect(formatSignedMoney(10, "USD")).not.toContain("€");
  });
});

describe("amountTone y parseReturnMode", () => {
  it("color por importe", () => {
    expect(amountTone(0.01)).toBe("up");
    expect(amountTone(-0.01)).toBe("down");
    expect(amountTone(0.004)).toBe("flat");
    expect(amountTone(null)).toBe("flat");
  });
  it("modo guardado: solo 'eur' activa euros; cualquier otra cosa es %", () => {
    expect(parseReturnMode("eur")).toBe("eur");
    expect(parseReturnMode("pct")).toBe("pct");
    expect(parseReturnMode(null)).toBe("pct");
    expect(parseReturnMode("raro")).toBe("pct");
  });
});
