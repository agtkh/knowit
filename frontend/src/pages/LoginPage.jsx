// frontend/src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { Container, Form, Button } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const LoginPage = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const response = await axios.post('/api/auth/login', { username, password });
      console.log('ログイン成功:', response.data);
      const { token } = response.data;

      // ログイン成功時にトークンを localStorage に保存
      localStorage.setItem('authToken', token);

      // 親コンポーネントにトークンを渡す
      onLoginSuccess(token);

      navigate('/folders');
    } catch (error) {
      console.error('ログイン失敗:', error.response ? error.response.data : error.message);
      let errorMessage = 'ログインに失敗しました。ユーザー名またはパスワードが間違っている可能性があります。';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.message === 'Network Error') {
        errorMessage = 'ネットワークエラーが発生しました。サーバーに接続できません。';
      }
      setError(errorMessage);
    }
  };

  return (
    <Container className="mt-5">
      <h1>ログイン</h1>
      {error && <p className="text-danger">{error}</p>}
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="formBasicUsername">
          <Form.Label>ユーザー名</Form.Label>
          <Form.Control
            type="text"
            placeholder="ユーザー名を入力"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete='username'
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formBasicPassword">
          <Form.Label>パスワード</Form.Label>
          <Form.Control
            type="password"
            placeholder="パスワードを入力"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete='current-password'
          />
        </Form.Group>
        <Button variant="primary" type="submit">
          ログイン
        </Button>
      </Form>
      <p className="mt-3">
        アカウントをお持ちでないですか？ <a href="/register">こちらから登録</a>
      </p>
    </Container>
  );
};

export default LoginPage;