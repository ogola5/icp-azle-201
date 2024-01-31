import React, { useEffect, useCallback, useState } from 'react';
import { Container, Nav } from 'react-bootstrap';
import { BrowserRouter as Router, Route, Routes, Redirect } from 'react-router-dom';
import Products from './components/marketplace/Products';
import Wallet from './components/Wallet';
import Cover from './components/utils/Cover';
import Notification from './components/utils/Notifications';

// Importing new loan components
import LoanRequestForm from './components/loans/LoanRequestForm';
import LoanRequests from './components/loans/LoanRequests';
import ActiveLoans from './components/loans/ActiveLoans';
import LoanRepaymentForm from './components/loans/LoanRepaymentForm';
import LoanHistory from './components/loans/LoanHistory';
import LoanSummary from './components/loans/LoanSummary';
import LoanModificationForm from './components/loans/LoanModificationForm';
import LoanDefaultCheck from './components/loans/LoanDefaultCheck';

import './App.css';
import coverImg from './assets/img/sandwich.jpg';
import { login, logout as destroy } from './utils/auth';
import { balance as principalBalance } from './utils/ledger';

const App = () => {
  const isAuthenticated = window.auth.isAuthenticated;
  const principal = window.auth.principalText;
  const [balance, setBalance] = useState("0");

  const getBalance = useCallback(async () => {
    if (isAuthenticated) {
      setBalance(await principalBalance());
    }
  }, [isAuthenticated]);

  useEffect(() => {
    getBalance();
  }, [getBalance]);

  return (
    <Router>
      <Notification />
      {isAuthenticated ? (
        <Container fluid="md">
          <Nav className="justify-content-end pt-3 pb-5">
            <Nav.Item>
              <Wallet
                principal={principal}
                balance={balance}
                symbol={"ICP"}
                isAuthenticated={isAuthenticated}
                destroy={destroy}
              />
            </Nav.Item>
          </Nav>
          <Routes>
            <Route path="/loan-requests" component={LoanRequests} />
            <Route path="/active-loans" component={ActiveLoans} />
            <Route path="/create-loan-request" component={LoanRequestForm} />
            <Route path="/repay-loan" component={LoanRepaymentForm} />
            <Route path="/loan-history" component={LoanHistory} />
            <Route path="/loan-summary" component={LoanSummary} />
            <Route path="/modify-loan" component={LoanModificationForm} />
            <Route path="/check-defaults" component={LoanDefaultCheck} />
            <Route path="/" exact component={Products} />
            <Redirect to="/" />
          </Routes>
        </Container>
      ) : (
        <Cover name="Street Food" login={login} coverImg={coverImg} />
      )}
    </Router>
  );
};

export default App;
