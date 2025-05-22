// frontend/src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { Container, Form, Button } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // ページ遷移に必要

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate(); // ページ遷移のためのフック

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }
    try {
      const response = await axios.post('/api/auth/register', { username, password }); // name を送信しない
      console.log('登録成功:', response.data);
      setSuccessMessage('登録が完了しました。ログインできます。');
      // 登録成功後、ログインページへリダイレクトする例
      setTimeout(() => {
        navigate('/login');
      }, 1500); // 1.5秒後にリダイレクト
    } catch (error) {
      console.error('登録失敗:', error.response ? error.response.data : error.message);
      if (error.response && error.response.data && error.response.data.message) {
        setError(error.response.data.message);
      } else if (error.message === 'Network Error') {
        setError('ネットワークエラーが発生しました。サーバーに接続できません。');
      } else {
        setError('登録に失敗しました。入力内容をご確認ください。');
      }
    }
  };

  return (
    <Container className="mt-5">
      <h1>登録</h1>
      {error && <p className="text-danger">{error}</p>}
      {successMessage && <p className="text-success">{successMessage}</p>}
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="formBasicUsername">
          <Form.Label>ユーザー名</Form.Label>
          <Form.Control
            type="text"
            placeholder="ユーザー名を入力"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
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
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formBasicConfirmPassword">
          <Form.Label>パスワードを再入力</Form.Label>
          <Form.Control
            type="password"
            placeholder="パスワードを再入力"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </Form.Group>
        <Button variant="primary" type="submit">
          登録
        </Button>
      </Form>
      <p className="mt-3">
        すでにアカウントをお持ちですか？ <a href="/login">こちらからログイン</a>
      </p>
    </Container>
  );
};

export default RegisterPage;