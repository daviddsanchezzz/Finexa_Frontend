let investmentsDataVersion = 0;
const listeners = new Set<(version: number) => void>();

export const getInvestmentsDataVersion = () => investmentsDataVersion;

export const markInvestmentsDirty = () => {
  investmentsDataVersion += 1;
  listeners.forEach((cb) => cb(investmentsDataVersion));
};

export const subscribeInvestmentsInvalidation = (cb: (version: number) => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
