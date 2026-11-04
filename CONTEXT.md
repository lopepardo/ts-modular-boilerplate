# Library

Boilerplate example domain: a library that lends books to its members. It exists only to show a simple module (`catalog`) and one with a rich domain (`lending`); it is replaced at the start of each project.

## Language

**Book**:
A physical copy in the catalog. Two copies of the same work are two distinct Books with the same ISBN.
_Avoid_: Copy, Title, Item

**Retired**:
State of a Book that is out of circulation: it still exists in the catalog but cannot be lent. A Book is never deleted, only retired.
_Avoid_: Deleted, Removed, Archived

**Member**:
A person who borrows books, identified by an external id. The library does not register or validate members.
_Avoid_: User, Borrower, Customer

**Loan**:
The lending of a Book to a Member. It is `active` until the Book is returned, then it becomes `returned`, with no way back.
_Avoid_: Checkout, Rental, Borrowing

**DueDate**:
The return deadline of a Loan, set when the Loan is created (14 days from that moment).
_Avoid_: Deadline, Return date

**Overdue**:
Condition of an `active` Loan whose DueDate has already passed. It is derived from the date; it is not a stored state.
_Avoid_: Late, Expired

## Rules

- A Book can be lent only if it exists and is not Retired.
- A Book has at most one `active` Loan.
- A Member has at most 3 `active` Loans.
- A Member with any Overdue Loan cannot take new loans.
- Only an `active` Loan can be returned.
- A Loan of a Retired Book can be returned normally.
