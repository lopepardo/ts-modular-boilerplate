import type { Loan } from "../../domain/loan.js";
import type { LendingDeps } from "../deps.js";
import type { LoanFilter } from "../ports/loanRepository.js";

export type ListLoans = (filter: LoanFilter) => Promise<Loan[]>;

/** Lists every Loan, narrowed by the optional Member and status. */
export const listLoansUseCase = ({ repository }: Pick<LendingDeps, "repository">): ListLoans => {
  return (filter) => repository.search(filter);
};
