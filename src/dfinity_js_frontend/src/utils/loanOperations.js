// import { Principal } from "@dfinity/principal";
// import { transferICP } from "./ledger";

// export async function createProduct(product) {
//   return window.canister.marketplace.addProduct(product);
// }

// export async function getProducts() {
//   try {
//     return await window.canister.marketplace.getProducts();
//   } catch (err) {
//     if (err.name === "AgentHTTPResponseError") {
//       const authClient = window.auth.client;
//       await authClient.logout();
//     }
//     return [];
//   }
// }

// export async function buyProduct(product) {
//   const marketplaceCanister = window.canister.marketplace;
//   const orderResponse = await marketplaceCanister.createOrder(product.id);
//   const sellerPrincipal = Principal.from(orderResponse.Ok.seller);
//   const sellerAddress = await marketplaceCanister.getAddressFromPrincipal(sellerPrincipal);
//   const block = await transferICP(sellerAddress, orderResponse.Ok.price, orderResponse.Ok.memo);
//   await marketplaceCanister.completePurchase(sellerPrincipal, product.id, orderResponse.Ok.price, block, orderResponse.Ok.memo);
// }
// loanOperations.js

import { Principal } from "@dfinity/principal";
import { idlFactory as loanIdlFactory } from "../../../declarations/loan"; // Adjust the path to your loan IDL factory location

// Assuming the window.loanCanister is already set up similarly to window.canister.marketplace
// in your application's initialization phase with Actor and loan canisterId

export const loanCanister = window.loanCanister;

export async function createLoanRequest(loanRequest) {
    // Submits a new loan request to the canister
    return loanCanister.createLoanRequest(loanRequest);
}

export async function getLoanRequests() {
    // Retrieves all loan requests from the canister
    try {
        return await loanCanister.getLoanRequests();
    } catch (err) {
        // Error handling similar to marketplace.js
        if (err.name === "AgentHTTPResponseError") {
            const authClient = window.auth.client;
            await authClient.logout();
        }
        return [];
    }
}

export async function acceptLoanRequest(loanRequestId) {
    // Accepts a loan request by its ID
    return loanCanister.acceptLoanRequest(loanRequestId);
}

export async function getLoans() {
    // Retrieves all active loans associated with the user
    return loanCanister.getLoans();
}

export async function makeLoanRepayment(loanId, repaymentAmount) {
    // Submits a repayment for a specific loan
    return loanCanister.makeRepayment(loanId, repaymentAmount);
}

export async function getLoanStatus(loanId) {
    // Retrieves the status of a specific loan
    return loanCanister.getLoanStatus(loanId);
}

export async function checkForLoanDefault() {
    // Checks for any defaulted loans
    return loanCanister.checkForDefault();
}

export async function modifyLoanTerms(loanId, newTerms) {
    // Updates the terms of an existing loan
    return loanCanister.modifyLoanTerms(loanId, newTerms);
}

export async function getUserLoanHistory(userPrincipal) {
    // Retrieves the loan history of a specific user
    return loanCanister.getUserLoanHistory(userPrincipal);
}

export async function accumulateInterest() {
    // Accumulates interest on active loans
    return loanCanister.accumulateInterest();
}

export async function automateLoanRepayment() {
    // Automates the repayment process for loans
    return loanCanister.automateLoanRepayment();
}

export async function requestLoanExtension(loanId, newDuration) {
    // Requests an extension on the loan duration
    return loanCanister.requestLoanExtension(loanId, newDuration);
}
