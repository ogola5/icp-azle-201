import {
  query,
  update,
  text,
  Record,
  StableBTreeMap,
  Variant,
  Vec,
  None,
  Some,
  Ok,
  Err,
  ic,
  Principal,
  Opt,
  nat64,
  Duration,
  Result,
  bool,
  Canister
} from "azle";
import { Ledger, binaryAddressFromAddress, binaryAddressFromPrincipal, hexAddressFromPrincipal } from "azle/canisters/ledger";
import { v4 as uuidv4 } from "uuid";

const LoanStatus = Variant({
  Active: text,
  Completed: text,
  Defaulted: text
});

const Loan = Record({
  id: text,
  amount: nat64,
  interestRate: nat64,
  duration: nat64,
  borrower: Principal,
  lender: Opt(Principal),
  status: LoanStatus,
  creationDate: nat64,
  dueDate: nat64
});

const LoanRequest = Record({
  amount: nat64,
  interestRate: nat64,
  duration: nat64
});

const UserProfile = Record({
  principal: Principal,
  name: text,
  balance: nat64
});

const Message = Variant({
  NotFound: text,
  InvalidPayload: text,
  PaymentFailed: text,
  PaymentCompleted: text
});

type LoanStatusType = {
  Active?: string;
  Completed?: string;
  Defaulted?: string;
};

type Loan = {
  id: string;
  amount: bigint;
  interestRate: bigint;
  duration: bigint;
  borrower: Principal;
  lender: Opt<Principal>;
  status: LoanStatusType;
  creationDate: bigint;
  dueDate: bigint;
};

interface LoanSummaryType {
  id: string;
  originalAmount: bigint;
  currentAmount: bigint;
  interestRate: bigint;
  duration: bigint;
  borrower: Principal;
  lender?: Principal;
  status: string | undefined;
  creationDate: bigint;
  dueDate: bigint;
  accumulatedInterest: bigint;
}

const loansStorage = StableBTreeMap(0, text, Loan);
const loanRequestsStorage = StableBTreeMap(1, Principal, Vec(LoanRequest));
const userProfiles = StableBTreeMap(3, Principal, UserProfile);

