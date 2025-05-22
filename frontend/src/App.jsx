// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Container, Navbar, Nav, Button } from 'react-bootstrap';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import FolderListPage from './pages/FolderListPage';
import FolderEditPage from './pages/FolderEditPage';
import AddQuestionPage from './pages/AddQuestionPage'; // AddQuestionPage をインポート
import QuestionEditPage from './pages/QuestionEditPage'; // QuestionEditPage をインポート
import PlayStartPage from './pages/PlayStartPage';
import PlayPage from './pages/PlayPage'; 
import PlayResultPage from './pages/PlayResultPage'; // PlayResultPage をインポート

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
                  <Button variant="outline-danger" onClick={handleLogout} className="ms-2">ログアウト</Button>
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
          <Route path="/folders/:id/add-question" element={isLoggedIn ? <AddQuestionPage /> : <LoginPage onLoginSuccess={handleLoginSuccess} />} /> {/* 質問追加ページのルーティング */}
          <Route path="/play/start/:folderId" element={<PlayStartPage />} /> {/* パスとコンポーネント名を更新 */}
          <Route path="/play/:folderId" element={<PlayPage />} /> {/* パスとコンポーネント名を更新 */}
          <Route path="/play/result" element={<PlayResultPage />} /> {/* パスとコンポーネント名を更新 */}
          {isLoggedIn && (
            <>
              <Route path="/questions/:id/edit" element={<QuestionEditPage />} />
            </>
          )}
        </Routes>
      </Container>

      <footer className="bg-light py-3 mt-auto">
        <Container className="text-center">
          <p>&copy; 2025 KnowIt - 開発: Your Name</p>
          <div className="mt-2">
            <a href="https://twitter.com/your_twitter" target="_blank" rel="noopener noreferrer" className="me-2">Twitter</a>
            <a href="https://github.com/your_github" target="_blank" rel="noopener noreferrer" className="me-2">GitHub</a>
            <p className="mt-2">お問い合わせ: your_email@example.com</p>
          </div>
        </Container>
      </footer>
    </Router>
  );
};

export default App;