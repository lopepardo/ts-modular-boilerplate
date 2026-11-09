import { NotFoundError } from "../../../../shared/errors.js";
import type { Loan } from "../../domain/loan.js";
import type { LendingDeps } from "../deps.js";

export type GetLoan = (id: string) => Promise<Loan>;

/** Finds a Loan by id. Whether it is Overdue is derived by the caller from the clock. */
export const getLoanUseCase =
  ({ repository }: Pick<LendingDeps, "repository">): GetLoan =>
  async (id) => {
    const loan = await repository.findById(id);
    if (!loan) {
      throw new NotFoundError("LOAN_NOT_FOUND", `Loan ${id} not found`);
    }
    return loan;
  };