export default Canister({
  registerUser: update([text], Result(text, Message), (name) => {
    const userProfile = {
      principal: ic.caller(),
      name: name,
      balance: 0n
    };

    userProfiles.insert(ic.caller(), userProfile);
    return Ok(`User ${name} registered successfully with principal ${ic.caller().toText()}`);
  }),

  saveFunds: update([nat64], Result(text, Message), async (amount) => {
    const userOpt = userProfiles.get(ic.caller());
    if ("None" in userOpt) {
      return Err({ NotFound: `User not found` });
    }

    const user = userOpt.Some;
    user.balance += amount;
    userProfiles.insert(user.principal, user);

    return Ok(`Amount ${amount} saved successfully.`);
  }),

  createLoanRequest: update([LoanRequest], Result(text, Message), (request) => {
    const loanRequestId = uuidv4();
    loanRequestsStorage.insert(ic.caller(), request);
    return Ok(loanRequestId);
  }),

  acceptLoanRequest: update([text], Result(Loan, Message), (loanRequestId) => {
    const requestOpt = loanRequestsStorage.get(loanRequestId);
    if ("None" in requestOpt) {
      return Err({ NotFound: `Loan request with id=${loanRequestId} not found` });
    }

    const request = requestOpt.Some;
    const loan: Loan = {
      id: uuidv4(),
      amount: request.amount,
      interestRate: request.interestRate,
      duration: request.duration,
      borrower: ic.caller(),
      lender: None, // Lender is not assigned yet
      status: { Active: "ACTIVE" },
      creationDate: ic.time(),
      dueDate: ic.time() + request.duration
    };

    loansStorage.insert(loan.id, loan);
    return Ok(loan);
  }),

  makeRepayment: update([text, nat64], Result(text, Message), (loanId, repaymentAmount) => {
    const loanOpt = loansStorage.get(loanId);
    if ("None" in loanOpt) {
      return Err({ NotFound: `Loan with id=${loanId} not found` });
    }

    const loan = loanOpt.Some;
    // Logic to handle repayment.

    if (loanIsFullyRepaid(loan)) {
      loan.status = { Completed: "COMPLETED" };
      loansStorage.insert(loan.id, loan);
    }

    return Ok(`Repayment of ${repaymentAmount} for loan id=${loanId} successful`);
  }),

  getLoanStatus: query([text], Result(LoanStatus, Message), (loanId) => {
    const loanOpt = loansStorage.get(loanId);
    if ("None" in loanOpt) {
      return Err({ NotFound: `Loan with id=${loanId} not found` });
    }
    return Ok(loanOpt.Some.status);
  }),

  checkForDefault: update([], Vec(text), () => {
    const defaultedLoans = loansStorage.values().filter(loan => loanIsDefaulted(loan));
    defaultedLoans.forEach(loan => {
      loan.status = { Defaulted: "DEFAULTED" };
      loansStorage.insert(loan.id, loan);
    });

    return defaultedLoans.map(loan => loan.id);
  }),

  modifyLoanTerms: update([text, LoanRequest], Result(Loan, Message), (loanId, newTerms) => {
    const loanOpt = loansStorage.get(loanId);
    if ("None" in loanOpt) {
      return Err({ NotFound: `Loan with id=${loanId} not found` });
    }

    let loan = loanOpt.Some;
    if (loan.status.Active !== "ACTIVE") {
      return Err({ InvalidPayload: "Loan modification is only allowed for active loans." });
    }

    loan.amount = newTerms.amount;
    loan.interestRate = newTerms.interestRate;
    loan.duration = newTerms.duration;
    loan.dueDate = calculateDueDate(newTerms.duration);

    loansStorage.insert(loan.id, loan);
    return Ok(loan);
  }),

  getUserLoanHistory: query([Principal], Vec(Loan), (userPrincipal) => {
    const userLoans = loansStorage.values().filter(loan =>
      loan.borrower.toText() === userPrincipal.toText() ||
      (loan.lender !== None && loan.lender.toText() === userPrincipal.toText())
    );
    return userLoans;
  }),

  accumulateInterest: update([], Vec(text), () => {
    const activeLoans = loansStorage.values().filter(loan => loan.status.Active === "ACTIVE");
    const updatedLoans: string[] = [];

    activeLoans.forEach(loan => {
      const accumulatedInterest = calculateAccumulatedInterest(loan);
      loan.amount += accumulatedInterest;
      loansStorage.insert(loan.id, loan);
      updatedLoans.push(loan.id);
    });

    return updatedLoans;
  }),

  automateLoanRepayment: update([], Vec(text), () => {
    const loansForRepayment = loansStorage.values().filter(loan => shouldAutomateRepayment(loan));
    const repaymentLoanIds: string[] = [];

    loansForRepayment.forEach(loan => {
      const repaymentAmount = calculateRepaymentAmount(loan);
      loan.amount -= repaymentAmount;
      loansStorage.insert(loan.id, loan);
      repaymentLoanIds.push(loan.id);
    });

    return repaymentLoanIds;
  }),

  requestLoanExtension: update([text, nat64], Result(Loan, Message), (loanId, newDuration) => {
    const loanOpt = loansStorage.get(loanId);
    if ("None" in loanOpt) {
      return Err({ NotFound: `Loan with id=${loanId} not found` });
    }
    let loan = loanOpt.Some;
    if (loan.status.Active !== "ACTIVE") {
      return Err({ InvalidPayload: "Loan extension is only allowed for active loans." });
    }
    if (newDuration <= loan.duration) {
      return Err({ InvalidPayload: "New duration must be longer than the current duration." });
    }
    loan.duration = newDuration;
    loan.dueDate = calculateDueDate(newDuration);
    loansStorage.insert(loan.id, loan);
    return Ok(loan);
  }),
});

function calculateAccumulatedInterest(loan: Loan): bigint {
  const interest = loan.amount * loan.interestRate / 100n * (ic.time() - loan.creationDate) / (365n * 24n * 60n * 60n);
  return interest;
}

function shouldAutomateRepayment(loan: Loan): boolean {
  return ic.time() >= loan.dueDate;
}

function calculateRepaymentAmount(loan: Loan): bigint {
  const accumulatedInterest = calculateAccumulatedInterest(loan);
  const partOfPrincipal = loan.amount / loan.duration;
  return accumulatedInterest + partOfPrincipal;
}

function calculateDueDate(duration: nat64): nat64 {
  return ic.time() + duration;
}

function loanIsFullyRepaid(loan: Loan): bool {
  return false;
}

function loanIsDefaulted(loan: Loan): bool {
  return false;
}

function hash(input: any): nat64 {
  return BigInt(Math.abs(hashCode().value(input)));
}

globalThis.crypto = {
  getRandomValues: () => {
    let array = new Uint8Array(32);

    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }

    return array;
  }
};
