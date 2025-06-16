import React, { useState, useEffect, useRef } from 'react';
import { Container, Form, Button, Alert, Spinner, OverlayTrigger, Popover } from 'react-bootstrap';
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [includeFolderName, setIncludeFolderName] = useState(true);

  const questionInputRef = useRef(null);

  useEffect(() => {
    const fetchFolderName = async () => {
      try {
        const authToken = localStorage.getItem('authToken');
        const response = await axios.get(`/api/folders/${folderId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        setFolderName(response.data.folder_name);
      } catch (err) {
        console.error("フォルダ名の取得に失敗しました:", err);
      }
    };
    fetchFolderName();
  }, [folderId]);


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
        folderName: folderName,
        includeFolderName: includeFolderName,
      }, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

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
      // ===== ★ ここを修正します =====
      await axios.post(`/api/folders/${folderId}/questions`, {
        question_text: questionText,
        answer: answer,
        explanation: explanation,
        folder_id: parseInt(folderId, 10), // この行を戻しました
      }, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      
      setSuccessMessage('質問を追加しました。次の質問をどうぞ！');
      
      setQuestionText('');
      setAnswer('');
      setExplanation('');
      setIncludeFolderName(true);

      questionInputRef.current?.focus();
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 2500);

    } catch (err) {
      console.error('質問の追加に失敗しました:', err);
      const message = err.response?.data?.message || '質問の追加に失敗しました。';
      setError(message);
    }
  };

  const folderNamePopover = (
    <Popover id="popover-basic">
      <Popover.Header as="h3">テーマを考慮した生成</Popover.Header>
      <Popover.Body>
        このスイッチをONにすると、現在のフォルダ名「<strong>{folderName}</strong>」をテーマとしてAIに伝え、より関連性の高い問題文を生成しようと試みます。
      </Popover.Body>
    </Popover>
  );

  return (
    <Container className="mt-5">
      <h1>質問を追加</h1>
      <p>現在のフォルダ: <strong>{folderName}</strong></p>
      <Link to={`/folders/${folderId}/edit`} className="mb-3 btn btn-secondary">
        フォルダに戻る
      </Link>
      {error && <Alert variant="danger">{error}</Alert>}
      {successMessage && <Alert variant="success">{successMessage}</Alert>}
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="formQuestionText">
          <Form.Label>質問</Form.Label>
          <Form.Control
            ref={questionInputRef}
            as="textarea"
            rows={3}
            placeholder="質問を入力してください"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formAnswer">
          <div className="d-flex justify-content-between align-items-center">
            <Form.Label className="mb-0">回答</Form.Label>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleGenerateQuestion}
              disabled={isGenerating || !answer.trim()}
            >
              {isGenerating ? (
                <><Spinner as="span" animation="border" size="sm" /> 生成中...</>
              ) : ( '🤖 AIで問題文と解説を生成' )}
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
        
        <Form.Group className="mb-3" controlId="formIncludeFolderName">
          <Form.Check 
            type="switch"
            id="include-folder-name-switch"
            label="フォルダ名をテーマとしてAIに伝える"
            checked={includeFolderName}
            onChange={(e) => setIncludeFolderName(e.target.checked)}
          />
          <OverlayTrigger trigger={['hover', 'focus']} placement="right" overlay={folderNamePopover}>
            <Button variant="link" className="p-0 ms-2" style={{ textDecoration: 'none' }}>
              (?)
            </Button>
          </OverlayTrigger>
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