// frontend/src/components/QuestionFormModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Modal, Form, Button, Alert, Spinner, OverlayTrigger, Popover } from 'react-bootstrap';
import axios from 'axios';

const QuestionFormModal = ({ show, onHide, question, folderId, folderName, onSave }) => {
  const [questionText, setQuestionText] = useState('');
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [includeFolderName, setIncludeFolderName] = useState(true);

  const questionInputRef = useRef(null);

  const isEditMode = !!question;

  useEffect(() => {
    if (show) {
      if (isEditMode) {
        setQuestionText(question.question_text);
        setAnswer(question.answer);
        setExplanation(question.explanation || '');
      } else {
        // 新規追加モードの時はフォームをリセット
        setQuestionText('');
        setAnswer('');
        setExplanation('');
      }
      setError('');
      setIsSaving(false);
      setIsGenerating(false);
    }
  }, [show, question, isEditMode]);


  const handleGenerateQuestion = async () => {
    if (!answer.trim()) {
      setError('AIで生成するには、まず回答を入力してください。');
      return;
    }
    setIsGenerating(true);
    setError('');
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

    if (!questionText.trim() || !answer.trim()) {
      setError('質問と回答は必須です。');
      return;
    }

    setIsSaving(true);

    try {
      const authToken = localStorage.getItem('authToken');
      const payload = {
        question_text: questionText,
        answer: answer,
        explanation: explanation,
        folder_id: parseInt(folderId, 10),
      };

      if (isEditMode) {
        await axios.put(`/api/questions/${question.id}`, payload, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } else {
        await axios.post(`/api/folders/${folderId}/questions`, payload, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
      }
      
      onSave(); // 親コンポーネントのデータ更新をトリガー
      onHide(); // モーダルを閉じる

    } catch (err) {
      console.error('質問の保存に失敗しました:', err);
      const message = err.response?.data?.message || '質問の保存に失敗しました。';
      setError(message);
    } finally {
      setIsSaving(false);
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
    <Modal show={show} onHide={onHide} centered onEntered={() => questionInputRef.current?.focus()}>
      <Modal.Header closeButton>
        <Modal.Title>{isEditMode ? '質問を編集' : '質問を追加'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
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
                ) : ('🤖 AIで問題文と解説を生成')}
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
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          キャンセル
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? <><Spinner as="span" animation="border" size="sm" /> 保存中...</> : '保存'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default QuestionFormModal;
