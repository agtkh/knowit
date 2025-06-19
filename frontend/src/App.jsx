// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Container, Navbar, Nav, NavDropdown } from 'react-bootstrap';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import FolderListPage from './pages/FolderListPage';
import FolderEditPage from './pages/FolderEditPage';
import PlayStartPage from './pages/PlayStartPage';
import PlayPage from './pages/PlayPage'; 
import PlayResultPage from './pages/PlayResultPage';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsLoggedIn(false);
  };

  const handleLoginSuccess = (token) => {
    localStorage.setItem('authToken', token);
    setIsLoggedIn(true);
  };

  const currentYear = new Date().getFullYear();

  return (
    <Router>
      <Navbar bg="light" expand="lg" className="mb-3">
        <Container>
          <Navbar.Brand as={Link} to="/">KnowIt</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/">ホーム</Nav.Link>
              {isLoggedIn ? (
                <>
                  <Nav.Link as={Link} to="/folders">フォルダ</Nav.Link>
                  <NavDropdown title="アカウント" id="account-dropdown" align="end">
                    <NavDropdown.Item as="button" className="text-danger p-0" onClick={handleLogout}>
                      ログアウト
                    </NavDropdown.Item>
                  </NavDropdown>
                </>
              ) : (
                <>
                  <Nav.Link as={Link} to="/login">ログイン</Nav.Link>
                  <Nav.Link as={Link} to="/register">登録</Nav.Link>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container className="mb-5">
        <Routes>
          <Route path="/" element={isLoggedIn ? <HomePage /> : <LoginPage onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/folders" element={isLoggedIn ? <FolderListPage /> : <LoginPage onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/folders/:id/edit" element={isLoggedIn ? <FolderEditPage /> : <LoginPage onLoginSuccess={handleLoginSuccess} />} />
          {isLoggedIn && (
            <>
              <Route path="/play/start/:folderId" element={<PlayStartPage />} />
              <Route path="/play/:folderId" element={<PlayPage />} />
              <Route path="/play/result" element={<PlayResultPage />} />
            </>
          )}
        </Routes>
      </Container>

      <footer className="bg-light py-3 mt-auto">
        <Container className="text-center">
          <p>&copy; {(currentYear == 2025) ? 2025 : "2025 - " + currentYear} KnowIt - Kohei Agata</p>
          <div className="mt-2">
            {/* <a href="https://twitter.com/your_twitter" target="_blank" rel="noopener noreferrer" className="me-2">Twitter</a> */}
            <a href="https://github.com/agtkh" target="_blank" rel="noopener noreferrer" className="me-2">GitHub</a>
            {/* <p className="mt-2">お問い合わせ: kohei</p> */}
          </div>
        </Container>
      </footer>
    </Router>
  );
};

export default App;