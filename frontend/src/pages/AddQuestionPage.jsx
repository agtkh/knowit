import React, { useState } from 'react';
import { Container, Form, Button, Alert, Spinner } from 'react-bootstrap';
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
  const [isGenerating, setIsGenerating] = useState(false); // ★ AI生成中の状態

  // ★ AIで問題文と解説を生成する関数
  const handleGenerateQuestion = async () => {
    if (!answer.trim()) {
      setError('AIで生成するには、まず回答を入力してください。');
      return;
    }
    setIsGenerating(true);
    setError('');
    setSuccessMessage('');
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await axios.post('/api/gemini/generate-question', {
        answer: answer,
      }, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      // AIの応答をフォームにセット
      setQuestionText(response.data.question_text || '');
      setExplanation(response.data.explanation || '');

    } catch (err) {
      console.error('AIによる生成に失敗しました:', err);
      const message = err.response?.data?.error || 'AIによる生成に失敗しました。';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
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
      await axios.post(`/api/folders/${folderId}/questions`, {
        question_text: questionText,
        answer: answer,
        explanation: explanation,
        folder_id: folderId,
      }, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setSuccessMessage('質問を追加しました。');
      setTimeout(() => navigate(`/folders/${folderId}/edit`), 1500);
    } catch (err) {
      console.error('質問の追加に失敗しました:', err);
      const message = err.response?.data?.message || '質問の追加に失敗しました。';
      setError(message);
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
            onChange={(e) => setQuestionText(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formAnswer">
          {/* ★ ラベルとボタンを横並びにする */}
          <div className="d-flex justify-content-between align-items-center">
            <Form.Label className="mb-0">回答</Form.Label>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleGenerateQuestion}
              disabled={isGenerating || !answer.trim()}
            >
              {isGenerating ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                  <span className="ms-1">生成中...</span>
                </>
              ) : (
                '🤖 AIで問題文と解説を生成'
              )}
            </Button>
          </div>
          <Form.Control
            type="text"
            placeholder="回答を入力してください"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
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
            onChange={(e) => setExplanation(e.target.value)}
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