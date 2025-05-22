// frontend/src/pages/QuestionEditPage.jsx
import React, { useState, useEffect } from 'react';
import { Container, Form, Button } from 'react-bootstrap';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const QuestionEditPage = () => {
  const { id: questionId } = useParams();
  const navigate = useNavigate();
  const [questionText, setQuestionText] = useState('');
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [folderId, setFolderId] = useState(''); // 必要に応じて
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const fetchQuestionDetails = async () => {
      try {
        const authToken = localStorage.getItem('authToken');
        const response = await axios.get(`/api/questions/${questionId}`, { // バックエンドに質問詳細を取得するAPIが必要
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        const questionData = response.data;
        setQuestionText(questionData.question_text);
        setAnswer(questionData.answer);
        setExplanation(questionData.explanation || '');
        setFolderId(questionData.folder_id || ''); // 必要に応じて
        setLoading(false);
      } catch (error) {
        console.error('質問詳細の取得に失敗しました:', error);
        setError('質問詳細の取得に失敗しました。');
        setLoading(false);
      }
    };

    fetchQuestionDetails();
  }, [questionId]);

  const handleQuestionTextChange = (e) => setQuestionText(e.target.value);
  const handleAnswerChange = (e) => setAnswer(e.target.value);
  const handleExplanationChange = (e) => setExplanation(e.target.value);
  const handleFolderIdChange = (e) => setFolderId(e.target.value); // 必要に応じて

  const handleSaveQuestion = async () => {
    setSaveError('');
    try {
      const authToken = localStorage.getItem('authToken');
      await axios.put(`/api/questions/${questionId}`, { // バックエンドに質問を更新するAPIが必要
        question_text: questionText,
        answer: answer,
        explanation: explanation,
        folder_id: folderId, // 必要に応じて
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      console.log('質問を更新しました:', questionId);
      navigate(`/folders/${folderId}/edit`); // 保存後、フォルダ編集ページに戻るなどの処理
    } catch (error) {
      console.error('質問の更新に失敗しました:', error);
      setSaveError('質問の更新に失敗しました。');
    }
  };

  if (loading) {
    return <div>質問情報を読み込み中...</div>;
  }

  if (error) {
    return <div className="text-danger">{error}</div>;
  }

  return (
    <Container className="mt-5">
      <h1>質問編集</h1>
      {saveError && <div className="text-danger mb-3">{saveError}</div>}
      <Form>
        <Form.Group className="mb-3" controlId="formQuestionText">
          <Form.Label>質問内容</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={questionText}
            onChange={handleQuestionTextChange}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formAnswer">
          <Form.Label>回答</Form.Label>
          <Form.Control
            type="text"
            value={answer}
            onChange={handleAnswerChange}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formExplanation">
          <Form.Label>解説 (任意)</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={explanation}
            onChange={handleExplanationChange}
          />
        </Form.Group>

        {/* 必要に応じてフォルダIDの編集 */}
        {/* <Form.Group className="mb-3" controlId="formFolderId">
          <Form.Label>フォルダID</Form.Label>
          <Form.Control
            type="text"
            value={folderId}
            onChange={handleFolderIdChange}
          />
        </Form.Group> */}

        <Button variant="primary" onClick={handleSaveQuestion}>
          保存
        </Button>
        <Button variant="secondary" onClick={() => navigate(-1)} className="ms-2">
          キャンセル
        </Button>
      </Form>
    </Container>
  );
};

export default QuestionEditPage;
