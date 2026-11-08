/**
 * dhammapada.ts - Tương thích ngược với hệ thống quẻ Pháp Cú
 */

import { ALL_ORACLE_STICKS, getOracleStickByCategory } from "./oracleSystem";

export interface DhammapadaStick {
  id: number;
  title: string;
  pali: string;
  verse: string;
  meaning: string;
  advice: string;
}

export const DHAMMAPADA_STICKS: DhammapadaStick[] = ALL_ORACLE_STICKS.filter(
  (s) => s.category === "dhammapada"
).map((s) => ({
  id: s.id,
  title: s.title,
  pali: s.pali || "",
  verse: s.poem,
  meaning: s.interpretation,
  advice: s.advice,
}));

export function getRandomDhammapadaStick(): DhammapadaStick {
  const stick = getOracleStickByCategory("dhammapada");
  return {
    id: stick.id,
    title: stick.title,
    pali: stick.pali || "",
    verse: stick.poem,
    meaning: stick.interpretation,
    advice: stick.advice,
  };
}
