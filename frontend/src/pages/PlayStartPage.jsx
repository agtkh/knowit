// frontend/src/pages/PlayStartPage.jsx
import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Card } from 'react-bootstrap';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const PlayStartPage = () => {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const [folderName, setFolderName] = useState('');
  const [questionCount, setQuestionCount] = useState(0);
  const [maxQuestionCount, setMaxQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 1. 出題モードを管理する state を追加
  const [playMode, setPlayMode] = useState('question-to-answer'); // 'question-to-answer' をデフォルトに設定

  useEffect(() => {
    const fetchFolderDetails = async () => {
      try {
        const authToken = localStorage.getItem('authToken');
        const folderResponse = await axios.get(`/api/folders/${folderId}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        setFolderName(folderResponse.data.folder_name);

        const questionsResponse = await axios.get(`/api/folders/${folderId}/questions/count`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        setMaxQuestionCount(questionsResponse.data.count);
        setQuestionCount(questionsResponse.data.count);
        setLoading(false);
      } catch (error) {
        console.error('フォルダ詳細または問題数の取得に失敗しました:', error);
        setError('フォルダ詳細または問題数の取得に失敗しました。');
        setLoading(false);
      }
    };

    fetchFolderDetails();
  }, [folderId]);

  const handleQuestionCountChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setQuestionCount(Math.max(1, Math.min(value, maxQuestionCount)));
  };

  // 2. スタート時の処理を修正
  const handleStartPlay = () => {
    // URLに選択されたモードの情報を追加して、Playページに渡す
    navigate(`/play/${folderId}?count=${questionCount}&mode=${playMode}`);
  };

  const handleCancelPlay = () => {
    navigate('/folders');
  };

  if (loading) {
    return <div>Play の準備をしています...</div>;
  }

  if (error) {
    return <div className="text-danger">{error}</div>;
  }

  return (
    <Container className="mt-5">
      <Card>
        <Card.Header>
          <h2>{folderName} の Play を開始</h2>
        </Card.Header>
        <Card.Body>
          <p>このフォルダには <strong>{maxQuestionCount}</strong> 件の質問があります。</p>
          <Form>
            {/* 3. 出題モードを選択するUIを追加 */}
            <Form.Group className="mb-3">
              <Form.Label>出題モード</Form.Label>
              <div>
                <Form.Check
                  inline
                  type="radio"
                  label="問題 → 解答"
                  name="playMode"
                  value="question-to-answer"
                  checked={playMode === 'question-to-answer'}
                  onChange={(e) => setPlayMode(e.target.value)}
                  id="mode-q-to-a"
                />
                <Form.Check
                  inline
                  type="radio"
                  label="解答 → 問題"
                  name="playMode"
                  value="answer-to-question"
                  checked={playMode === 'answer-to-question'}
                  onChange={(e) => setPlayMode(e.target.value)}
                  id="mode-a-to-q"
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>出題数</Form.Label>
              <Form.Control
                type="number"
                min="1"
                max={maxQuestionCount}
                value={questionCount}
                onChange={handleQuestionCountChange}
              />
              <Form.Text className="text-muted">
                1 から {maxQuestionCount} までの数値を入力してください。
              </Form.Text>
            </Form.Group>
            <Button variant="primary" onClick={handleStartPlay} disabled={maxQuestionCount === 0}>
              スタート
            </Button>
            <Button variant="secondary" onClick={handleCancelPlay} className="ms-2">
              キャンセル
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default PlayStartPage;