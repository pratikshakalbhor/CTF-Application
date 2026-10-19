import { useCallback, useState } from "react";
import { describeError } from "../lib/errors";

/**
 * Small helper around a single write transaction: pending label, error and
 * success message. `run` awaits the receipt.
 */
export function useAction() {
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const run = useCallback(async (label, buildTx) => {
    setPending(label);
    setError(null);
    setSuccess(null);
    try {
      const tx = await buildTx();
      await tx.wait();
      setSuccess(`${label} confirmed`);
      return true;
    } catch (e) {
      setError(describeError(e));
      return false;
    } finally {
      setPending(null);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  return { pending, error, success, run, reset };
}
