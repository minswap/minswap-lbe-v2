import { sqrt } from "./sqrt";

export function calculateInitialLiquidity(
  amountA: bigint,
  amountB: bigint,
): bigint {
  let x = sqrt(amountA * amountB);
  if (x * x < amountA * amountB) {
    x += 1n;
  }
  return x;
}
