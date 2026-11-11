import { NotFoundError } from "../../../../shared/errors.js";
import { giveBack, type Loan } from "../../domain/loan.js";
import type { LendingDeps } from "../deps.js";

export type ReturnLoan = (id: string) => Promise<Loan>;

/** A Member returns an active Loan. Works even if the Book was Retired since. */
export const returnLoanUseCase = ({ repository }: Pick<LendingDeps, "repository">): ReturnLoan => {
  return async (id) => {
    const loan = await repository.findById(id);
    if (!loan) {
      throw new NotFoundError("LOAN_NOT_FOUND", `Loan ${id} not found`);
    }
    return repository.markReturned(giveBack(loan));
  };
};
