let transactionsDataVersion = 0;
const listeners = new Set<(version: number) => void>();

export const getTransactionsDataVersion = () => transactionsDataVersion;

export const markTransactionsDirty = () => {
  transactionsDataVersion += 1;
  listeners.forEach((cb) => cb(transactionsDataVersion));
};

export const subscribeTransactionsInvalidation = (cb: (version: number) => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
