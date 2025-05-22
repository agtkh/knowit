// frontend/src/pages/AddQuestionPage.jsx
import React, { useState } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';

const AddQuestionPage = () => {
  const { id: folderId } = useParams();
  const navigate = useNavigate();
  const [questionText, setQuestionText] = useState('');
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleQuestionTextChange = (e) => {
    setQuestionText(e.target.value);
  };

  const handleAnswerChange = (e) => {
    setAnswer(e.target.value);
  };

  const handleExplanationChange = (e) => {
    setExplanation(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!questionText.trim() || !answer.trim()) {
      setError('質問と回答は必須です。');
      return;
    }

    try {
      const authToken = localStorage.getItem('authToken');
      const response = await axios.post(`/api/folders/${folderId}/questions`, {
        question_text: questionText,
        answer: answer,
        explanation: explanation,
        folder_id: folderId,
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      });
      console.log('質問を追加しました:', response.data);
      setSuccessMessage('質問を追加しました。');
      // 追加成功後、フォルダ編集ページに戻る
      setTimeout(() => {
        navigate(`/folders/${folderId}/edit`);
      }, 1500);
    } catch (error) {
      console.error('質問の追加に失敗しました:', error);
      if (error.response && error.response.data && error.response.data.message) {
        setError(error.response.data.message);
      } else {
        setError('質問の追加に失敗しました。');
      }
    }
  };

  return (
    <Container className="mt-5">
      <h1>質問を追加</h1>
      <Link to={`/folders/${folderId}/edit`} className="mb-3 btn btn-secondary">
        フォルダに戻る
      </Link>
      {error && <Alert variant="danger">{error}</Alert>}
      {successMessage && <Alert variant="success">{successMessage}</Alert>}
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="formQuestionText">
          <Form.Label>質問</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="質問を入力してください"
            value={questionText}
            onChange={handleQuestionTextChange}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formAnswer">
          <Form.Label>回答</Form.Label>
          <Form.Control
            type="text"
            placeholder="回答を入力してください"
            value={answer}
            onChange={handleAnswerChange}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formExplanation">
          <Form.Label>解説 (任意)</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="解説を入力してください"
            value={explanation}
            onChange={handleExplanationChange}
          />
        </Form.Group>

        <Button variant="primary" type="submit">
          追加
        </Button>
      </Form>
    </Container>
  );
};

export default AddQuestionPage;
